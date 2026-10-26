import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import fs from "fs";
import path from "path";
import { Post, Creator, Config } from "./types";

const DATA_DIR = path.join(process.cwd(), "..", "data");

let writeLock = Promise.resolve();

function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = writeLock.then(fn, fn);
  writeLock = next.then(() => {}, () => {});
  return next;
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(name: string) {
  return path.join(DATA_DIR, name);
}

export function readCsv<T>(filename: string): T[] {
  ensureDataDir();
  const fp = filePath(filename);
  if (!fs.existsSync(fp)) return [];
  const content = fs.readFileSync(fp, "utf-8").trim();
  if (!content) return [];
  try {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      cast: (value, context) => {
        if (context.header) return value;
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      },
    }) as T[];
  } catch {
    return [];
  }
}

function writeCsvSync<T extends Record<string, unknown>>(
  filename: string,
  records: T[],
  columns: string[]
) {
  ensureDataDir();
  const fp = filePath(filename);
  const tmpFp = fp + ".tmp";
  const output = stringify(records, { header: true, columns });
  fs.writeFileSync(tmpFp, output);
  fs.renameSync(tmpFp, fp);
}

const postColumns = [
  "id", "link", "creator", "text", "mediaType", "mediaUrls",
  "views", "likes", "replies", "retweets", "quotes", "bookmarks",
  "analysis", "generatedPostText", "generatedImagePrompt", "generatedImageUrl",
  "infographicStyle", "datePosted", "dateAdded", "configName", "starred",
  // Reddit/AEO Studio fields
  "hookFormula", "whyItWorked", "visualArchetype",
  "redditAeoAdaptation", "personalizeQuestion", "claudePromptPacket", "chatgptImagePrompt",
];

const creatorColumns = [
  "id", "username", "displayName", "category", "profilePicUrl", "followers",
  "following", "totalPosts", "isBlueVerified", "bio", "lastScrapedAt",
  "studyFocus", "active",
];

const configColumns = [
  "id", "configName", "creatorsCategory", "analysisInstruction",
  "newConceptsInstruction",
];

export function readPosts(): Post[] {
  const rows = readCsv<Record<string, string>>("posts.csv");
  const parsed = rows.map((r) => ({
    ...r,
    views: Number(r.views) || 0,
    likes: Number(r.likes) || 0,
    replies: Number(r.replies) || 0,
    retweets: Number(r.retweets) || 0,
    quotes: Number(r.quotes) || 0,
    bookmarks: Number(r.bookmarks) || 0,
    starred: String(r.starred) === "true",
    hookFormula: r.hookFormula || "",
    whyItWorked: r.whyItWorked || "",
    visualArchetype: r.visualArchetype || "",
    redditAeoAdaptation: r.redditAeoAdaptation || "",
    personalizeQuestion: r.personalizeQuestion || "",
    claudePromptPacket: r.claudePromptPacket || "",
    chatgptImagePrompt: r.chatgptImagePrompt || "",
  })) as unknown as Post[];

  // Deduplicate by post link (or id), keeping the entry with the richest analysis
  const dedupedMap = new Map<string, Post>();
  for (const post of parsed) {
    const key = post.link || post.id;
    const existing = dedupedMap.get(key);
    if (!existing) {
      dedupedMap.set(key, post);
    } else {
      // Keep whichever has a longer Claude prompt or higher metrics
      const existingScore = (existing.claudePromptPacket?.length || 0) + (existing.likes || 0);
      const currentScore = (post.claudePromptPacket?.length || 0) + (post.likes || 0);
      if (currentScore > existingScore) {
        dedupedMap.set(key, post);
      }
    }
  }

  return Array.from(dedupedMap.values());
}

export function writePosts(posts: Post[]) {
  return withWriteLock(() =>
    writeCsvSync("posts.csv", posts as unknown as Record<string, unknown>[], postColumns)
  );
}

export function appendPosts(newPosts: Post[]) {
  return withWriteLock(() => {
    const existing = readPosts();
    const newLinks = new Set(newPosts.map((p) => p.link));
    const dedupedExisting = existing.filter((p) => !newLinks.has(p.link));
    writeCsvSync("posts.csv", [...newPosts, ...dedupedExisting] as unknown as Record<string, unknown>[], postColumns);
  });
}

export function readCreators(): Creator[] {
  const rows = readCsv<Record<string, string>>("creators.csv");
  return rows.map((r) => ({
    ...r,
    followers: Number(r.followers) || 0,
    following: Number(r.following) || 0,
    totalPosts: Number(r.totalPosts) || 0,
    isBlueVerified: String(r.isBlueVerified) === "true",
    active: String(r.active) !== "false",
    studyFocus: r.studyFocus || r.study_focus || "",
  })) as unknown as Creator[];
}

export function writeCreators(creators: Creator[]) {
  return withWriteLock(() =>
    writeCsvSync("creators.csv", creators as unknown as Record<string, unknown>[], creatorColumns)
  );
}

export function readConfigs(): Config[] {
  return readCsv<Config>("configs.csv");
}

export function writeConfigs(configs: Config[]) {
  return withWriteLock(() =>
    writeCsvSync("configs.csv", configs as unknown as Record<string, unknown>[], configColumns)
  );
}
