/**
 * pipeline.ts — X AI Viral Content Analyzer & Reverse-Engineering Studio
 *
 * COST GUARDRAIL: Uses GEMINI_API_KEY only for multimodal analysis and prompt generation.
 * Zero Anthropic / Kie AI API costs.
 * Generates ready-to-use Claude Writing Prompt + Image Prompts directly for the operator.
 */

import { scrapeTweets } from "./apify";
import { uploadImage, analyzePost, generateStudioAssets } from "./gemini";
import { readCreators, readConfigs, appendPosts } from "./csv";
import { ApifyTweetResult, Post, PipelineProgress } from "./types";
import crypto from "crypto";

/** Hard cap — protects the $5/mo Apify credit */
const MAX_TWEETS_PER_CREATOR = 5;

interface PipelineOptions {
  configName: string;
  maxPosts: number;
  topK: number;
  daysLookback: number;
  creatorUsername?: string;
}

type ProgressCallback = (progress: PipelineProgress) => void;

const ANALYSIS_CONCURRENCY = 3;
const GENERATION_CONCURRENCY = 2;

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(1) + " KB";
  return bytes + " B";
}

function elapsed(start: number): string {
  const s = ((Date.now() - start) / 1000).toFixed(1);
  return `${s}s`;
}

function getMediaType(tweet: ApifyTweetResult): Post["mediaType"] {
  if (!tweet.media || tweet.media.length === 0) return "none";
  if (tweet.media.length > 1 && tweet.media.every((m) => m.type === "photo"))
    return "multi-image";
  const first = tweet.media[0];
  if (first.type === "video") return "video";
  if (first.type === "animated_gif") return "gif";
  return "image";
}

function hasVideo(tweet: ApifyTweetResult): boolean {
  if (!tweet.media) return false;
  return tweet.media.some((m) => m.type === "video" || m.type === "animated_gif");
}

function getMimeType(url: string): string {
  if (url.includes(".png")) return "image/png";
  if (url.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        results[idx] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function runPipeline(
  options: PipelineOptions,
  onProgress: ProgressCallback
) {
  const pipelineStart = Date.now();

  const configs = readConfigs();
  const config = configs.find((c) => c.configName === options.configName);
  if (!config) throw new Error(`Config "${options.configName}" not found`);

  const allCreators = readCreators();
  let creators = allCreators.filter(
    (c) => (config.creatorsCategory === "all" || c.category === config.creatorsCategory) && c.active !== false
  );
  if (options.creatorUsername && options.creatorUsername !== "all") {
    const single = creators.find(
      (c) => c.username.toLowerCase() === options.creatorUsername?.toLowerCase()
    );
    if (!single) {
      throw new Error(`Creator @${options.creatorUsername} not found or inactive in "${config.creatorsCategory}"`);
    }
    creators = [single];
  }
  if (creators.length === 0) {
    throw new Error(`No active creators found matching tag "${config.creatorsCategory}"`);
  }

  const progress: PipelineProgress = {
    phase: "scraping",
    creatorsProcessed: 0,
    creatorsTotal: creators.length,
    postsProcessed: 0,
    postsTotal: 0,
    activeTasks: [],
    errors: [],
    log: [],
  };

  const log = (msg: string) => {
    progress.log.push(msg);
    onProgress({ ...progress, log: [...progress.log] });
  };

  // ── Phase 1: Scraping (streaming per creator) ──
  const effectiveMax = Math.min(options.maxPosts, MAX_TWEETS_PER_CREATOR);
  const scraperName = process.env.TWITTERAPI_IO_KEY
    ? "TwitterAPI.io (fast tier with Apify fallback)"
    : "Apify Scraper Lite";

  log(`── PHASE 1: SCRAPING ──`);
  log(`Config: ${config.configName} | Category: ${config.creatorsCategory}`);
  log(`Engine: ${scraperName} | Cap: ${MAX_TWEETS_PER_CREATOR} tweets/creator`);
  log(`Settings: ${effectiveMax} max posts, top ${options.topK}, last ${options.daysLookback} days`);
  log(`Target Creators (${creators.length}): ${creators.map((c) => "@" + c.username).join(", ")}`);
  log(``);

  const scrapeStart = Date.now();
  const allScrapedTweets: { creator: string; tweets: ApifyTweetResult[] }[] = [];

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];
    progress.activeTasks = [creator.username];
    log(`[${i + 1}/${creators.length}] Scraping @${creator.username}...`);
    onProgress({ ...progress });

    try {
      const tweets = await scrapeTweets(
        creator.username,
        effectiveMax,
        options.daysLookback
      );
      const textAndImageTweets = tweets.filter((t) => !hasVideo(t));
      const topTweets = textAndImageTweets.slice(
        0,
        Math.min(options.topK, MAX_TWEETS_PER_CREATOR)
      );
      allScrapedTweets.push({ creator: creator.username, tweets: topTweets });

      if (topTweets.length > 0) {
        log(`✓ @${creator.username}: ${textAndImageTweets.length} text/image posts found, selected top ${topTweets.length}`);
      } else {
        log(`- @${creator.username}: No text/image posts found in lookback window`);
      }
    } catch (err: any) {
      const msg = `✗ Error scraping @${creator.username}: ${err?.message || err}`;
      progress.errors.push(msg);
      log(msg);
    }

    progress.creatorsProcessed++;
    onProgress({ ...progress });
  }

  progress.activeTasks = [];
  const totalScraped = allScrapedTweets.reduce((n, s) => n + s.tweets.length, 0);
  log(``);
  log(`Scraping complete: ${totalScraped} posts from ${creators.length} creators [${elapsed(scrapeStart)}]`);
  onProgress({ ...progress });

  if (totalScraped === 0) {
    progress.phase = "done";
    log(`No posts to analyze. Pipeline finished.`);
    onProgress({ ...progress });
    return;
  }

  // ── Phase 2: Reverse-Engineering & Direct Save to Posts Studio ──
  log(``);
  log(`── PHASE 2: REVERSE-ENGINEERING & INSTANT SAVE TO POSTS STUDIO ──`);
  const postsToProcess = allScrapedTweets.flatMap((s) =>
    s.tweets.map((t) => ({ creator: s.creator, tweet: t }))
  );
  progress.phase = "analyzing";
  progress.postsTotal = postsToProcess.length;
  progress.postsProcessed = 0;
  log(`Processing ${postsToProcess.length} posts sequentially with instant save to Posts Studio (pacing: 3.5s)...`);
  log(``);
  onProgress({ ...progress });

  let savedCount = 0;

  for (let i = 0; i < postsToProcess.length; i++) {
    const { creator, tweet } = postsToProcess[i];
    const num = i + 1;
    const label = `@${creator}`;
    const prefix = `[${num}/${postsToProcess.length}] ${label}`;
    progress.activeTasks = [`${label}`];
    onProgress({ ...progress });

    const postStart = Date.now();
    const mediaType = getMediaType(tweet);

    try {
      const mediaFiles: Array<{ uri: string; mimeType: string }> = [];
      const mediaUrls: string[] = [];

      if (tweet.media && tweet.media.length > 0) {
        for (const media of tweet.media) {
          if (media.type !== "photo") continue;
          const downloadUrl = media.url;
          if (!downloadUrl) continue;
          mediaUrls.push(media.previewUrl || media.url);

          log(`${prefix} Downloading visual...`);
          const mediaRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) });
          if (!mediaRes.ok) {
            log(`${prefix} Download failed (${mediaRes.status}), skipping image`);
            continue;
          }
          const buffer = Buffer.from(await mediaRes.arrayBuffer());
          if (buffer.length < 500) continue;

          const mime = getMimeType(downloadUrl);
          const uploaded = await uploadImage(buffer, `${creator}-${tweet.id}`, mime);
          mediaFiles.push(uploaded);
          log(`${prefix} Visual uploaded to Gemini`);
        }
      }

      log(`${prefix} Analyzing mechanics with Gemini...`);
      const analysis = await analyzePost({
        text: tweet.text,
        prompt: config.analysisInstruction,
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
      });

      log(`${prefix} Building Claude Pro master prompt packet...`);
      const assets = await generateStudioAssets({
        postText: tweet.text,
        analysis,
        generationPrompt: config.newConceptsInstruction,
      });

      const postId = crypto.randomUUID();
      const post: Post = {
        id: postId,
        link: tweet.url,
        creator,
        text: tweet.text,
        mediaType,
        mediaUrls: JSON.stringify(mediaUrls),
        views: tweet.viewCount,
        likes: tweet.likeCount,
        replies: tweet.replyCount,
        retweets: tweet.retweetCount,
        quotes: tweet.quoteCount,
        bookmarks: tweet.bookmarkCount,
        analysis,
        generatedPostText: assets.claudePromptPacket,
        generatedImagePrompt: assets.chatgptImagePrompt,
        generatedImageUrl: "",
        infographicStyle: assets.visualArchetype,
        datePosted: tweet.createdAt,
        dateAdded: new Date().toISOString(),
        configName: config.configName,
        starred: false,
        hookFormula: assets.hookFormula,
        whyItWorked: assets.whyItWorked,
        visualArchetype: assets.visualArchetype,
        redditAeoAdaptation: assets.redditAeoAdaptation,
        personalizeQuestion: assets.personalizeQuestion,
        claudePromptPacket: assets.claudePromptPacket,
        chatgptImagePrompt: assets.chatgptImagePrompt,
      };

      // IMMEDIATELY SAVE TO DISK & POSTS STUDIO
      appendPosts([post]);
      savedCount++;
      log(`✓ ${prefix}: Saved to Posts Studio! (1-click Claude prompt ready) [${elapsed(postStart)}]`);
    } catch (err) {
      const msg = `✗ ${prefix} FAILED: ${err instanceof Error ? err.message : err}`;
      progress.errors.push(msg);
      log(msg);
    }

    progress.postsProcessed++;
    progress.activeTasks = [];
    onProgress({ ...progress });

    // Pacing breather between posts to safely stay well under Google's 15 RPM rate limit
    if (i < postsToProcess.length - 1) {
      await new Promise((r) => setTimeout(r, 3500));
    }
  }

  log(``);
  log(`── PIPELINE COMPLETE ──`);
  log(`Total time: ${elapsed(pipelineStart)}`);
  log(`Posts Scraped: ${totalScraped} | Saved to Posts Studio: ${savedCount}/${postsToProcess.length}`);
  if (progress.errors.length > 0) {
    log(`Errors encountered: ${progress.errors.length}`);
  }

  progress.phase = "done";
  progress.activeTasks = [];
  onProgress({ ...progress });
}
