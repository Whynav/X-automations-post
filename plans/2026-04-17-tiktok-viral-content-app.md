# Plan: TikTok Viral Content App — Port of Instagram Social Media AI

**Created:** 2026-04-17
**Status:** Implemented
**Request:** Replicate the Instagram Reels viral content analysis app (social-media repo) for TikTok, focused on beauty/lifestyle/fashion niche

---

## Overview

### What This Plan Accomplishes

Build a full Next.js web application that curates TikTok creators in the beauty/lifestyle/fashion niche, scrapes their latest videos, analyzes viral content with Gemini, and generates personalized content concepts with Claude — mirroring the existing Instagram Social Media AI app but adapted for TikTok.

### Why This Matters

The Instagram version is already proven. Porting it to TikTok extends the same viral content research workflow to a second platform, letting you discover and replicate what works on TikTok with the same systematic approach.

---

## API Testing Results (Verified 2026-04-17)

All three APIs have been tested end-to-end. These findings inform every design decision below.

### Apify `clockworks~tiktok-scraper` — VERIFIED WORKING

**Endpoint:** `POST https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items`

**Key request parameters (tested):**
```json
{
  "profiles": ["username"],
  "profileScrapeSections": ["videos"],
  "profileSorting": "latest",
  "scrapeLastNDays": 30,
  "shouldDownloadVideos": true,
  "videoKvStoreIdOrName": "tiktok-videos",
  "resultsPerPage": 10
}
```

**Response structure (confirmed from live data):**

| Field Path | Type | Description |
|------------|------|-------------|
| `id` | string | TikTok video ID |
| `text` | string | Caption |
| `createTimeISO` | string | ISO date, e.g. `"2026-04-16T22:40:00.000Z"` |
| `playCount` | number | Play count (TikTok's equivalent of views) |
| `diggCount` | number | Likes |
| `shareCount` | number | Shares |
| `commentCount` | number | Comments |
| `collectCount` | number | Saves/bookmarks |
| `webVideoUrl` | string | `https://www.tiktok.com/@user/video/ID` |
| `videoMeta.downloadAddr` | string | Apify KV store URL (only when `shouldDownloadVideos: true`) |
| `videoMeta.coverUrl` | string | Thumbnail image URL |
| `videoMeta.originalCoverUrl` | string | Higher-res thumbnail |
| `videoMeta.duration` | number | Seconds |
| `videoMeta.height` / `width` | number | Resolution |
| `videoMeta.subtitleLinks[]` | array | ASR transcripts (free!) |
| `authorMeta.name` | string | Username |
| `authorMeta.nickName` | string | Display name |
| `authorMeta.fans` | number | Follower count |
| `authorMeta.heart` | number | Total likes received |
| `authorMeta.video` | number | Total video count |
| `authorMeta.avatar` | string | Profile pic URL |
| `authorMeta.verified` | boolean | Verification status |
| `authorMeta.signature` | string | Bio text |
| `authorMeta.bioLink` | string | Link in bio |
| `hashtags[]` | array | Hashtags used |
| `musicMeta` | object | Sound/music info |
| `isSlideshow` | boolean | Photo slideshow vs video |
| `isPinned` | boolean | Pinned video |
| `isSponsored` | boolean | Paid promotion |

**Critical findings:**
1. **No separate actor needed for creator stats.** `authorMeta` comes with every video response and includes fans, heart, video count, avatar, verified status, bio. For "refresh stats" we just scrape with `resultsPerPage: 1, shouldDownloadVideos: false` — fast and cheap.
2. **`shouldDownloadVideos: true`** stores videos in Apify KV store. The `videoMeta.downloadAddr` field contains a direct-download URL like `https://api.apify.com/v2/key-value-stores/STORE_ID/records/video-USERNAME-DATE-VIDEOID.mp4`.
3. **`shouldDownloadVideos: false`** returns all metadata but no `downloadAddr`. Useful for fast stat refreshes.
4. **Video downloads are fast.** 2.5MB video downloaded in ~2 seconds from Apify KV store.
5. **ASR subtitles** are included in `videoMeta.subtitleLinks` — free transcripts from TikTok's own speech recognition. Could supplement Gemini analysis.

### Gemini Video Analysis — VERIFIED WORKING

**Upload protocol (tested):**
1. POST to `https://generativelanguage.googleapis.com/upload/v1beta/files?key=KEY` with resumable upload headers → get upload URL
2. POST video binary to upload URL with `X-Goog-Upload-Command: upload, finalize` → get file URI
3. File goes from PROCESSING → ACTIVE in ~3 seconds (tested)
4. Use file URI in `generateContent` call

**Analysis endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

**Rate limiting (important for pipeline design):**
- Free tier has per-minute AND per-day quotas
- The app MUST implement: exponential backoff retry (3 attempts, 5s → 10s → 20s delays)
- Pipeline should limit concurrent Gemini calls to 2 (not 3 like Instagram app) to avoid hitting per-minute limits
- Consider using `gemini-2.0-flash` as default (good balance of speed/quality), with `gemini-2.5-flash` as configurable upgrade option
- JSON response may contain control characters — always parse with `strict: false` in Node.js

### Claude Concept Generation — VERIFIED WORKING

**Tested with:** `claude-sonnet-4-5-20250929`, max_tokens 4096
**Result:** High-quality TikTok-adapted concepts with HOOK, CONCEPT, FULL SCRIPT, WHY IT WORKS sections. 3541 chars for 2 concepts. ~832 output tokens.

### TikTok CDN Domains (for Next.js image config) — IDENTIFIED

From live scraper data, these domains serve TikTok images:
- `p16-common-sign.tiktokcdn-us.com` — thumbnails, avatars, cover images
- `p16-sign-sg.tiktokcdn.com` — alternate region thumbnails
- `*.tiktokcdn-us.com` — US CDN (wildcard recommended)
- `*.tiktokcdn.com` — global CDN (wildcard recommended)

### Test Creators — VERIFIED

| Username | Display Name | Followers | Total Hearts | Verified | Niche |
|----------|-------------|-----------|-------------|----------|-------|
| xoxoemira | emira ♡ | 1.4M | 41.9M | Yes | Beauty/Lifestyle |
| alixearle | Alix Earle | 8.4M | 1.6B | Yes | Beauty/Lifestyle |
| golloria | golloria | 3.3M | 172.3M | Yes | Beauty/Fashion/Lifestyle |
| lydiamillen | Lydia Millen | 1.6M | 37.8M | Yes | Life & Style |
| leticiafgomes | Letícia Gomes | 8.3M | 192.7M | Yes | Makeup/Beauty |

---

## Brand Persona: "Bella Glow"

The app ships with a pre-configured brand persona for the beauty/lifestyle/fashion niche, similar to how the Instagram app has example configs.

**Brand story:** Bella Glow is an emerging beauty and lifestyle influencer building her TikTok presence. She creates content at the intersection of beauty tutorials, fashion hauls, and aspirational lifestyle content. She recently launched a clean beauty skincare line ("Glow Essentials") and uses TikTok to build brand awareness and drive product sales.

**Content pillars:**
1. **Beauty** — Skincare routines, makeup tutorials, product reviews, GRWM (Get Ready With Me)
2. **Lifestyle** — Daily vlogs, wellness tips, morning/night routines, travel content
3. **Fashion** — Outfit of the day, seasonal hauls, styling tips, brand collabs

**Tone:** Authentic, relatable, aspirational but approachable. Not overly polished — the "best friend who happens to know a lot about beauty" vibe.

**Default analysis prompt** (sent to Gemini):
```
Analyze this TikTok video in detail for a beauty/lifestyle/fashion creator:

1. HOOK: What grabs attention in the first 1-3 seconds? (visual, text overlay, audio, action)
2. RETENTION: What techniques keep viewers watching? (pattern interrupts, curiosity loops, pacing, transitions, before/after reveals)
3. REWARD: What value does the viewer get? (tutorial, product discovery, entertainment, inspiration, transformation)
4. SCRIPT: Full transcript/narration with visual descriptions and timing notes
5. VIRAL FACTORS: What specific elements make this shareable? (relatability, trend participation, controversy, humor, satisfaction)
6. PRODUCTION: Filming style (POV, talking head, montage), editing pace, music/sound choice, text overlays, lighting

Format as structured markdown with clear sections.
```

**Default concepts prompt** (sent to Claude):
```
You are creating TikTok video concepts for "Bella Glow" — an emerging beauty, lifestyle, and fashion creator who just launched a clean skincare line called "Glow Essentials."

Her style: authentic, relatable, aspirational but approachable. Think "best friend who knows a lot about beauty." She films in her apartment, at events, and while traveling.

Based on the video analysis above, generate 2-3 original TikTok video concepts adapted for Bella Glow's brand. For each concept provide:

1. HOOK: The exact opening 1-3 seconds (what the viewer sees/hears)
2. CONCEPT: What the video is about and how it connects to her brand
3. FULL SCRIPT: Complete script with visual directions, text overlays, and timing — detailed enough to shoot from
4. PRODUCT TIE-IN: Natural way to feature Glow Essentials (if applicable — don't force it)
5. WHY IT WORKS: Why this has viral potential based on the analyzed reference

Make each concept distinct. One should be quick (<15s), one medium (15-45s), one longer (45-90s) if generating 3 concepts. Focus on replicability.
```

---

## Current State

### Relevant Existing Structure

- `Viral TikToks.json` — n8n workflow reference (Apify actor ID, Gemini upload flow, Airtable schema)
- `.env` — Contains `APIFY_API_TOKEN`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
- Instagram reference repo at `github.com/melnikoff-oleg/social-media` — fully working Next.js app

### Instagram App Architecture (Reference)

The Instagram app follows this structure that we mirror:
```
app/src/
├── app/
│   ���── api/pipeline/route.ts    # SSE pipeline execution
│   ├── api/videos/route.ts      # Video CRUD
│   ├── api/creators/route.ts    # Creator CRUD
│   ├── api/creators/refresh/    # Creator stats refresh
│   ├── api/configs/route.ts     # Config CRUD
│   ├─��� api/proxy-image/route.ts # Image proxy
│   ├── videos/page.tsx          # Video gallery (14.8KB)
│   ├── creators/page.tsx        # Creator management (15.3KB)
���   ├── configs/page.tsx         # Config management (10KB)
│   ├── run/page.tsx             # Pipeline runner (12KB)
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Design system
├── lib/
│   ├── pipeline.ts              # 3-phase orchestrator (7.7KB, largest)
│   ├── apify.ts                 # Scraping integration (3.8KB)
│   ├── gemini.ts                # Video analysis (3.6KB)
│   ├���─ claude.ts                # Concept generation
│   ├── csv.ts                   # CSV persistence (3.4KB)
│   ├── types.ts                 # TypeScript interfaces
│   └── utils.ts                 # Helpers
├── components/                  # Sidebar, top-bar, markdown, shadcn/ui
├── context/                     # Pipeline state provider
└── hooks/                       # use-mobile
```

---

## Proposed Changes

### Summary of Changes

- Create a new Next.js application (`app/`) mirroring the Instagram repo's structure
- Implement TikTok scraping via Apify's `clockworks~tiktok-scraper` actor
- Implement Gemini video upload + analysis with rate-limit-aware retry logic
- Implement Claude concept generation adapted for TikTok/beauty niche
- Build the same 4-page UI: Videos, Creators, Configs, Run Pipeline
- Use CSV storage in `data/` directory
- Seed with 5 beauty/lifestyle/fashion creators and "Bella Glow" config

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/package.json` | Dependencies: next, react, @anthropic-ai/sdk, csv-parse, csv-stringify, react-markdown, remark-gfm, shadcn/ui, tailwind |
| `app/tsconfig.json` | TypeScript strict mode, path aliases, ES2017 target |
| `app/next.config.ts` | Next.js config — loads `.env` from parent dir, TikTok CDN image domains |
| `app/postcss.config.mjs` | PostCSS for Tailwind |
| `app/eslint.config.mjs` | ESLint config |
| `app/components.json` | shadcn/ui configuration |
| `app/src/lib/types.ts` | TypeScript interfaces (see Step 2 for exact shapes) |
| `app/src/lib/apify.ts` | `scrapeTikToks()` + `scrapeCreatorStats()` |
| `app/src/lib/gemini.ts` | `uploadVideo()` + `waitForFileActive()` + `analyzeVideo()` |
| `app/src/lib/claude.ts` | `generateConcepts()` |
| `app/src/lib/csv.ts` | `readCsv<T>()` + `writeCsv()` + `appendVideo()` |
| `app/src/lib/pipeline.ts` | 3-phase pipeline orchestrator |
| `app/src/lib/utils.ts` | `cn()`, `formatCount()`, UUID generation |
| `app/src/app/layout.tsx` | Root layout with providers |
| `app/src/app/page.tsx` | Redirect to /videos |
| `app/src/app/globals.css` | Design system |
| `app/src/app/videos/page.tsx` | Video gallery |
| `app/src/app/creators/page.tsx` | Creator management |
| `app/src/app/configs/page.tsx` | Config management |
| `app/src/app/run/page.tsx` | Pipeline execution UI |
| `app/src/app/api/videos/route.ts` | Video CRUD |
| `app/src/app/api/creators/route.ts` | Creator CRUD |
| `app/src/app/api/creators/refresh/route.ts` | Creator stats refresh (SSE) |
| `app/src/app/api/configs/route.ts` | Config CRUD |
| `app/src/app/api/pipeline/route.ts` | Pipeline execution (SSE) |
| `app/src/app/api/proxy-image/route.ts` | Image proxy for TikTok CDN |
| `app/src/components/app-sidebar.tsx` | Navigation sidebar |
| `app/src/components/top-bar.tsx` | Header bar |
| `app/src/components/markdown-content.tsx` | Markdown renderer |
| `app/src/context/pipeline-context.tsx` | Pipeline state provider |
| `app/src/hooks/use-mobile.ts` | Mobile detection |
| `data/creators.csv` | Seeded with 5 beauty/lifestyle creators |
| `data/videos.csv` | Empty with headers |
| `data/configs.csv` | Seeded with "Bella Glow" config |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `CLAUDE.md` | Add TikTok app documentation, commands, env vars |

---

## Design Decisions

### Key Decisions Made

1. **Mirror Instagram app structure exactly**: Proven architecture, same mental model for maintenance. Only TikTok-specific adaptations in the scraping layer and types.

2. **Use `clockworks~tiktok-scraper`**: Tested and confirmed working. Returns rich data including `authorMeta` (no separate profile scraper needed), video downloads via KV store, and even ASR transcripts.

3. **Creator stats via same actor with `resultsPerPage: 1, shouldDownloadVideos: false`**: Fast, cheap, no extra API needed. `authorMeta` in the response has followers, hearts, video count, avatar, verified status.

4. **`gemini-2.0-flash` as default model**: Good balance of speed, quality, and cost. Configurable to `gemini-2.5-flash` for higher quality. Rate-limit-aware with exponential backoff.

5. **Max 2 concurrent Gemini workers** (vs 3 in Instagram app): Free tier rate limits are tighter. 2 concurrent keeps us safely under per-minute quotas.

6. **CSV storage (not Airtable)**: Consistent with Instagram app. Simpler, self-contained, no external dependency.

7. **TikTok CDN wildcard domains**: Use `*.tiktokcdn-us.com` and `*.tiktokcdn.com` in Next.js image config to cover all CDN variants.

8. **Parse Gemini JSON with `strict: false`**: Gemini responses can contain control characters in the JSON text field. Node.js `JSON.parse` needs relaxed mode.

9. **Seed data with real beauty niche creators + "Bella Glow" persona**: App works out of the box after first run — no manual setup needed.

### Alternatives Considered

- **Airtable storage**: Rejected — adds dependency. CSV is consistent with Instagram app.
- **Separate profile scraper actor**: Not needed — `authorMeta` in video response has all stats.
- **`gemini-1.5-pro` (as in n8n workflow)**: Older model. 2.0-flash is faster and sufficient.

---

## Step-by-Step Tasks

### Step 1: Initialize the Next.js App

**Actions:**

- `cd app && npx create-next-app@latest . --typescript --tailwind --app --src-dir --use-npm`
- Install: `npm install @anthropic-ai/sdk csv-parse csv-stringify react-markdown remark-gfm`
- Install shadcn/ui: `npx shadcn@latest init` then add components: button, card, dialog, input, textarea, select, badge, tooltip, sidebar, dropdown-menu, separator, sheet, skeleton
- Configure `next.config.ts`:
  ```typescript
  import { config } from "dotenv";
  import path from "path";
  config({ path: path.join(__dirname, "..", ".env") });

  const nextConfig = {
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "**.tiktokcdn-us.com" },
        { protocol: "https", hostname: "**.tiktokcdn.com" },
        { protocol: "https", hostname: "api.apify.com" },
      ],
    },
    maxDuration: 300,
  };
  export default nextConfig;
  ```

**Files:** `app/package.json`, `app/tsconfig.json`, `app/next.config.ts`, `app/postcss.config.mjs`, `app/components.json`

---

### Step 2: Create Core Types

**Exact interfaces (based on tested Apify response):**

```typescript
// Matches Apify clockworks~tiktok-scraper response exactly
interface ApifyTikTokResult {
  id: string;
  text: string;
  createTimeISO: string;
  playCount: number;
  diggCount: number;
  shareCount: number;
  commentCount: number;
  collectCount: number;
  webVideoUrl: string;
  isSlideshow: boolean;
  isPinned: boolean;
  isSponsored: boolean;
  hashtags: { name: string }[];
  authorMeta: {
    name: string;
    nickName: string;
    fans: number;
    heart: number;
    video: number;
    avatar: string;
    verified: boolean;
    signature: string;
    bioLink?: string;
  };
  videoMeta: {
    duration: number;
    height: number;
    width: number;
    coverUrl: string;
    originalCoverUrl: string;
    downloadAddr?: string;  // Only when shouldDownloadVideos: true
    subtitleLinks?: { language: string; downloadLink: string }[];
  };
  musicMeta: {
    musicName: string;
    musicAuthor: string;
    musicOriginal: boolean;
  };
}

interface TikTokVideo {
  id: string;
  link: string;
  thumbnail: string;
  creator: string;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  caption: string;
  duration: number;
  analysis: string;
  newConcepts: string;
  datePosted: string;
  dateAdded: string;
  configName: string;
  starred: boolean;
}

interface Creator {
  id: string;
  username: string;
  nickName: string;
  category: string;
  profilePicUrl: string;
  followers: number;
  totalHearts: number;
  totalVideos: number;
  verified: boolean;
  bio: string;
  lastScrapedAt: string;
}

interface Config {
  id: string;
  configName: string;
  creatorsCategory: string;
  analysisInstruction: string;
  newConceptsInstruction: string;
}

interface PipelineProgress {
  phase: "scraping" | "analyzing" | "done" | "error";
  creatorsProcessed: number;
  creatorsTotal: number;
  videosProcessed: number;
  videosTotal: number;
  activeTasks: string[];
  errors: string[];
  log: string[];
}
```

**Files:** `app/src/lib/types.ts`

---

### Step 3: Implement CSV Persistence Layer

Port from Instagram app. Column schemas for TikTok:

**creators.csv columns:** id, username, nickName, category, profilePicUrl, followers, totalHearts, totalVideos, verified, bio, lastScrapedAt

**videos.csv columns:** id, link, thumbnail, creator, plays, likes, comments, shares, saves, caption, duration, analysis, newConcepts, datePosted, dateAdded, configName, starred

**configs.csv columns:** id, configName, creatorsCategory, analysisInstruction, newConceptsInstruction

**Seed data:**

`data/creators.csv` — pre-populated with:
| username | nickName | category | followers |
|----------|----------|----------|-----------|
| xoxoemira | emira ♡ | beauty-lifestyle | 1400000 |
| alixearle | Alix Earle | beauty-lifestyle | 8400000 |
| golloria | golloria | beauty-lifestyle | 3300000 |
| lydiamillen | Lydia Millen | beauty-lifestyle | 1600000 |
| leticiafgomes | Letícia Gomes | beauty-lifestyle | 8300000 |

`data/configs.csv` — pre-populated with "Bella Glow" config (analysis + concepts prompts from Brand Persona section above)

**Files:** `app/src/lib/csv.ts`, `data/creators.csv`, `data/videos.csv`, `data/configs.csv`

---

### Step 4: Implement TikTok Scraping (Apify)

**`scrapeTikToks(username, maxCount, daysLookback)`:**
```
POST https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=TOKEN
Body: {
  profiles: [username],
  profileScrapeSections: ["videos"],
  profileSorting: "latest",
  scrapeLastNDays: daysLookback,
  shouldDownloadVideos: true,
  videoKvStoreIdOrName: "tiktok-videos",
  resultsPerPage: maxCount
}
```
- Filter: `videoMeta.downloadAddr` must exist, `isSlideshow` must be false (skip photo carousels)
- Map response fields to internal `TikTokVideo` type
- Sort by `playCount` descending

**`scrapeCreatorStats(username)`:**
```
Same endpoint, but:
  shouldDownloadVideos: false,
  resultsPerPage: 1
```
- Extract from `authorMeta`: fans → followers, heart → totalHearts, video → totalVideos, avatar → profilePicUrl, verified, signature → bio, nickName
- Fast and cheap — only fetches 1 video's metadata

**Files:** `app/src/lib/apify.ts`

---

### Step 5: Implement Gemini Video Analysis

**Three functions:**

1. `uploadVideo(videoBuffer, filename)`:
   - Step 1: POST to `/upload/v1beta/files` with resumable headers → get upload URL
   - Step 2: POST binary to upload URL → get file object with URI
   - Return file URI and mimeType

2. `waitForFileActive(fileUri)`:
   - Poll `GET {fileUri}?key=KEY` every 3 seconds
   - Timeout after 2 minutes
   - Return when state === "ACTIVE", throw on "FAILED"

3. `analyzeVideo(fileUri, mimeType, prompt)`:
   - POST to `/v1beta/models/gemini-2.0-flash:generateContent`
   - **Retry logic: 3 attempts with exponential backoff (5s, 10s, 20s)** — critical for rate limits
   - Parse response text from `candidates[0].content.parts[0].text`
   - **Use `JSON.parse(raw, null, strict=false)` equivalent** — Gemini responses contain control chars

**Files:** `app/src/lib/gemini.ts`

---

### Step 6: Implement Claude Concept Generation

```typescript
import Anthropic from "@anthropic-ai/sdk";

async function generateConcepts(videoAnalysis: string, prompt: string): Promise<string> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: "You are a TikTok content specialist who adapts reference videos into original concepts while following custom guidelines.",
    messages: [{ role: "user", content: `${prompt}\n\nVideo Analysis:\n${videoAnalysis}` }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}
```

**Files:** `app/src/lib/claude.ts`

---

### Step 7: Implement Pipeline Orchestrator

**3-phase pipeline (adapted from Instagram app's 7.7KB pipeline.ts):**

**Phase 1 — Scraping** (sequential per creator):
- Load config and creators by category from CSVs
- For each creator: `scrapeTikToks(username, maxVideos, daysLookback)`
- Filter by date, sort by playCount, keep top K per creator
- Emit progress: `creatorsProcessed / creatorsTotal`

**Phase 2 — Analysis** (max 2 concurrent workers — lower than Instagram's 3 due to Gemini rate limits):
- For each top video:
  1. Download video from `videoMeta.downloadAddr` (Apify KV store URL)
  2. Upload to Gemini via `uploadVideo()`
  3. Wait for file active via `waitForFileActive()`
  4. Analyze via `analyzeVideo()` with config's `analysisInstruction`
  5. Generate concepts via `generateConcepts()` with config's `newConceptsInstruction`
- Emit progress: `videosProcessed / videosTotal`, `activeTasks`
- On error: log and continue (don't halt pipeline)

**Phase 3 — Persistence:**
- Append all analyzed videos to `videos.csv`
- Emit: phase "done"

**`runWithConcurrency(tasks, limit)` utility** for worker pool management.

**Files:** `app/src/lib/pipeline.ts`

---

### Step 8: Build API Routes

All routes match Instagram app patterns:

- **`POST /api/pipeline`** — SSE streaming. Accepts: `{ configName, maxVideos (default 20), topK (default 3), daysLookback (default 30) }`. Streams `PipelineProgress` events. Max duration: 300s.
- **`GET /api/videos?configName=X&creator=Y`** — List videos with optional filters
- **`PATCH /api/videos`** — Update starred status: `{ id, starred }`
- **`GET /api/creators`** — List all creators
- **`POST /api/creators`** — Create: `{ username, category }`. Auto-scrapes stats via `scrapeCreatorStats()`.
- **`PUT /api/creators`** — Update creator
- **`DELETE /api/creators?id=X`** — Delete by ID
- **`POST /api/creators/refresh`** — SSE. Bulk refresh stats for all (or specified) creators.
- **`GET/POST/PUT/DELETE /api/configs`** — Config CRUD
- **`GET /api/proxy-image?url=X`** — Proxy TikTok CDN images to avoid CORS

**Files:** 6 route files in `app/src/app/api/`

---

### Step 9: Build UI Components and Layout

- shadcn/ui components (button, card, dialog, input, textarea, select, badge, tooltip, sidebar, dropdown-menu, separator, sheet, skeleton)
- `app-sidebar.tsx`: Navigation — Videos, Creators, Configs, Run Pipeline. TikTok-themed with the app name "TikTok AI"
- `top-bar.tsx`: Header
- `markdown-content.tsx`: Renders Gemini analysis and Claude concepts
- `pipeline-context.tsx`: React context for pipeline execution state
- `globals.css`: Design system (port from Instagram app, can adjust accent colors)
- `layout.tsx`: Root layout wrapping SidebarProvider, PipelineProvider, TooltipProvider

**Files:** Components, context, hooks, layout, globals.css

---

### Step 10: Build the Videos Page

Grid gallery matching Instagram app's design:
- 9:16 aspect ratio thumbnail cards (2-4 column responsive grid)
- Filter by: config name, creator
- Sort by: Most Plays, Date Posted, Date Added, Starred First
- Star/favorite toggle
- Modal detail view:
  - Thumbnail + metrics (plays, likes, comments, shares, saves, duration)
  - Analysis section (Gemini markdown output)
  - Concepts section (Claude markdown output)
  - External link to original TikTok (`webVideoUrl`)
- Count formatting: `formatCount(1234567)` → "1.2M"

**Files:** `app/src/app/videos/page.tsx`

---

### Step 11: Build the Creators Page

- Creator card grid (1-3 columns responsive)
- Cards show: profile pic, username, display name, followers, total hearts, total videos, verified badge
- Filter by category
- Add new creator dialog (username + category, auto-fetches stats)
- Edit/delete actions
- Individual refresh (spinner on card)
- Bulk "Refresh All" with streaming progress
- Link to TikTok profile (`https://www.tiktok.com/@username`)
- "View videos" → navigates to Videos page filtered by creator

**Files:** `app/src/app/creators/page.tsx`

---

### Step 12: Build the Configs Page

- Config cards with name, category, creator/video counts
- Create/edit dialog:
  - Config name (text input)
  - Creators category (text input)
  - Analysis instruction (large textarea)
  - New concepts instruction (large textarea)
- Collapsible prompt preview on cards
- Delete with confirmation
- Pre-seeded "Bella Glow" config uses the prompts from Brand Persona section

**Files:** `app/src/app/configs/page.tsx`

---

### Step 13: Build the Run Pipeline Page

- Config dropdown selector
- Parameters:
  - Max Videos per Creator: 1-100 (default 20)
  - Top K to Analyze: 1-10 (default 3)
  - Days Lookback: 1-365 (default 30)
- Start button (disabled while running)
- Real-time progress:
  - Phase indicator badge (Scraping → Analyzing → Done)
  - Progress counters: "Creators: 3/5", "Videos: 2/15"
  - Progress bar with color coding
  - Active tasks list (which video/creator is being processed)
  - Collapsible error section
  - Terminal-style scrolling log

**Files:** `app/src/app/run/page.tsx`

---

### Step 14: Test End-to-End

- `cd app && npm run dev`
- Verify seeded creators and "Bella Glow" config appear
- Run pipeline: select "Bella Glow" config, top K = 1, max videos = 3, days = 30
- Verify full flow: scrape → download → Gemini analysis → Claude concepts → results in Videos page
- Test: add a new creator, refresh stats, delete a creator
- Test: create new config, edit prompts, delete config
- Test: star a video, filter/sort on Videos page
- Fix any bugs found

**Files:** Potentially any

---

### Step 15: Update CLAUDE.md

Add:
- TikTok AI app section with structure overview
- How to run: `cd app && npm run dev` → `http://localhost:3000`
- Required env vars: `APIFY_API_TOKEN`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
- Relationship to Instagram Social Media AI repo
- Brand persona context

**Files:** `CLAUDE.md`

---

## Connections & Dependencies

### Files That Reference This Area
- `CLAUDE.md` — needs update
- `.env` — shared API keys (already has all 3)
- `Viral TikToks.json` — read-only reference

### Impact on Existing Workflows
- No impact on existing `/prime`, `/create-plan`, `/implement` commands
- App lives in `app/`, fully self-contained
- Shares `.env` with workspace root

---

## Validation Checklist

- [ ] `cd app && npm run dev` starts without errors
- [ ] Seeded creators (5) appear on Creators page with correct stats
- [ ] "Bella Glow" config appears on Configs page with prompts
- [ ] Can add/edit/delete creators
- [ ] Can refresh individual creator stats (Apify call works)
- [ ] Can bulk refresh all creators
- [ ] Can create/edit/delete configs
- [ ] Pipeline scrapes TikTok videos via Apify
- [ ] Pipeline downloads videos from Apify KV store
- [ ] Pipeline uploads and analyzes with Gemini (with retry on rate limit)
- [ ] Pipeline generates concepts with Claude
- [ ] Pipeline streams real-time progress to UI
- [ ] Analyzed videos appear on Videos page with analysis + concepts
- [ ] Filter by config and creator works
- [ ] Sort by plays/date/starred works
- [ ] Star toggle persists
- [ ] Detail modal shows full analysis + concepts in markdown
- [ ] TikTok external links work
- [ ] CLAUDE.md updated

---

## Success Criteria

1. A user can add TikTok creators, run the pipeline, and browse analyzed viral content with AI-generated concepts — full end-to-end workflow
2. All 4 pages (Videos, Creators, Configs, Run) are functional and match Instagram app capabilities
3. The Apify → Gemini → Claude pipeline executes without manual intervention, handling rate limits gracefully
4. App ships with working seed data (5 creators + "Bella Glow" config) — usable immediately after `npm run dev`

---

## Notes

- TikTok uses "plays" (`playCount`) not "views" — UI labels reflect this
- TikTok has "shares" and "saves" (`collectCount`) as key engagement signals — both displayed in UI
- `isSlideshow: true` videos are photo carousels — skip these during scraping (no video to analyze)
- ASR subtitle transcripts in `videoMeta.subtitleLinks` could be used as supplementary data in future
- `musicMeta` could enable sound/trend analysis in future
- Gemini free tier: ~1,500 requests/day, 4M tokens/day. At 2 concurrent workers the pipeline should be fine for normal usage
- Future: could add hashtag trending analysis, cross-platform comparison with Instagram app
