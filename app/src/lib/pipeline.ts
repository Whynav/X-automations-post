import { scrapeTweets } from "./apify";
import { uploadImage, analyzePost } from "./gemini";
import { classifyPosts, computeSplit, generatePost } from "./claude";
import { generateInfographic } from "./kie";
import { INFOGRAPHIC_STYLES } from "./brand-style";
import { readCreators, readConfigs, appendPosts } from "./csv";
import { ApifyTweetResult, Post, PipelineProgress } from "./types";
import crypto from "crypto";
import fs from "fs";
import path from "path";

function pickRandomPersonalImage(): string {
  const refDir = path.join(process.cwd(), "..", "references");
  const files = fs.readdirSync(refDir).filter((f) => f.startsWith("personal "));
  if (files.length === 0) throw new Error("No personal reference images found");
  return path.join(refDir, files[Math.floor(Math.random() * files.length)]);
}

function copyPersonalImage(postId: string): string {
  const srcPath = pickRandomPersonalImage();
  const ext = path.extname(srcPath).toLowerCase().replace(".", "") || "jpg";
  const destDir = path.join(process.cwd(), "..", "data", "generated-images");
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destFile = `${postId}.${ext}`;
  fs.copyFileSync(srcPath, path.join(destDir, destFile));
  return `data/generated-images/${destFile}`;
}

interface PipelineOptions {
  configName: string;
  maxPosts: number;
  topK: number;
  daysLookback: number;
}

type ProgressCallback = (progress: PipelineProgress) => void;

const ANALYSIS_CONCURRENCY = 3;
const GENERATION_CONCURRENCY = 3;

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(1) + " KB";
  return bytes + " B";
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
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
  const creators = allCreators.filter(
    (c) => c.category === config.creatorsCategory
  );
  if (creators.length === 0) {
    throw new Error(`No creators in category "${config.creatorsCategory}"`);
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

  // ── Phase 1: Scraping (parallel) ──
  log(`── PHASE 1: SCRAPING ──`);
  log(`Config: ${config.configName} | Category: ${config.creatorsCategory}`);
  log(`Settings: ${options.maxPosts} max posts, top ${options.topK}, last ${options.daysLookback} days`);
  log(`Found ${creators.length} creators: ${creators.map((c) => "@" + c.username).join(", ")}`);
  log(`Scraping all ${creators.length} creators in parallel...`);
  log(``);

  progress.activeTasks = creators.map((c) => c.username);
  onProgress({ ...progress });

  const scrapeStart = Date.now();
  const scrapeResults = await Promise.allSettled(
    creators.map(async (creator) => {
      const tweets = await scrapeTweets(
        creator.username,
        options.maxPosts,
        options.daysLookback
      );
      // Filter out video/gif posts
      const textAndImageTweets = tweets.filter((t) => !hasVideo(t));
      const topTweets = textAndImageTweets.slice(0, options.topK);
      return { creator: creator.username, tweets: topTweets, totalFound: textAndImageTweets.length };
    })
  );

  const allScrapedTweets: { creator: string; tweets: ApifyTweetResult[] }[] = [];
  for (let i = 0; i < scrapeResults.length; i++) {
    const result = scrapeResults[i];
    const creator = creators[i];
    progress.creatorsProcessed++;

    if (result.status === "fulfilled") {
      const { tweets, totalFound } = result.value;
      allScrapedTweets.push({ creator: creator.username, tweets });
      if (tweets.length > 0) {
        const topViews = tweets.map((t) => formatCount(t.viewCount)).join(", ");
        log(`@${creator.username}: ${totalFound} text/image posts, selected top ${tweets.length} (${topViews} views)`);
      } else {
        log(`@${creator.username}: No text/image posts found`);
      }
    } else {
      const msg = `Error scraping @${creator.username}: ${result.reason}`;
      progress.errors.push(msg);
      log(msg);
    }
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

  // ── Phase 2: Analysis (parallel, 3 concurrent) ──
  log(``);
  log(`── PHASE 2: ANALYZE ──`);
  const postsToAnalyze = allScrapedTweets.flatMap((s) =>
    s.tweets.map((t) => ({ creator: s.creator, tweet: t }))
  );
  progress.phase = "analyzing";
  progress.postsTotal = postsToAnalyze.length;
  log(`Processing ${postsToAnalyze.length} posts (${ANALYSIS_CONCURRENCY} concurrent)`);
  log(``);
  onProgress({ ...progress });

  interface AnalyzedItem {
    creator: string;
    tweet: ApifyTweetResult;
    analysis: string;
    mediaType: Post["mediaType"];
    mediaUrls: string[];
  }

  const analyzedItems: AnalyzedItem[] = [];

  await runConcurrent(postsToAnalyze, ANALYSIS_CONCURRENCY, async ({ creator, tweet }, idx) => {
    const num = idx + 1;
    const label = `@${creator}`;
    const prefix = `[${num}/${postsToAnalyze.length}] ${label}`;
    progress.activeTasks = [...progress.activeTasks, `${label}`];
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

          log(`${prefix} Downloading image...`);
          const mediaRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) });
          if (!mediaRes.ok) {
            log(`${prefix} Download failed (${mediaRes.status}), skipping`);
            continue;
          }
          const buffer = Buffer.from(await mediaRes.arrayBuffer());
          if (buffer.length < 500) continue;
          log(`${prefix} Downloaded ${formatBytes(buffer.length)}`);

          const mime = getMimeType(downloadUrl);
          const uploaded = await uploadImage(buffer, `${creator}-${tweet.id}`, mime);
          mediaFiles.push(uploaded);
          log(`${prefix} Uploaded to Gemini`);
        }
      }

      const analyzeStart = Date.now();
      log(`${prefix} Analyzing...`);
      const analysis = await analyzePost({
        text: tweet.text,
        prompt: config.analysisInstruction,
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
      });
      log(`${prefix} Done (${(analysis.length / 1000).toFixed(1)}K chars) [${elapsed(postStart)}]`);

      analyzedItems.push({ creator, tweet, analysis, mediaType, mediaUrls });
    } catch (err) {
      const msg = `${prefix} FAILED — ${err instanceof Error ? err.message : err}`;
      progress.errors.push(msg);
      log(msg);
    }

    progress.postsProcessed++;
    progress.activeTasks = progress.activeTasks.filter((t) => t !== `${label}`);
    onProgress({ ...progress });
    return null;
  });

  if (analyzedItems.length === 0) {
    progress.phase = "done";
    progress.activeTasks = [];
    log(`No posts were successfully analyzed. Pipeline finished.`);
    onProgress({ ...progress });
    return;
  }

  // ── Phase 3: Generation (parallel, 3 concurrent) ──
  log(``);
  log(`── PHASE 3: GENERATE CONTENT ──`);
  progress.phase = "generating";
  progress.postsProcessed = 0;
  progress.postsTotal = analyzedItems.length;
  onProgress({ ...progress });

  // Classification sub-step
  const split = computeSplit(analyzedItems.length);
  log(`Classifying ${analyzedItems.length} posts (target: ${split.numInfographic} infographic, ${split.numPersonal} personal, ${split.numTextOnly} text-only)...`);

  type ClassificationEntry = { postIndex: number; style: string; reasoning: string };
  let classificationMap = new Map<number, ClassificationEntry>();
  try {
    const classifications = await classifyPosts(
      analyzedItems.map((item, i) => ({
        index: i,
        text: item.tweet.text,
        analysis: item.analysis.slice(0, 500),
      })),
      split
    );
    classificationMap = new Map(classifications.map((c) => [c.postIndex, c]));
    const infographicCount = classifications.filter((c) => c.style !== "text-only" && c.style !== "personal").length;
    const personalCount = classifications.filter((c) => c.style === "personal").length;
    const textOnlyCount = classifications.filter((c) => c.style === "text-only").length;
    log(`Classification done: ${infographicCount} infographic + ${personalCount} personal + ${textOnlyCount} text-only`);
    for (const c of classifications) {
      const styleLabel = c.style === "text-only" ? "TEXT-ONLY" : c.style === "personal" ? "PERSONAL" : c.style;
      log(`  Post ${c.postIndex}: ${styleLabel}`);
    }
  } catch (classErr) {
    log(`Classification failed: ${classErr instanceof Error ? classErr.message : classErr}`);
    log(`Falling back to all-infographic mode`);
  }

  log(``);
  log(`Generating content for ${analyzedItems.length} posts (${GENERATION_CONCURRENCY} concurrent)`);
  log(``);
  onProgress({ ...progress });

  const completedPosts: Post[] = [];

  await runConcurrent(analyzedItems, GENERATION_CONCURRENCY, async (item, idx) => {
    const num = idx + 1;
    const label = `@${item.creator}`;
    const prefix = `[${num}/${analyzedItems.length}] ${label}`;
    progress.activeTasks = [...progress.activeTasks, `${label}`];
    onProgress({ ...progress });

    const genStart = Date.now();
    const classification = classificationMap.get(idx);
    const isTextOnly = classification?.style === "text-only";
    const isPersonal = classification?.style === "personal";
    const isInfographic = !isTextOnly && !isPersonal;
    const styleDesc = isInfographic && classification
      ? INFOGRAPHIC_STYLES[classification.style]?.description
      : undefined;

    try {
      const modeLabel = isTextOnly ? " (text-only)" : isPersonal ? " (personal)" : classification ? ` (${classification.style})` : "";
      log(`${prefix} Generating with Claude${modeLabel}...`);
      const generated = await generatePost(
        item.tweet.text,
        item.analysis,
        config.newConceptsInstruction,
        {
          textOnly: isTextOnly,
          personal: isPersonal,
          styleDescription: styleDesc,
          username: "@olegrows",
        }
      );
      log(`${prefix} Post text ready (${generated.postText.length} chars)`);

      const postId = crypto.randomUUID();
      let generatedImageUrl = "";

      if (isInfographic) {
        log(`${prefix} Generating infographic...`);
        try {
          const imagePath = await generateInfographic(generated.imagePrompt, postId);
          generatedImageUrl = imagePath;
          log(`${prefix} Infographic ready (${classification?.style})`);
        } catch (kieErr) {
          log(`${prefix} Kie AI failed: ${kieErr instanceof Error ? kieErr.message : kieErr}`);
        }
      } else if (isPersonal) {
        try {
          generatedImageUrl = copyPersonalImage(postId);
          log(`${prefix} Personal photo attached`);
        } catch (imgErr) {
          log(`${prefix} Personal image copy failed: ${imgErr instanceof Error ? imgErr.message : imgErr}`);
        }
      } else {
        log(`${prefix} Text-only post (no image)`);
      }

      const post: Post = {
        id: postId,
        link: item.tweet.url,
        creator: item.creator,
        text: item.tweet.text,
        mediaType: item.mediaType,
        mediaUrls: JSON.stringify(item.mediaUrls),
        views: item.tweet.viewCount,
        likes: item.tweet.likeCount,
        replies: item.tweet.replyCount,
        retweets: item.tweet.retweetCount,
        quotes: item.tweet.quoteCount,
        bookmarks: item.tweet.bookmarkCount,
        analysis: item.analysis,
        generatedPostText: generated.postText,
        generatedImagePrompt: generated.imagePrompt,
        generatedImageUrl,
        infographicStyle: classification?.style || "",
        datePosted: item.tweet.createdAt,
        dateAdded: new Date().toISOString(),
        configName: config.configName,
        starred: false,
      };

      completedPosts.push(post);
      log(`${prefix} Complete [${elapsed(genStart)}]`);
    } catch (err) {
      const msg = `${prefix} FAILED — ${err instanceof Error ? err.message : err}`;
      progress.errors.push(msg);
      log(msg);
    }

    progress.postsProcessed++;
    progress.activeTasks = progress.activeTasks.filter((t) => t !== `${label}`);
    onProgress({ ...progress });
    return null;
  });

  // ── Phase 4: Persistence ──
  log(``);
  log(`── SAVING ──`);
  if (completedPosts.length > 0) {
    appendPosts(completedPosts);
    log(`Saved ${completedPosts.length} posts`);
  } else {
    log(`No posts were successfully generated`);
  }

  log(``);
  log(`── COMPLETE ──`);
  log(`Total time: ${elapsed(pipelineStart)}`);
  log(`Scraped: ${totalScraped} posts | Analyzed: ${analyzedItems.length} | Generated: ${completedPosts.length}`);
  if (progress.errors.length > 0) {
    log(`Errors: ${progress.errors.length}`);
  }

  progress.phase = "done";
  progress.activeTasks = [];
  onProgress({ ...progress });
}
