import fs from "fs";
import path from "path";
import { ApifyTweetResult } from "./types";

export function getTwitterApiKey(): string {
  const envKey = process.env.TWITTERAPI_IO_KEY;
  if (envKey) return envKey;
  try {
    const rootEnvPath = path.resolve(process.cwd(), "..", ".env");
    if (fs.existsSync(rootEnvPath)) {
      const match = fs.readFileSync(rootEnvPath, "utf-8").match(/TWITTERAPI_IO_KEY=([^\r\n]+)/);
      if (match?.[1]?.trim()) return match[1].trim();
    }
  } catch {}
  return "";
}

const BASE_URL = "https://api.twitterapi.io/twitter";

// Serialized pacing queue for free-tier rate limits (1 request every 5 seconds)
let lastRequestTimestamp = 0;
const MIN_INTERVAL_MS = 5200; // 5.2s interval to safely stay under the 5s QPS limit
let queuePromise: Promise<void> = Promise.resolve();

async function enforceRateLimit(): Promise<void> {
  const waitPromise = queuePromise.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTimestamp;
    if (elapsed < MIN_INTERVAL_MS) {
      const waitTime = MIN_INTERVAL_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastRequestTimestamp = Date.now();
  });
  queuePromise = waitPromise.catch(() => {});
  return waitPromise;
}

/**
 * Fetch with automatic 429 retry and rate-limit pacing
 */
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await enforceRateLimit();

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": getTwitterApiKey(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 429 || data?.error === "Too Many Requests") {
      if (attempt < retries) {
        // Wait 6 seconds and retry
        await new Promise((resolve) => setTimeout(resolve, 6000));
        continue;
      }
      throw new Error(`TwitterAPI.io rate limit exceeded after ${retries} retries`);
    }

    if (!res.ok || (data && data.status === "error")) {
      throw new Error(
        data?.msg || data?.message || `TwitterAPI.io request failed with status ${res.status}`
      );
    }

    return data;
  }
  throw new Error("TwitterAPI.io request failed");
}

export interface TwitterApiProfile {
  username: string;
  displayName: string;
  followers: number;
  following: number;
  totalPosts: number;
  profilePicUrl: string;
  isBlueVerified: boolean;
  bio: string;
}

/**
 * Scrape user profile details via twitterapi.io
 */
export async function scrapeProfileViaTwitterApi(username: string): Promise<TwitterApiProfile> {
  const cleanUsername = username.replace(/^@/, "").trim();
  const url = `${BASE_URL}/user/info?userName=${encodeURIComponent(cleanUsername)}`;

  const res = await fetchWithRetry(url);
  const user = res?.data;

  if (!user) {
    throw new Error(`No user data returned for @${cleanUsername}`);
  }

  // Get high-res profile picture
  let profilePic = user.profilePicture || "";
  if (profilePic.includes("_normal.")) {
    profilePic = profilePic.replace("_normal.", "_400x400.");
  }

  return {
    username: user.userName || cleanUsername,
    displayName: user.name || cleanUsername,
    followers: Number(user.followers || 0),
    following: Number(user.following || 0),
    totalPosts: Number(user.statusesCount || 0),
    profilePicUrl: profilePic,
    isBlueVerified: Boolean(user.isBlueVerified),
    bio: user.description || "",
  };
}

/**
 * Scrape recent tweets via twitterapi.io and normalize into ApifyTweetResult format
 */
export async function scrapeTweetsViaTwitterApi(
  username: string,
  maxCount: number = 20,
  daysLookback: number = 365
): Promise<ApifyTweetResult[]> {
  const cleanUsername = username.replace(/^@/, "").trim();
  const url = `${BASE_URL}/user/last_tweets?userName=${encodeURIComponent(cleanUsername)}&includeReplies=false`;

  const res = await fetchWithRetry(url);
  const rawTweets: any[] = res?.data?.tweets || [];

  const now = Date.now();
  const cutoff = now - daysLookback * 24 * 60 * 60 * 1000;

  const normalized: ApifyTweetResult[] = rawTweets
    .map((raw): ApifyTweetResult | null => {
      if (!raw || !raw.id) return null;

      // Filter out replies and retweets
      if (raw.isReply || raw.inReplyToId) return null;
      const text = String(raw.text || "");
      if (text.startsWith("RT @")) return null;

      // Parse date
      const createdAt = raw.createdAt || "";
      const postedTime = new Date(createdAt).getTime();
      if (!isNaN(postedTime) && postedTime < cutoff) {
        return null; // outside timeframe lookback
      }

      // Extract media items
      const mediaList: ApifyTweetResult["media"] = [];
      const rawMedia =
        raw.extendedEntities?.media || raw.entities?.media || [];

      if (Array.isArray(rawMedia)) {
        for (const m of rawMedia) {
          const type =
            m.type === "video"
              ? "video"
              : m.type === "animated_gif"
              ? "animated_gif"
              : "photo";

          const photoUrl = m.media_url_https || m.url || "";
          let videoUrl: string | undefined = undefined;

          if (m.video_info?.variants && Array.isArray(m.video_info.variants)) {
            // Find highest bitrate mp4
            const mp4s = m.video_info.variants
              .filter((v: any) => v.content_type === "video/mp4")
              .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
            if (mp4s.length > 0) {
              videoUrl = mp4s[0].url;
            }
          }

          if (photoUrl) {
            mediaList.push({
              type,
              url: photoUrl,
              previewUrl: photoUrl,
              videoUrl,
            });
          }
        }
      }

      const author = raw.author || {};
      let profilePic = author.profilePicture || "";
      if (profilePic.includes("_normal.")) {
        profilePic = profilePic.replace("_normal.", "_400x400.");
      }

      return {
        id: String(raw.id),
        url: raw.url || raw.twitterUrl || `https://x.com/${cleanUsername}/status/${raw.id}`,
        text: text.trim(),
        likeCount: Number(raw.likeCount || 0),
        retweetCount: Number(raw.retweetCount || 0),
        replyCount: Number(raw.replyCount || 0),
        quoteCount: Number(raw.quoteCount || 0),
        viewCount: Number(raw.viewCount || 0),
        bookmarkCount: Number(raw.bookmarkCount || 0),
        createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
        isRetweet: Boolean(raw.isRetweet || text.startsWith("RT @")),
        isReply: Boolean(raw.isReply || raw.inReplyToId),
        conversationId: String(raw.conversationId || raw.id),
        author: {
          userName: author.userName || cleanUsername,
          name: author.name || cleanUsername,
          profilePicture: profilePic,
          followers: Number(author.followers || 0),
          following: Number(author.following || 0),
          statusesCount: Number(author.statusesCount || 0),
          isBlueVerified: Boolean(author.isBlueVerified),
          description: author.description || "",
        },
        media: mediaList.length > 0 ? mediaList : undefined,
      };
    })
    .filter((t): t is ApifyTweetResult => t !== null);

  // Sort descending by total engagement: (likes + reposts + quotes)
  normalized.sort(
    (a, b) =>
      b.likeCount + b.retweetCount + b.quoteCount - (a.likeCount + a.retweetCount + a.quoteCount)
  );

  return normalized.slice(0, maxCount);
}
