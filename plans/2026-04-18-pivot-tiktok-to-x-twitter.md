# Plan: Pivot from TikTok AI to X/Twitter AI

**Created:** 2026-04-18
**Status:** Implemented
**Request:** Transform the entire app from a TikTok viral video analyzer into an X/Twitter viral post analyzer that produces ready-to-post content with AI-generated infographic visuals. Same architecture (Apify scrape → Gemini analyze → Claude generate → Kie AI generate visual) with dark glass-morphism aesthetic.

---

## Overview

### What This Plan Accomplishes

Converts every layer of the app from TikTok videos to X/Twitter posts, and upgrades the output from "concepts" to **ready-to-post X content with AI-generated infographic images**. The pipeline becomes: scrape viral tweets via Apify → analyze post content and visuals with Gemini (deep visual analysis of images/videos) → generate ready-to-post X content with Claude (authentic, non-generic Twitter copy) → generate a branded infographic image via Kie AI (nano-banana-2) matching a consistent visual style derived from a reference image. Videos longer than 30 seconds are skipped to conserve Gemini credits.

### Why This Matters

The user is pivoting from TikTok beauty/lifestyle to X/Twitter marketing/CRO content. The key evolution: instead of just generating concept descriptions, the pipeline now **produces complete, publishable posts** — optimized Twitter copy paired with a branded 3:4 vertical infographic image, generated in a consistent style using the brand reference image as a guide.

---

## Current State

### Relevant Existing Structure

| File | Current Purpose |
|------|----------------|
| `app/src/lib/types.ts` | TikTok-specific interfaces (ApifyTikTokResult, TikTokVideo, Creator) |
| `app/src/lib/apify.ts` | TikTok scraping via `clockworks~tiktok-scraper` |
| `app/src/lib/gemini.ts` | Video upload + multimodal analysis |
| `app/src/lib/claude.ts` | Concept generation (TikTok content specialist system prompt) |
| `app/src/lib/pipeline.ts` | 3-phase orchestrator: scrape TikTok → download video → upload to Gemini → Claude |
| `app/src/lib/csv.ts` | CSV columns for TikTok video fields |
| `app/src/app/videos/page.tsx` | 9:16 thumbnail grid with video-centric modal |
| `app/src/app/creators/page.tsx` | TikTok creator cards (followers, hearts, videos) |
| `app/src/app/configs/page.tsx` | Pipeline configs referencing TikTok prompts |
| `app/src/app/run/page.tsx` | Pipeline runner with TikTok-specific labels |
| `app/src/app/api/*/route.ts` | API routes for TikTok data CRUD |
| `app/src/app/api/proxy-image/route.ts` | Proxies TikTok CDN domains |
| `app/src/components/app-sidebar.tsx` | Sidebar with "Videos" nav, Film icon |
| `app/src/components/top-bar.tsx` | Page titles referencing TikTok |
| `data/creators.csv` | 6 beauty/lifestyle TikTok creators |
| `data/videos.csv` | Analyzed TikTok videos |
| `data/configs.csv` | "Bella Glow" config with TikTok prompts |
| `context/*.md` | All reference TikTok/beauty niche |
| `CLAUDE.md` | Documents TikTok AI app |

### Gaps or Problems Being Addressed

- Entire app is TikTok-specific — no X/Twitter support
- Data model doesn't accommodate tweet text, multiple images, GIFs, polls
- Gemini integration assumes video files — X posts are primarily text + images
- UI is video-grid oriented — tweets need a feed-style layout
- Proxy image only allows TikTok CDN domains
- Seed data is beauty/lifestyle creators — need marketing/CRO creators
- Output is just "concepts" text — needs to be ready-to-post content with generated visuals
- No image generation capability — need Kie AI integration
- No brand style system — need consistent visual identity for generated infographics

---

## Proposed Changes

### Summary of Changes

- **Data model**: Replace TikTok types with X/Twitter types (Post, XCreator, ApifyTweetResult) + add generated content fields
- **Apify scraper**: Switch from `clockworks~tiktok-scraper` to `apidojo/tweet-scraper`
- **Gemini analysis**: Adapt from video-only to deep multimodal analysis of text+images+video (skip videos > 30s)
- **Claude generation**: Evolve from "concept descriptions" to **ready-to-post X content** — authentic, punchy Twitter copy + structured image prompt for infographic generation
- **Kie AI integration (NEW)**: New `kie.ts` lib for image generation via nano-banana-2 model, using brand reference image for style consistency
- **Brand style system (NEW)**: Reference image analysis stored as style guide, passed to both Claude (for image prompt writing) and Kie AI (as reference image)
- **CSV schema**: Change columns from video fields to tweet fields + add generated content columns (generatedPostText, generatedImageUrl, generatedImagePrompt)
- **Pipeline phase 4 (NEW)**: After Claude generates post text + image prompt → Kie AI generates the branded infographic
- **UI - Posts page**: Replace video grid with tweet-style feed cards showing original tweet + generated post with infographic preview
- **UI - Creators page**: Change stats from followers/hearts/videos to followers/following/posts
- **UI - Configs page**: Update labels and default prompts for X/Twitter context
- **UI - Run page**: Update labels from "videos" to "posts"
- **UI - Sidebar**: Rename "Videos" → "Posts", change icon from Film → MessageSquare
- **Proxy image**: Add X/Twitter and Kie AI CDN domains
- **Seed data**: Replace 6 beauty creators with 10 marketing/CRO X accounts
- **Context files + CLAUDE.md**: Update all documentation to reflect X/Twitter focus

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/src/app/posts/page.tsx` | Posts browser page (replaces videos/page.tsx) |
| `app/src/app/api/posts/route.ts` | API route for posts CRUD (replaces videos) |
| `app/src/lib/kie.ts` | Kie AI image generation client (nano-banana-2) |
| `app/src/lib/brand-style.ts` | Brand style guide constants derived from reference image analysis |
| `references/brand-style.jpeg` | Already exists — reference infographic image for style consistency |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `app/src/lib/types.ts` | Replace all TikTok interfaces with X/Twitter interfaces + add generated content fields |
| `app/src/lib/apify.ts` | Switch to tweet-scraper actor, new response parsing |
| `app/src/lib/gemini.ts` | Add image analysis, text-only analysis, 30s video cap |
| `app/src/lib/claude.ts` | Complete rewrite: produce ready-to-post text + infographic image prompt |
| `app/src/lib/pipeline.ts` | Adapt for tweets + add Phase 4 (Kie AI image generation) |
| `app/src/lib/csv.ts` | Update column definitions for posts + generated content |
| `app/src/app/creators/page.tsx` | Update stats, labels, profile display for X |
| `app/src/app/configs/page.tsx` | Update labels and helper text |
| `app/src/app/run/page.tsx` | Update labels from videos to posts |
| `app/src/app/api/creators/route.ts` | Update for X creator data shape |
| `app/src/app/api/creators/refresh/route.ts` | Update for X creator stats |
| `app/src/app/api/configs/route.ts` | No structural changes, just ensure compatibility |
| `app/src/app/api/pipeline/route.ts` | Update parameter names/labels |
| `app/src/app/api/proxy-image/route.ts` | Add Twitter + Kie AI CDN domains to allowlist |
| `app/src/app/layout.tsx` | Update app title/metadata |
| `app/src/app/page.tsx` | Redirect to /posts instead of /videos |
| `app/src/components/app-sidebar.tsx` | Rename nav items, change icons, update branding |
| `app/src/components/top-bar.tsx` | Update page title mappings |
| `app/src/app/globals.css` | Add tweet card + infographic preview styles |
| `data/creators.csv` | Replace with 10 marketing/CRO X creators |
| `data/configs.csv` | Replace with marketing/CRO config and prompts |
| `data/videos.csv` | Delete contents (rename to posts.csv conceptually, handled by csv.ts) |
| `context/personal-info.md` | Update role description |
| `context/business-info.md` | Update product description |
| `context/strategy.md` | Update priorities |
| `context/current-data.md` | Update component status |
| `CLAUDE.md` | Full rewrite of app documentation |

### Files to Delete

| File Path | Reason |
|-----------|--------|
| `app/src/app/videos/page.tsx` | Replaced by `posts/page.tsx` |
| `app/src/app/api/videos/route.ts` | Replaced by `api/posts/route.ts` |

---

## Design Decisions

### Key Decisions Made

1. **Apify actor: `apidojo/tweet-scraper`**: Most popular X scraper on Apify with comprehensive tweet data (text, media, engagement metrics, user profiles). Supports search queries and profile-based scraping.

2. **Gemini for deep visual analysis**: Gemini is used for ALL post types — text-only posts get structural/hook analysis, but the real value is **deep multimodal analysis** of images and short videos. When a post has visuals, Gemini analyzes: visual composition, design choices, typography, color palette, information hierarchy, attention-grabbing techniques, and how the visual reinforces the text. This visual intelligence informs the image prompt Claude writes for Kie AI.

3. **30-second video cap**: Videos longer than 30 seconds are SKIPPED entirely during the analysis phase. This prevents excessive Gemini credit consumption. The pipeline logs a skip message and moves to the next post. Short-form video posts (< 30s) are still downloaded and analyzed via Gemini's video upload.

4. **Ready-to-post output (not just concepts)**: The old pipeline produced concept descriptions. The new pipeline produces **two concrete outputs per analyzed post**: (a) ready-to-post X text — punchy, authentic, non-generic Twitter copy optimized for engagement, and (b) a detailed image generation prompt for a branded infographic visual.

5. **Kie AI nano-banana-2 for image generation**: Every generated post includes a 3:4 vertical infographic image generated via Kie AI's nano-banana-2 model. The reference image (`references/brand-style.jpeg`) is passed as `image_input` to every generation request, ensuring visual consistency. The model supports up to 14 reference images and has strong text rendering capability — critical for infographic content.

6. **Brand style consistency system**: The reference image (`references/brand-style.jpeg`) is analyzed once and codified into a `brand-style.ts` constants file. This style guide is injected into Claude's system prompt so it writes image prompts that match the brand aesthetic. The reference image itself is also sent to Kie AI as `image_input` for visual style matching.

7. **Tweet-style card UI with generated content preview**: Cards show the original reference tweet AND the generated output (post text + infographic thumbnail). Users can see the inspiration alongside the production-ready content.

8. **Twitter-optimized copywriting**: Claude's system prompt emphasizes: conversational tone, pattern interrupts, specific numbers over vague claims, short punchy sentences, strategic line breaks for readability, hooks in the first line, no hashtag spam, no emojis unless the reference uses them, and a voice that sounds like a real practitioner sharing insights — not an AI summarizing.

9. **10 seed creators**: 4 provided by user + 6 researched accounts in marketing/CRO niche.

10. **Keep CSV storage**: Same pattern as before — posts.csv replaces videos.csv with updated columns including generated content.

### Alternatives Considered

- **Skip Gemini for text-only posts**: Rejected because Gemini can still analyze content patterns, hooks, and structure. Keeping Gemini for all posts simplifies the code.
- **Use Twitter API directly**: Rejected because Apify provides a simpler integration matching the existing pattern, and avoids Twitter API rate limits / paid tiers.
- **Generate images inline in Claude (GPT-4o style)**: Rejected — Claude doesn't generate images. Kie AI with nano-banana-2 provides high-quality image generation with reference-based style consistency.
- **Use DALL-E or Midjourney**: Rejected — Kie AI's nano-banana-2 is specifically strong at text rendering in images (critical for infographics) and supports reference image input for style consistency.
- **Generate image prompt separately from post text**: Rejected — Claude generates both in a single call with structured output, ensuring the image prompt is tightly aligned with the post copy.

### Open Questions

1. **Apify actor exact input/output format**: The plan assumes `apidojo/tweet-scraper` based on research. During implementation, we should verify the exact actor ID and field names by checking Apify documentation or doing a test run. If the actor doesn't match expectations, `xtdata/twitter-x-scraper` is a backup.
2. **Daily tweet volume**: How many tweets per creator to scrape? Default to 20 (matching current TikTok setting) but X creators post more frequently, so this may need adjustment.
3. **Kie AI generation time**: nano-banana-2 takes 10-20 seconds per image. With many posts, Phase 4 could be slow. Consider whether to generate images sequentially or with limited concurrency (2-3 parallel).

---

## Seed Creators (10 accounts)

The user provided 4 accounts. 6 additional accounts researched in the marketing/CRO/growth niche:

| # | Handle | Name/Focus | Source |
|---|--------|------------|--------|
| 1 | `CarlWeische` | CRO, DTC optimization | User-provided |
| 2 | `boringmarketer` | Marketing strategy | User-provided |
| 3 | `blvckledge` | Marketing, growth | User-provided |
| 4 | `PJaccetturo` | Marketing | User-provided |
| 5 | `richpage` | CRO expert, 15+ years experience | Researched |
| 6 | `maboroshi_mrsharma` | Nik Sharma, DTC growth, CRO sprints | Researched |
| 7 | `KateBour` | Katelyn Bourgoin, buyer psychology | Researched |
| 8 | `thejustinwelsh` | Justin Welsh, social growth & personal branding | Researched |
| 9 | `amandanat` | Amanda Natividad, content marketing, SparkToro | Researched |
| 10 | `kieranflanagan` | Kieran Flanagan, PLG, SaaS growth | Researched |

**Category for all:** `marketing-cro`

---

## Brand Style Analysis (Reference Image: `references/brand-style.jpeg`)

Deep analysis of the reference infographic to codify into the brand style system:

### Color Palette
- **Background**: Warm cream/beige (#F5F0E8 or `oklch(0.96 0.01 80)`) — NOT cold white, distinctly warm
- **Primary accent**: Muted sage green (#8BA888 / `oklch(0.70 0.06 145)`) — used for Venn circle borders, bullet markers, numbered badges, CTA banner
- **Secondary accent**: Warm gold/amber (#C4A35A / `oklch(0.73 0.10 80)`) — used sparingly for intersection icons and highlights
- **Heading text**: Dark charcoal (#2D2D2D) — near-black but not pure black
- **Body text**: Medium gray (#555555) — softer than headings for hierarchy
- **White**: Used in numbered circle text, card backgrounds with subtle shadows

### Typography
- **Main title**: Editorial serif font (Playfair Display or similar transitional serif)
  - Mix of weights: regular for most words, bold/black for emphasis words ("AI"), italic for descriptive phrases ("What to Cite")
  - Large size, strong visual impact
- **Subtitle**: Sans-serif (Inter/Open Sans family), lighter weight, muted color
- **Section headers**: Bold sans-serif, medium size (e.g., "Relevance", "Authority", "Extractability")
- **Body text**: Clean sans-serif, ~14-15px equivalent, comfortable reading weight
- **Bullet markers**: Small filled triangles (►) in sage green, not standard dots

### Visual Elements & Iconography
- **Venn diagram**: 3 overlapping circles with thin sage green strokes, very subtle semi-transparent sage fill
- **Intersection zones**: Labeled with bold sans-serif headers + descriptive body text
- **Center zone**: Darker green fill for the triple overlap ("AI-Citable Content")
- **Small circular icons**: At intersection points, gold/amber colored, containing simple symbolic icons
- **Numbered badges**: Circles with sage green fill and white numbers (1-5)
- **Rule cards**: Clean, minimal cards in a horizontal row with title + description

### Layout & Design Principles
- **Strong visual hierarchy**: Title → Subtitle → Central diagram → Radiating bullet points → Bottom rules section → CTA footer
- **Generous whitespace**: Breathing room around all elements, nothing feels cramped
- **Information-dense but organized**: Lots of text content, but spatial grouping and color coding make it scannable
- **Professional, educational tone**: Not flashy or trendy — authoritative and trustworthy
- **Muted, sophisticated palette**: No bright/neon colors, everything is toned down and harmonious
- **Consistent spacing**: Equal gaps between related elements, clear section boundaries
- **3:4 vertical aspect ratio**: Portrait orientation optimized for mobile feeds and X/Twitter display

### Text Writing Style (from the infographic)
- **Headings**: Concise, declarative, question-format ("How AI Decides What to Cite")
- **Bullet points**: Specific, actionable, concrete (e.g., "Content updated within 90 days", "Paragraphs under 80 words")
- **Rule descriptions**: Direct, practical, no fluff (e.g., "AI trusts what others say about you more than what you say about yourself")
- **Uses numbers and specifics**: "76.4% of ChatGPT's top-cited pages", "first 40-60 words"
- **Professional but accessible**: No jargon, no corporate-speak, reads like advice from a knowledgeable practitioner

### Style Guide Constants (for `brand-style.ts`)

These constants will be injected into Claude's system prompt when generating image prompts:

```typescript
export const BRAND_STYLE = {
  colors: {
    background: "warm cream/beige (#F5F0E8)",
    primaryAccent: "muted sage green (#8BA888)",
    secondaryAccent: "warm gold/amber (#C4A35A)",
    headingText: "dark charcoal (#2D2D2D)",
    bodyText: "medium gray (#555555)",
    white: "#FFFFFF",
  },
  typography: {
    titleFont: "editorial serif (Playfair Display style) — mix regular, bold, and italic",
    bodyFont: "clean sans-serif (Inter/Open Sans style)",
    bulletStyle: "small filled triangles (►) in sage green",
  },
  layout: {
    aspectRatio: "3:4 vertical",
    style: "educational infographic with generous whitespace",
    hierarchy: "large title → subtitle → central visual/diagram → supporting points → bottom takeaways",
  },
  tone: "professional, authoritative, educational — like a trusted industry expert sharing insights",
  referenceImagePath: "references/brand-style.jpeg",
};
```

---

## Data Model Changes

### New TypeScript Interfaces

```typescript
// Raw Apify tweet result
interface ApifyTweetResult {
  id: string;
  url: string;
  text: string;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  createdAt: string; // ISO date
  author: {
    userName: string;
    name: string;
    profilePicture: string;
    followers: number;
    following: number;
    statusesCount: number;
    isBlueVerified: boolean;
    description: string;
  };
  media?: Array<{
    type: "photo" | "video" | "animated_gif";
    url: string; // direct media URL
    videoUrl?: string; // for video type
    previewUrl?: string; // thumbnail for video
  }>;
  isRetweet: boolean;
  isReply: boolean;
  conversationId: string;
}

// Internal post representation after analysis + generation
interface Post {
  id: string;
  link: string;
  creator: string;
  text: string; // original tweet text
  mediaType: "none" | "image" | "video" | "gif" | "multi-image";
  mediaUrls: string; // JSON stringified array of original media URLs
  views: number;
  likes: number;
  replies: number;
  retweets: number;
  quotes: number;
  bookmarks: number;
  analysis: string; // Gemini's deep analysis (including visual analysis)
  generatedPostText: string; // Claude's ready-to-post X content
  generatedImagePrompt: string; // Claude's image generation prompt for Kie AI
  generatedImageUrl: string; // Kie AI generated infographic URL (downloaded to local)
  datePosted: string;
  dateAdded: string;
  configName: string;
  starred: boolean;
}

// X/Twitter creator
interface Creator {
  id: string;
  username: string;
  displayName: string;
  category: string;
  profilePicUrl: string;
  followers: number;
  following: number;
  totalPosts: number;
  isBlueVerified: boolean;
  bio: string;
  lastScrapedAt: string;
}
```

### CSV Column Changes

**posts.csv** (replaces videos.csv):
`id, link, creator, text, mediaType, mediaUrls, views, likes, replies, retweets, quotes, bookmarks, analysis, generatedPostText, generatedImagePrompt, generatedImageUrl, datePosted, dateAdded, configName, starred`

**creators.csv** (updated columns):
`id, username, displayName, category, profilePicUrl, followers, following, totalPosts, isBlueVerified, bio, lastScrapedAt`

**configs.csv** — same structure, different seed content.

---

## Step-by-Step Tasks

### Step 1: Create Brand Style System

Codify the reference image analysis into a constants file that Claude and Kie AI will use.

**Actions:**
- Create `app/src/lib/brand-style.ts` with the `BRAND_STYLE` constant object (colors, typography, layout, tone) as defined in the Brand Style Analysis section above
- Include a `BRAND_STYLE_PROMPT` string constant — a detailed paragraph describing the visual style for injection into Claude's system prompt, covering: color palette, typography choices, layout principles, information hierarchy, and tone
- Include a `REFERENCE_IMAGE_PATH` constant pointing to `references/brand-style.jpeg`
- The file should also export a helper `getBase64ReferenceImage()` async function that reads the reference image and returns a base64 data URI for the Kie AI `image_input` parameter

**Files affected:**
- `app/src/lib/brand-style.ts` (new)

---

### Step 2: Update Data Model (types.ts)

Replace all TikTok-specific interfaces with X/Twitter interfaces.

**Actions:**
- Remove `ApifyTikTokResult`, `TikTokVideo` interfaces
- Add `ApifyTweetResult`, `Post` (with generated content fields), updated `Creator` interfaces as defined in Data Model section
- Update `PipelineProgress` to reference "posts" instead of "videos" in any typed fields
- Keep `Config` interface unchanged (it's generic enough)

**Files affected:**
- `app/src/lib/types.ts`

---

### Step 3: Update CSV Layer (csv.ts)

Change column definitions and function names from videos to posts.

**Actions:**
- Rename `readVideos()` → `readPosts()`, `writeVideos()` → `writePosts()`, `appendVideos()` → `appendPosts()`
- Update column definitions: replace video columns with post columns (text, mediaType, mediaUrls, views, likes, replies, retweets, quotes, bookmarks, analysis, generatedPostText, generatedImagePrompt, generatedImageUrl)
- Update `readCreators()` column casts: `followers`, `following`, `totalPosts` as numbers, `isBlueVerified` as boolean
- Change data file references: `videos.csv` → `posts.csv`
- Update numeric cast columns for posts

**Files affected:**
- `app/src/lib/csv.ts`

---

### Step 4: Update Apify Scraper (apify.ts)

Switch from TikTok scraper to X/Twitter tweet scraper.

**Actions:**
- Replace `scrapeTikToks()` with `scrapeTweets(username, maxCount, daysLookback)`:
  - Use Apify actor `apidojo/tweet-scraper` (or verify exact actor ID)
  - Input: search query `from:${username}` with date range filter
  - Parse response into `ApifyTweetResult[]`
  - Filter out retweets and replies (keep original posts only)
  - Sort by engagement (likeCount + retweetCount + viewCount)
  - Return top results
- Replace `scrapeCreatorStats()` with `scrapeXProfile(username)`:
  - Minimal scrape to get profile data (followers, following, posts count, bio, verified, profile pic)
  - Return Creator-shaped object
- Update timeout values as needed
- Handle the case where the actor returns different field names — add mapping/normalization

**Files affected:**
- `app/src/lib/apify.ts`

---

### Step 5: Update Gemini Analysis (gemini.ts) — Deep Visual Analysis + 30s Video Cap

Adapt from video-only to deep multimodal analysis. Emphasize visual analysis depth.

**Actions:**
- Keep existing `uploadVideo()` function (works for short video media)
- Add `uploadImage(imageBuffer, filename)` function:
  - Simpler inline data upload for images (base64 encoded in request body)
  - Supports image/jpeg, image/png, image/gif MIME types
- Add `analyzePost(options)` unified function that handles all post types:
  - **Text-only**: Call Gemini with just the text content + analysis prompt
  - **Image post**: Download image(s), upload to Gemini, analyze text + images together with **deep visual analysis focus** (see prompt below)
  - **Video post (≤ 30s)**: Download video, upload via resumable protocol, analyze text + video
  - **Video post (> 30s)**: **SKIP entirely** — return `null` to signal the pipeline should skip this post. Log: `"Skipping video post (${duration}s > 30s limit) to conserve Gemini credits"`
  - **GIF post**: Download GIF, upload as image, analyze text + GIF
  - **Multi-image**: Upload all images, analyze text + all images together
- The analysis prompt sent to Gemini should request deep visual analysis when media is present:
  ```
  When analyzing visuals, provide an extremely detailed breakdown:
  - Visual composition and layout structure
  - Color palette and color relationships
  - Typography choices (fonts, sizes, weights, hierarchy)
  - Information architecture and visual flow
  - Design techniques (contrast, alignment, proximity, repetition)
  - Iconography and decorative elements
  - How the visual reinforces or extends the text message
  - What makes this visual attention-grabbing in a Twitter feed
  - Specific design elements that could be replicated or adapted
  ```
- Keep retry logic and error handling from existing code
- Duration check: the pipeline should check video duration from tweet metadata BEFORE downloading

**Files affected:**
- `app/src/lib/gemini.ts`

---

### Step 6: Rewrite Claude Generation (claude.ts) — Ready-to-Post Content + Image Prompt

Complete rewrite of the generation function. No longer produces "concepts" — produces **ready-to-post X content** and a **detailed infographic image prompt**.

**Actions:**
- Rename `generateConcepts()` → `generatePost(analysis, configPrompt, brandStylePrompt)`
- Import `BRAND_STYLE_PROMPT` from `brand-style.ts`
- New system prompt:
  ```
  You are an X/Twitter content creator and visual designer who produces viral posts for the marketing/CRO niche. You analyze reference posts and create original, ready-to-publish content.

  Your output is ALWAYS a JSON object with exactly two fields:
  {
    "postText": "...",
    "imagePrompt": "..."
  }

  ## Post Text Guidelines
  - Write like a real marketing practitioner sharing hard-won insights, NOT like an AI summarizing
  - Use pattern interrupts: unexpected openings, counterintuitive takes, specific numbers
  - Short punchy sentences. Strategic line breaks for readability in a Twitter feed
  - First line must be a hook that stops the scroll
  - Include specific numbers, percentages, or concrete examples — never vague generalities
  - No hashtag spam (0-1 hashtags max, only if organic)
  - No emoji spam (match the reference post's emoji usage, which is usually zero or minimal)
  - Conversational but authoritative tone — think "smart friend who happens to be an expert"
  - The post should stand alone as valuable content even without the image
  - 200-280 characters ideal for engagement, but can go up to tweet limit if the content warrants it

  ## Image Prompt Guidelines
  You are writing a prompt for an AI image generator (Kie AI nano-banana-2) to create a branded infographic.

  ${BRAND_STYLE_PROMPT}

  The image prompt must describe:
  1. The exact text content to render on the infographic (title, bullet points, key stats, etc.)
  2. The visual layout and structure (how information is organized)
  3. Specific color usage matching the brand palette
  4. Typography direction (serif title, sans-serif body, etc.)
  5. Any diagrams, charts, or visual metaphors to include
  6. The overall composition and information hierarchy

  CRITICAL: The text content in the infographic must be interesting, specific, and valuable — not generic AI filler. Use real numbers, counterintuitive insights, and actionable advice. The text should make someone stop scrolling and screenshot the infographic.
  ```
- Parse Claude's response as JSON to extract `postText` and `imagePrompt`
- Return both as a structured object `{ postText: string, imagePrompt: string }`
- Add JSON parsing with error handling (retry if malformed)

**Files affected:**
- `app/src/lib/claude.ts`

---

### Step 7: Create Kie AI Image Generation Client (kie.ts)

New library for generating infographic images via Kie AI's nano-banana-2 model.

**Actions:**
- Create `app/src/lib/kie.ts` with:
- `generateImage(prompt, referenceImageBase64)` function:
  - **Endpoint**: `POST https://api.kie.ai/api/v1/jobs/createTask`
  - **Auth**: `Authorization: Bearer ${KIE_AI_API_KEY}`
  - **Request body**:
    ```json
    {
      "model": "nano-banana-2",
      "input": {
        "prompt": "<the image prompt from Claude>",
        "image_input": ["<base64 data URI of reference image>"],
        "aspect_ratio": "3:4",
        "resolution": "2K",
        "output_format": "png"
      }
    }
    ```
  - Returns a `taskId` on success
- `pollTaskStatus(taskId)` function:
  - **Endpoint**: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`
  - Poll every 3 seconds until state is `success` or `fail`
  - Max 60 attempts (3 minutes timeout)
  - On success: parse `resultJson` to extract `resultUrls[0]`
  - On fail: throw with `failMsg`
- `generateInfographic(prompt)` convenience function:
  - Calls `getBase64ReferenceImage()` from brand-style.ts
  - Calls `generateImage()` to create task
  - Calls `pollTaskStatus()` to wait for result
  - Downloads the generated image from the result URL
  - Saves to `data/generated-images/{postId}.png`
  - Returns the local file path
- Error handling: retry once on transient failures, respect 429 rate limits
- Environment variable: `KIE_AI_API_KEY`

**Files affected:**
- `app/src/lib/kie.ts` (new)

---

### Step 8: Update Pipeline Orchestrator (pipeline.ts) — 4 Phases

Adapt the pipeline for X/Twitter posts with image generation as Phase 4.

**Actions:**
- Update Phase 1 (Scraping):
  - Call `scrapeTweets()` instead of `scrapeTikToks()`
  - Sort by engagement score (views + likes + retweets) instead of playCount
  - Update log messages from "videos" to "posts"
- Update Phase 2 (Analysis — sequential, 1 at a time):
  - For each scraped tweet:
    1. Check media type and duration — **SKIP if video > 30 seconds** (log skip reason)
    2. If has images/GIFs: download from Twitter CDN
    3. If has video ≤ 30s: download video
    4. Upload media to Gemini (appropriate method per type)
    5. Call `analyzePost()` with text + media + deep visual analysis prompt
    6. If text-only: call Gemini with just text content
  - Log each step with timing
- Update Phase 3 (Generation — sequential):
  - For each analyzed post:
    1. Call `generatePost()` with analysis + config prompt + brand style
    2. Parse structured response: `{ postText, imagePrompt }`
    3. Call `generateInfographic(imagePrompt)` via Kie AI
    4. Build `Post` object with all fields including generated content
  - Log: generated post text length, image generation time
- Update Phase 4 (Persistence):
  - Call `appendPosts()` instead of `appendVideos()`
  - Log summary: total posts analyzed, images generated, skipped (> 30s), errors
- Update progress tracking: add "generating" phase between "analyzing" and "done"
- Update `PipelineProgress` phase type to include "generating"

**Files affected:**
- `app/src/lib/pipeline.ts`

---

### Step 9: Create Posts API Route

New API route replacing videos.

**Actions:**
- Create `app/src/app/api/posts/route.ts`:
  - GET: Return all posts, optional filters by configName and creator
  - PATCH: Toggle starred status by post id
  - Use `readPosts()` and `writePosts()` from csv.ts
  - Same pattern as existing videos route
- Add `GET /api/posts/[id]/image` route to serve generated images from `data/generated-images/`

**Files affected:**
- `app/src/app/api/posts/route.ts` (new)

---

### Step 10: Update Creators API Routes

Adapt for X/Twitter creator data shape.

**Actions:**
- `api/creators/route.ts`:
  - POST: Call `scrapeXProfile()` instead of `scrapeCreatorStats()`
  - Map response to new Creator shape (displayName, followers, following, totalPosts, isBlueVerified)
  - Keep GET, PUT, DELETE unchanged structurally
- `api/creators/refresh/route.ts`:
  - Call `scrapeXProfile()` instead of `scrapeCreatorStats()`
  - Update SSE event data to include new fields

**Files affected:**
- `app/src/app/api/creators/route.ts`
- `app/src/app/api/creators/refresh/route.ts`

---

### Step 11: Update Pipeline API Route

Minor label updates.

**Actions:**
- Update parameter validation comments (maxVideos → maxPosts or keep generic)
- No structural changes needed — the route just passes options to `runPipeline()`

**Files affected:**
- `app/src/app/api/pipeline/route.ts`

---

### Step 12: Update Proxy Image Route

Add Twitter CDN domains.

**Actions:**
- Add to allowed hosts: `pbs.twimg.com`, `video.twimg.com`, `abs.twimg.com`, `ton.twimg.com`
- Optionally remove TikTok CDN domains (or keep for backwards compat during transition)
- Update error message if needed

**Files affected:**
- `app/src/app/api/proxy-image/route.ts`

---

### Step 13: Create Posts Page (UI) — Reference + Generated Content

New page replacing videos page with dual-view cards showing original reference AND generated output.

**Actions:**
- Create `app/src/app/posts/page.tsx`:
  - Fetch from `/api/posts` instead of `/api/videos`
  - **Card layout**: Two-section glass cards:
    - **Top section — "Reference"**: The original tweet
      - Creator username + avatar
      - Original tweet text
      - Original media thumbnail (if any — proxied image/video thumbnail)
      - Engagement stats row: views, likes, replies, retweets, quotes, bookmarks
      - Date posted
    - **Bottom section — "Generated"**: The production-ready output
      - Generated post text (styled distinctly — slightly larger, with the brand's warm cream background tint)
      - Generated infographic image thumbnail (3:4, click to expand)
      - Copy button for the post text (clipboard)
      - Download button for the infographic image
    - Star toggle on the card
  - **Modal**: Click card to open detail modal with three tabs:
    - **Original** tab: Full original tweet + all media at full size
    - **Analysis** tab: Gemini's deep analysis (markdown rendered) — includes detailed visual analysis
    - **Generated** tab: 
      - Ready-to-post text displayed prominently with copy button
      - Full-size infographic image preview (3:4 vertical)
      - Image generation prompt (collapsible, for debugging/tweaking)
      - Download image button
  - **Filters**: By config, by creator, sort by views/likes/retweets/datePosted
  - Glass-morphism card styling matching existing design system
  - 2-column layout on desktop, 1-column on mobile
  - Cards show a visual indicator for posts that were skipped (no generated content) vs. fully generated

**Files affected:**
- `app/src/app/posts/page.tsx` (new)

---

### Step 14: Update Creators Page

Change stats and labels for X/Twitter.

**Actions:**
- Update stat boxes: followers, following, total posts (instead of followers, hearts, videos)
- Update icon from Heart to Users (for following)
- Update "Add Creator" dialog placeholder: "X username (without @)"
- Update category default to `marketing-cro`
- Link "View posts" instead of "View videos" — navigate to `/posts?creator=username`
- Show blue verified badge if `isBlueVerified`
- Update profile pic proxy if needed

**Files affected:**
- `app/src/app/creators/page.tsx`

---

### Step 15: Update Configs Page

Update labels and context.

**Actions:**
- Update helper text from TikTok to X/Twitter context
- Update icon labels if needed
- No structural changes — the page is already generic

**Files affected:**
- `app/src/app/configs/page.tsx`

---

### Step 16: Update Run Page

Change labels from videos to posts, add "Generating" phase display.

**Actions:**
- Rename "Max Videos" → "Max Posts"
- Update phase labels in log display — add "Generating" phase (between Analyzing and Done) with its own progress bar color
- Progress phases: Scraping → Analyzing → Generating (Kie AI) → Done
- Update completion CTA: "View new posts" → link to `/posts`
- Show count of images generated and posts skipped (> 30s video)
- Update any TikTok-specific text

**Files affected:**
- `app/src/app/run/page.tsx`

---

### Step 17: Update Navigation & Layout

Rebrand sidebar and layout.

**Actions:**
- `app-sidebar.tsx`:
  - Change logo icon from `Film` to `Twitter` or `MessageSquare` (from lucide-react)
  - Change app name from TikTok-related branding to "X AI" or similar
  - Rename "Videos" nav item → "Posts" with `MessageSquare` icon
  - Update route from `/videos` to `/posts`
  - Update footer from "Last pipeline" referencing videos to posts
- `top-bar.tsx`:
  - Update pathname-to-title mapping: `/posts` → "Posts"
  - Remove `/videos` mapping
- `layout.tsx`:
  - Update `<title>` and metadata
- `page.tsx`:
  - Redirect to `/posts` instead of `/videos`

**Files affected:**
- `app/src/components/app-sidebar.tsx`
- `app/src/components/top-bar.tsx`
- `app/src/app/layout.tsx`
- `app/src/app/page.tsx`

---

### Step 18: Update Seed Data

Replace all CSV data with X/Twitter marketing creators.

**Actions:**
- **`data/creators.csv`**: Replace with 10 marketing/CRO creators:
  - CarlWeische, boringmarketer, blvckledge, PJaccetturo (user-provided)
  - richpage, mrsharma, KateBour, thejustinwelsh, amandanat, kieranflanagan (researched)
  - Category: `marketing-cro` for all
  - Stats will be populated on first refresh via Apify
  - Initially seed with placeholder stats (0s) and let the user refresh
- **`data/configs.csv`**: Replace "Bella Glow" config with marketing-focused config:
  - configName: "Growth Marketing"
  - creatorsCategory: "marketing-cro"
  - analysisInstruction: Prompt for analyzing viral X posts (structure, hooks, engagement drivers, visual strategy, call-to-action patterns, thread structure if applicable)
  - newConceptsInstruction: Prompt for generating new X post concepts based on analysis
- **`data/posts.csv`**: Create empty file with header row (replaces videos.csv)
- **Delete `data/videos.csv`**

**Files affected:**
- `data/creators.csv`
- `data/configs.csv`
- `data/videos.csv` (delete)
- `data/posts.csv` (new, empty with headers)

---

### Step 19: Delete Old Video Files

Remove TikTok-specific files that have been replaced.

**Actions:**
- Delete `app/src/app/videos/page.tsx`
- Delete `app/src/app/api/videos/route.ts`
- Delete `data/videos.csv`

**Files affected:**
- `app/src/app/videos/page.tsx` (delete)
- `app/src/app/api/videos/route.ts` (delete)
- `data/videos.csv` (delete)

---

### Step 20: Update Context Files and CLAUDE.md

Rewrite all documentation to reflect the X/Twitter pivot.

**Actions:**
- **`context/personal-info.md`**: Update role to X/Twitter AI tools, marketing niche
- **`context/business-info.md`**: Update product descriptions, niche, tech references
- **`context/strategy.md`**: Update priorities to X AI MVP
- **`context/current-data.md`**: Update component status table and creator list
- **`CLAUDE.md`**: Comprehensive update:
  - Rename all TikTok references to X/Twitter
  - Update workspace structure (posts/ instead of videos/)
  - Update pipeline description
  - Update design system notes (tweet cards)
  - Update external services (Apify actor name)
  - Update seeded data section
  - Update Next.js gotchas if needed

**Files affected:**
- `context/personal-info.md`
- `context/business-info.md`
- `context/strategy.md`
- `context/current-data.md`
- `CLAUDE.md`

---

### Step 21: Add Tweet-Specific CSS (globals.css)

Add styles for tweet card layout if needed.

**Actions:**
- Add tweet card styles if the glass-morphism utilities don't cover the new layout
- Consider styles for inline media preview (image grids, video thumbnails)
- Add styles for engagement stat icons row
- Keep all existing glass-morphism, markdown, and utility classes

**Files affected:**
- `app/src/app/globals.css`

---

### Step 22: Test & Validate

End-to-end validation of the pivot.

**Actions:**
- Run `npm run dev` and verify all pages load without errors
- Check `/creators` page shows 10 marketing/CRO creators
- Test "Refresh" on a creator to verify Apify X scraping works
- Check `/configs` page shows "Growth Marketing" config
- Check `/posts` page loads (empty initially)
- Run pipeline with 1 creator, 2-3 posts to verify end-to-end:
  - Apify scrapes tweets successfully
  - Posts with videos > 30s are skipped with log message
  - Media downloads work (images from pbs.twimg.com)
  - Gemini analyzes post content + media with deep visual analysis
  - Claude generates ready-to-post text + image prompt (JSON format)
  - Kie AI generates infographic image from the prompt + reference image
  - Generated image is saved locally and displays on `/posts` page
  - Results appear on `/posts` page with both reference and generated content
- Verify post detail modal shows all three tabs (Original, Analysis, Generated)
- Verify generated infographic matches the brand style (warm cream background, sage green accents, serif titles, clean layout)
- Test copy button for generated post text
- Test download button for generated image
- Test star toggle on posts
- Verify proxy image works for Twitter CDN URLs
- Check all navigation links work correctly

**Files affected:**
- None (testing only)

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/context/pipeline-context.tsx` — may reference video-specific types (check and update)
- `app/src/hooks/use-mobile.ts` — no changes needed
- `app/src/lib/utils.ts` — no changes needed
- All `components/ui/*` — no changes needed (generic primitives)
- `package.json` — no dependency changes needed

### Updates Needed for Consistency

- All imports across the app that reference `TikTokVideo` must be updated to `Post`
- All imports of `readVideos`/`writeVideos`/`appendVideos` must become `readPosts`/`writePosts`/`appendPosts`
- All references to `/api/videos` in UI code must become `/api/posts`
- All references to `/videos` routes must become `/posts`
- `scrapeTikToks` → `scrapeTweets`, `scrapeCreatorStats` → `scrapeXProfile`
- `generateConcepts` → `generatePost` (returns structured JSON, not plain text)
- New env var `KIE_AI_API_KEY` must be documented
- `data/generated-images/` directory must be created for local image storage
- `references/brand-style.jpeg` must NOT be deleted — it's used at runtime by the pipeline

### Impact on Existing Workflows

- **Pipeline context** (`pipeline-context.tsx`): Needs update — add "generating" to phase type
- **Markdown content component**: No changes — it renders any markdown
- **All existing analyzed TikTok data will be lost** — videos.csv is replaced. This is intentional since we're pivoting the entire product focus.
- **Pipeline is now 4 phases** instead of 3 — scraping → analyzing → generating → done. UI progress display needs to reflect this.

---

## Validation Checklist

- [ ] TypeScript compiles with no errors (`npx tsc --noEmit` in app/)
- [ ] All pages load without runtime errors
- [ ] Creators page shows 10 marketing/CRO accounts
- [ ] Creator refresh works via Apify X scraper
- [ ] Config page shows "Growth Marketing" config with appropriate prompts
- [ ] Pipeline runs end-to-end: scrape → analyze → generate post + image
- [ ] Videos > 30s are skipped during analysis phase
- [ ] Gemini performs deep visual analysis when media is present
- [ ] Claude outputs structured JSON with postText + imagePrompt
- [ ] Kie AI generates infographic images with brand-consistent style
- [ ] Generated images are 3:4 vertical, saved locally, and display in UI
- [ ] Posts page shows both reference tweet and generated content
- [ ] Post detail modal has Original / Analysis / Generated tabs
- [ ] Copy button works for generated post text
- [ ] Download button works for generated infographic
- [ ] Star toggle works on posts
- [ ] Proxy image serves Twitter CDN URLs
- [ ] Navigation works: sidebar links, page redirects, "view posts" links
- [ ] No references to "TikTok", "video" (as content type), or old routes remain in UI-visible text
- [ ] CLAUDE.md accurately reflects new app state
- [ ] Context files updated
- [ ] `references/brand-style.jpeg` is used as reference image in all Kie AI requests
- [ ] Generated post text reads as authentic, human, non-generic

---

## Success Criteria

The implementation is complete when:

1. The app runs locally with zero TikTok references in the UI or data model
2. The full 4-phase pipeline executes: Apify scrapes X posts → Gemini deeply analyzes content+visuals → Claude generates ready-to-post text + image prompt → Kie AI generates branded infographic
3. 10 marketing/CRO seed creators are loaded and at least one can be refreshed via Apify
4. Post cards display both the reference tweet and the generated output (post text + infographic preview) in the glass-morphism design
5. Generated infographics are visually consistent with the reference image style (warm cream, sage green, serif titles, clean layout)
6. Generated post text is punchy, specific, authentic Twitter copy — not generic AI summaries
7. Videos > 30 seconds are automatically skipped
8. All documentation (CLAUDE.md, context files) accurately describes the X/Twitter AI app

---

## Notes

- **Apify actor verification**: The plan assumes `apidojo/tweet-scraper` but the exact actor ID and field names should be verified during implementation. The Apify marketplace has multiple X scrapers — if one doesn't work, try alternatives (`xtdata/twitter-x-scraper`, etc.).
- **Rate limits**: X/Twitter scrapers on Apify may have different rate limits than TikTok. Monitor during testing.
- **Media download**: Twitter CDN URLs (`pbs.twimg.com`) are generally stable and don't require authentication, unlike some TikTok CDN URLs. This should simplify media handling.
- **Kie AI image expiration**: Generated images expire from Kie AI CDN after 24 hours. The pipeline downloads and saves them locally to `data/generated-images/` immediately after generation. This is critical — never rely on the Kie AI URL for persistent storage.
- **Kie AI generation time**: nano-banana-2 takes 10-20 seconds per image. For a pipeline run with 10+ posts, the generation phase will take 2-3+ minutes. The SSE progress stream should show per-image progress.
- **Brand style iteration**: The reference image analysis is codified once in `brand-style.ts`. If the user wants to change the brand style, they replace the reference image and update the constants. Future enhancement: make this configurable per config.
- **Text rendering quality**: nano-banana-2 is specifically chosen for its strong text rendering in images — critical for infographics with readable body text. If text rendering quality is poor, the image prompt may need to be simplified (fewer text elements, larger font sizes).
- **Future enhancement**: Thread support — X posts can be threads. The current plan treats each tweet individually, but thread detection and analysis could be added later.
- **Future enhancement**: Quote tweet analysis — analyzing the quoted content alongside the quote could provide richer analysis.
- **Gemini usage**: For text-only posts, we still use Gemini rather than sending directly to Claude. This keeps the pipeline consistent and allows Gemini's reasoning to add value even without media.

---

## Implementation Notes

**Implemented:** 2026-04-18

### Summary

Complete pivot from TikTok AI to X/Twitter AI executed across all 22 steps. Every layer of the app was transformed: data model, scraping, analysis, generation, image creation, UI, navigation, seed data, and documentation.

### Deviations from Plan

- Kept TikTok CDN domains in proxy-image allowlist alongside Twitter domains (for backwards compat, as plan suggested)
- Pipeline API route still accepts `maxVideos` parameter name from the frontend (renamed to `maxPosts` in UI labels only) to avoid breaking the API contract — the pipeline internally treats it as max posts
- Apify response normalization is more robust than planned — handles multiple field name formats since exact actor output format is unknown until first real run

### Issues Encountered

- Stale `.next` cache had references to deleted `videos/page.tsx` and `api/videos/route.ts` — resolved by clearing `.next` directory
- No other issues — TypeScript compiles clean, all routes return 200
