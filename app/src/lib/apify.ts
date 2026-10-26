import { ApifyTweetResult } from "./types";
import {
  scrapeTweetsViaTwitterApi,
  scrapeProfileViaTwitterApi,
  getTwitterApiKey,
} from "./twitterapi";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const TWEETS_ACTOR = "apidojo~twitter-scraper-lite";
const TWEETS_URL = `https://api.apify.com/v2/acts/${TWEETS_ACTOR}/run-sync-get-dataset-items`;
const PROFILE_ACTOR = "quacker~twitter-scraper";
const PROFILE_URL = `https://api.apify.com/v2/acts/${PROFILE_ACTOR}/run-sync-get-dataset-items`;

/**
 * Primary tweet scraping router:
 * 1. Uses twitterapi.io by default (fast, cheap, no container spinup)
 * 2. Seamlessly falls back to Apify if twitterapi.io fails or key is missing
 */
export async function scrapeTweets(
  username: string,
  maxCount: number = 20,
  daysLookback: number = 365
): Promise<ApifyTweetResult[]> {
  const hasTwitterApiKey = Boolean(getTwitterApiKey());

  if (hasTwitterApiKey) {
    try {
      const tweets = await scrapeTweetsViaTwitterApi(username, maxCount, daysLookback);
      return tweets;
    } catch (err: any) {
      console.warn(
        `[Scraper Router] twitterapi.io failed for @${username} (${err?.message || err}). Falling back to Apify...`
      );
    }
  }

  // Fallback to Apify
  return scrapeTweetsViaApify(username, maxCount, daysLookback);
}

/**
 * Apify-specific tweet scraper (preserved as reliable fallback)
 */
export async function scrapeTweetsViaApify(
  username: string,
  maxCount: number = 20,
  daysLookback: number = 365
): Promise<ApifyTweetResult[]> {
  const res = await fetch(`${TWEETS_URL}?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      includeSearchTerms: false,
      maxItems: maxCount,
      sort: "Latest",
      twitterHandles: [username],
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Apify scrape failed for @${username} (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  let data: Record<string, unknown>[];
  try {
    data = await res.json();
  } catch {
    throw new Error(`Apify returned invalid JSON for @${username}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `Apify returned non-array for @${username}: ${JSON.stringify(data).slice(0, 200)}`
    );
  }

  const now = Date.now();
  const cutoff = now - daysLookback * 24 * 60 * 60 * 1000;

  const tweets: ApifyTweetResult[] = data
    .map((raw) => normalizeTweet(raw, username))
    .filter((t): t is ApifyTweetResult => {
      if (!t) return false;
      if (t.isRetweet || t.isReply) return false;
      if (t.createdAt) {
        const posted = new Date(t.createdAt).getTime();
        if (!isNaN(posted) && posted < cutoff) return false;
      }
      return true;
    });

  return tweets.sort(
    (a, b) =>
      (b.likeCount + b.retweetCount + b.quoteCount) -
      (a.likeCount + a.retweetCount + a.quoteCount)
  );
}

function normalizeTweet(
  raw: Record<string, unknown>,
  fallbackUsername: string
): ApifyTweetResult | null {
  const idStr = String(raw.id || "");
  if (!idStr || idStr === "undefined") return null;

  const author = raw.author as Record<string, unknown> | undefined;

  const media: ApifyTweetResult["media"] = [];
  const extEntities = raw.extendedEntities as Record<string, unknown> | undefined;
  const rawMedia = (extEntities?.media || raw.media) as Record<string, unknown>[] | undefined;

  if (Array.isArray(rawMedia)) {
    for (const m of rawMedia) {
      const type = String(m.type || "photo") as "photo" | "video" | "animated_gif";

      let videoUrl: string | undefined;
      let duration: number | undefined;
      if (type === "video" || type === "animated_gif") {
        const videoInfo = m.video_info as Record<string, unknown> | undefined;
        if (videoInfo) {
          duration = videoInfo.duration_millis ? Number(videoInfo.duration_millis) / 1000 : undefined;
          const variants = videoInfo.variants as Record<string, unknown>[] | undefined;
          if (Array.isArray(variants)) {
            const mp4 = variants
              .filter((v) => String(v.content_type || "") === "video/mp4")
              .sort((a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0));
            if (mp4.length > 0) videoUrl = String(mp4[0].url);
          }
        }
      }

      media.push({
        type,
        url: String(m.media_url_https || m.media_url || ""),
        videoUrl,
        previewUrl: String(m.media_url_https || ""),
        duration,
      });
    }
  }

  const twitterUrl = String(raw.twitterUrl || raw.url || "");
  const url = twitterUrl || `https://x.com/${fallbackUsername}/status/${idStr}`;

  return {
    id: idStr,
    url,
    text: String(raw.fullText || raw.full_text || raw.text || ""),
    retweetCount: Number(raw.retweetCount || raw.retweet_count || 0),
    likeCount: Number(raw.likeCount || raw.favorite_count || 0),
    replyCount: Number(raw.replyCount || raw.reply_count || 0),
    quoteCount: Number(raw.quoteCount || raw.quote_count || 0),
    viewCount: Number(raw.viewCount || raw.view_count || 0),
    bookmarkCount: Number(raw.bookmarkCount || raw.bookmark_count || 0),
    createdAt: String(raw.createdAt || raw.created_at || ""),
    author: {
      userName: String(author?.userName || author?.screen_name || fallbackUsername),
      name: String(author?.name || fallbackUsername),
      profilePicture: String(author?.profilePicture || author?.profile_image_url_https || "").replace("_normal", "_400x400"),
      followers: Number(author?.followers || author?.followers_count || 0),
      following: Number(author?.following || author?.friends_count || 0),
      statusesCount: Number(author?.statusesCount || author?.statuses_count || 0),
      isBlueVerified: Boolean(author?.isBlueVerified || author?.is_blue_verified || false),
      description: String(author?.description || ""),
    },
    media: media.length > 0 ? media : undefined,
    isRetweet: Boolean(raw.isRetweet || String(raw.fullText || raw.full_text || "").startsWith("RT @")),
    isReply: Boolean(raw.isReply || raw.in_reply_to_status_id_str || raw.in_reply_to_user_id_str),
    conversationId: String(raw.conversationId || raw.conversation_id_str || idStr),
  };
}

/**
 * Primary profile scraping router:
 * 1. Uses twitterapi.io by default
 * 2. Seamlessly falls back to Apify if twitterapi.io fails or key is missing
 */
export async function scrapeXProfile(username: string) {
  const hasTwitterApiKey = Boolean(getTwitterApiKey());

  if (hasTwitterApiKey) {
    try {
      const profile = await scrapeProfileViaTwitterApi(username);
      return profile;
    } catch (err: any) {
      console.warn(
        `[Scraper Router] twitterapi.io profile failed for @${username} (${err?.message || err}). Falling back to Apify...`
      );
    }
  }

  // Fallback to Apify
  return scrapeProfileViaApify(username);
}

/**
 * Apify-specific profile scraper (preserved as reliable fallback)
 */
export async function scrapeProfileViaApify(username: string) {
  const res = await fetch(`${PROFILE_URL}?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handles: [username],
      tweetsDesired: 1,
      proxyConfig: { useApifyProxy: true },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Apify stats failed for @${username} (${res.status}): ${errText.slice(0, 200)}`);
  }

  let data: Record<string, unknown>[];
  try {
    data = await res.json();
  } catch {
    throw new Error(`Apify returned invalid JSON for @${username} stats`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`Apify returned non-array for @${username}`);
  }

  const validItems = data.filter((d) => !d.noResults);
  if (validItems.length === 0) {
    throw new Error(`No data returned for @${username}`);
  }

  const user = validItems[0].user as Record<string, unknown> | undefined;
  if (!user) {
    throw new Error(`No user data in response for @${username}`);
  }

  return {
    username: String(user.screen_name || username),
    displayName: String(user.name || username),
    followers: Number(user.followers_count || 0),
    following: Number(user.friends_count || 0),
    totalPosts: Number(user.statuses_count || 0),
    profilePicUrl: String(user.profile_image_url_https || "").replace("_normal", "_400x400"),
    isBlueVerified: Boolean(user.is_blue_verified || false),
    bio: String(user.description || ""),
  };
}
