# Plan: Upgrade App Pipeline — Smart Scraping, Classification, 70/30 Infographic Split

**Created:** 2026-04-19
**Status:** Implemented
**Request:** Update the app's pipeline to use the optimized Apify query, add AI-driven style classification (5 infographic styles), and generate 70% infographic + 30% text-only posts.

---

## Overview

### What This Plan Accomplishes

Upgrades the app's live pipeline (`pipeline.ts`, `apify.ts`, `claude.ts`) to incorporate all the improvements validated in `generate-smart.ts`: (1) optimized Apify `twitterHandles` query that's 10x faster, (2) a classification step where Claude assigns each post the best-fit infographic style from 5 options or marks it text-only, and (3) 70/30 infographic-to-text split so not every post gets an infographic. Also updates CLAUDE.md and context docs.

### Why This Matters

The standalone scripts proved the approach works — smart classification produces better-matched infographics and text-only posts are a realistic content mix. Now we bring these improvements into the app so every pipeline run benefits from faster scraping, intelligent style selection, and the full 5-style repertoire.

---

## Current State

### Relevant Existing Structure

- `app/src/lib/apify.ts` — Uses old `startUrls` + `tweetsDesired` format (slow, returns too many tweets)
- `app/src/lib/claude.ts` — Single `generatePost()` function, always generates both `postText` + `imagePrompt`, no style variation
- `app/src/lib/brand-style.ts` — Has `BRAND_STYLE_PROMPT` but no per-style descriptions
- `app/src/lib/pipeline.ts` — 4-phase pipeline, always generates infographic for every post
- `app/src/lib/kie.ts` — Kie AI generation, no changes needed
- `app/src/lib/types.ts` — `Post` interface has `generatedImagePrompt` and `generatedImageUrl` as strings (empty = no infographic)
- `app/src/app/posts/page.tsx` — Already handles empty `generatedImageUrl` gracefully (line 128: `if (!post.generatedImageUrl) return null`)
- `scripts/generate-smart.ts` — Validated reference for classification + 5 styles + text-only

### Gaps or Problems Being Addressed

1. **Apify is slow**: Current `startUrls` format returns 500+ tweets in 90s. The `twitterHandles` format returns exact count in ~5s.
2. **No style intelligence**: Every post gets the same generic infographic prompt — no style matching.
3. **No text-only posts**: Every post gets an infographic, but some posts (personal stories, CTAs, hot takes) don't need one.
4. **Only 1 implicit style**: The brand style prompt describes general principles but doesn't specify a particular chart type. The 5 validated styles (bar chart, proportional blocks, ranked bars, timeline, pyramid) produce much better results.

---

## Proposed Changes

### Summary of Changes

- **`app/src/lib/apify.ts`** — Switch `scrapeTweets()` to use `twitterHandles` + `maxItems` query format
- **`app/src/lib/brand-style.ts`** — Add 5 infographic style descriptions and export them
- **`app/src/lib/claude.ts`** — Add `classifyPosts()` function, modify `generatePost()` to accept optional style + text-only mode
- **`app/src/lib/pipeline.ts`** — Insert classification step between analysis and generation, implement 70/30 split, pass style to Claude, skip Kie AI for text-only posts
- **`app/src/lib/types.ts`** — Add `infographicStyle` field to `Post` interface
- **`CLAUDE.md`** — Update pipeline documentation
- **`context/current-data.md`** — Update pipeline status

### New Files to Create

None — all changes are modifications to existing files.

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `app/src/lib/apify.ts` | Switch to optimized `twitterHandles` + `maxItems` query format |
| `app/src/lib/brand-style.ts` | Add `INFOGRAPHIC_STYLES` object with 5 style descriptions, export it |
| `app/src/lib/claude.ts` | Add `classifyPosts()` export, update `generatePost()` to support style-specific and text-only modes |
| `app/src/lib/pipeline.ts` | Add classification sub-phase in generation phase, 70/30 split logic, style-aware generation |
| `app/src/lib/types.ts` | Add `infographicStyle` field to `Post` interface |
| `app/src/lib/csv.ts` | Add `infographicStyle` to CSV columns for posts |
| `CLAUDE.md` | Update pipeline architecture docs |
| `context/current-data.md` | Update component status |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Classification happens at the start of the generation phase, not as a separate pipeline phase**: The 4-phase SSE progress model (scraping → analyzing → generating → done) is already wired into the frontend. Adding a 5th phase would require frontend changes. Instead, classification is a quick sub-step at the start of the generation phase — it takes ~10-15s and can be logged as a generation phase activity. The progress bar and SSE events remain unchanged.

2. **70/30 split calculated as `Math.round(totalPosts * 0.3)` text-only**: For any batch size, ~30% become text-only. For 3 posts = 1 text-only. For 10 posts = 3 text-only. For 1 post = 0 text-only (always gets infographic). This matches the user's request and scales naturally.

3. **Classification uses a single Claude call with all post texts + analyses**: Same approach as `generate-smart.ts`. Claude sees all posts at once and distributes styles intelligently, ensuring variety and picking the genuinely weakest candidates for text-only.

4. **Style constraint: each style used at least once when ≥5 infographic posts**: When there are 5+ infographic posts, Claude must use each style at least once. Below 5, it picks the best-fit styles without the uniqueness constraint. This prevents all posts getting the same style.

5. **`generatePost()` gets two new optional parameters instead of a new function**: Adding `styleDescription?: string` and `textOnly?: boolean` keeps the interface simple. When `textOnly` is true, the output is `{ postText, imagePrompt: "" }`. When `styleDescription` is provided, it's appended to the image prompt instructions.

6. **`Post.infographicStyle` added as a new CSV column**: Stores the assigned style name (e.g., "Bar Chart Comparison") or "text-only" or "" (for posts generated before this change). The posts page can display this as a badge in the future.

7. **Apify actor stays as `apidojo~twitter-scraper-lite`**: The optimized query format works with this same actor — just different input parameters. No actor change needed.

### Alternatives Considered

- **Separate classification pipeline phase**: Would require frontend changes (5th phase in progress bar, SSE events). Not worth it for a 10-15s step.
- **Per-post style selection (no classification call)**: Each post independently picks its own style. Rejected — can't ensure variety or control the text-only count.
- **Hardcoded style rotation**: Simpler but doesn't match content to style.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Update Apify to use optimized query format

Modify `app/src/lib/apify.ts` to use the faster `twitterHandles` + `maxItems` query.

**Changes to `scrapeTweets()`** (lines 14-22):

Replace the fetch body from:
```typescript
body: JSON.stringify({
  startUrls: [{ url: `https://x.com/${username}` }],
  tweetsDesired: maxCount,
  proxyConfig: { useApifyProxy: true },
}),
```

To:
```typescript
body: JSON.stringify({
  includeSearchTerms: false,
  maxItems: maxCount,
  sort: "Latest",
  twitterHandles: [username],
}),
```

This returns exactly `maxCount` tweets in ~5s instead of 500+ tweets in 90s. The response format is the same — `normalizeTweet()` handles both.

**Actions:**
- Edit `app/src/lib/apify.ts` lines 17-20

**Files affected:**
- `app/src/lib/apify.ts`

---

### Step 2: Add infographic styles to brand-style.ts

Add the 5 validated infographic style descriptions as an exported constant.

**Add to `app/src/lib/brand-style.ts`:**

```typescript
export const INFOGRAPHIC_STYLES: Record<string, { label: string; description: string }> = {
  "Bar Chart Comparison": {
    label: "Bar Chart Comparison",
    description: `SPECIFIC STYLE — VERTICAL BAR CHART COMPARISON:
Create a vertical bar chart comparison infographic. Two side-by-side vertical bars dominate the center of the image.
- The primary bar should be filled with neon yellow-green (#C8FF00) with a subtle glow/bloom effect around it
- The secondary bar should have a dark fill with white icons/logos stacked inside it
- Large bold numbers displayed prominently ABOVE each bar (e.g., "85.8B" vs "86.9B")
- Thin horizontal grid lines in dark gray across the chart area
- Ranking labels centered below each bar (e.g., "#1", "#2 - #14")
- The bars should take up 50-60% of the vertical space
- Clean, dramatic contrast between the glowing accent bar and the dark secondary bar`,
  },
  "Proportional Blocks": {
    label: "Proportional Blocks",
    description: `SPECIFIC STYLE — PROPORTIONAL STACKED BLOCKS:
Create a proportional area/treemap infographic with stacked rectangular blocks of different sizes.
- The largest block should be neon yellow-green (#C8FF00), taking up ~70-80% of the area, with its percentage displayed large and centered inside
- A medium block in electric blue (#3B82F6), ~10-15% of the area, with its percentage centered inside
- A small block in white (#FFFFFF), ~2-5% of the area, with its percentage centered inside
- All blocks should be stacked vertically, flush against each other
- Dimension annotations on the right side with bracket lines and labels
- The visual should immediately communicate proportion/dominance at a glance
- Clean edges, no rounded corners on the blocks`,
  },
  "Ranked Horizontal Bars": {
    label: "Ranked Horizontal Bars",
    description: `SPECIFIC STYLE — HORIZONTAL BAR CHART (RANKED LIST):
Create a ranked horizontal bar chart infographic listing 10-15 items.
- Each row has: a small icon/symbol on the far left, then the item name, then a horizontal neon yellow-green (#C8FF00) bar extending right, then the percentage/value at the end of the bar
- Bars should be proportional to their values — longest bar at top, shortest at bottom
- Column headers at the top in light gray
- Compact row spacing — maximize the number of items visible
- Clean alignment — all icons, names, bars, and values perfectly aligned in columns
- The overall effect should look like a leaderboard or ranking table
- Thin horizontal separator lines between rows in very dark gray`,
  },
  "Timeline": {
    label: "Timeline",
    description: `SPECIFIC STYLE — TIMELINE / LINE CHART:
Create a vertical timeline infographic showing progression/evolution over time.
- A vertical or diagonal line chart running from bottom-left to top-right
- Data points as dots/circles on the line in neon yellow-green (#C8FF00)
- Each milestone annotated with a quoted statement or event name on the left side
- Year/date and context in neon yellow-green below each quote
- Dollar values or metrics on the right side aligned with each data point
- The line should show growth/progression upward
- Bold contrarian title at top in large white condensed sans-serif (e.g., quotes with quotation marks)
- Legend box in top-left area
- Subtle diagonal line texture on black background`,
  },
  "Pyramid/Funnel": {
    label: "Pyramid/Funnel",
    description: `SPECIFIC STYLE — PYRAMID / FUNNEL DIAGRAM:
Create a pyramid/funnel infographic with 3 layered sections.
- A triangular pyramid shape divided into 3 horizontal tiers
- Top tier (smallest): neon yellow-green (#C8FF00) fill with label inside
- Middle tier: white (#FFFFFF) fill with label inside
- Bottom tier (largest): electric blue (#3B82F6) fill with label inside
- Each tier has bullet points extending to the right side, connected by thin lines with small dots
- Bullet points in white text listing specific items/strategies for each tier
- Large bold title at top in white condensed sans-serif, with key word highlighted in neon yellow-green
- Clean spacing between tiers
- No additional decorative elements — let the pyramid be the hero visual`,
  },
};
```

**Actions:**
- Add the `INFOGRAPHIC_STYLES` export to `app/src/lib/brand-style.ts`

**Files affected:**
- `app/src/lib/brand-style.ts`

---

### Step 3: Add infographicStyle field to Post type and CSV

**In `app/src/lib/types.ts`**, add after `generatedImageUrl`:
```typescript
infographicStyle: string; // "Bar Chart Comparison", "text-only", or "" (legacy)
```

**In `app/src/lib/csv.ts`**, add `infographicStyle` to the posts CSV columns array wherever columns are defined.

**Actions:**
- Add `infographicStyle: string` to `Post` interface in `types.ts`
- Update CSV column handling in `csv.ts`
- Grep for anywhere `Post` objects are constructed to ensure `infographicStyle` is included

**Files affected:**
- `app/src/lib/types.ts`
- `app/src/lib/csv.ts`

---

### Step 4: Update claude.ts — add classifyPosts() and update generatePost()

**Add `classifyPosts()` export:**

```typescript
interface Classification {
  postIndex: number;
  style: string; // one of the 5 style names or "text-only"
  reasoning: string;
}

export async function classifyPosts(
  posts: Array<{ index: number; text: string; analysis: string }>,
  numTextOnly: number
): Promise<Classification[]> {
```

This function:
1. Takes all analyzed posts + how many should be text-only
2. Sends a single Claude call with the classification prompt (same as generate-smart.ts)
3. Returns structured JSON array with style assignment per post

The classification prompt includes:
- All 5 style labels + "best for" descriptions
- Text-only criteria (personal stories, opinion-only, CTAs, short hot takes)
- Constraint: exactly `numTextOnly` posts must be text-only
- Constraint: if `numInfographic >= 5`, each style used at least once
- The full text + first 200 chars of analysis for each post

**Update `generatePost()` signature:**

```typescript
export async function generatePost(
  analysis: string,
  configPrompt: string,
  options?: {
    styleDescription?: string;
    textOnly?: boolean;
    username?: string;
  }
): Promise<GeneratedPost> {
```

When `options.textOnly` is true:
- System prompt removes image prompt guidelines entirely
- Output format becomes just `{ "postText": "..." }`
- Returned `imagePrompt` is empty string

When `options.styleDescription` is provided:
- Appended to the image prompt guidelines section after `BRAND_STYLE_PROMPT`
- This tells Claude exactly which chart type to use

When `options.username` is provided:
- Add attribution instruction: `ATTRIBUTION: Every infographic MUST include "${username}" in the bottom attribution area. Use format: "Visual by ${username}" or "Follow ${username} for growth insights".`

**Actions:**
- Add `classifyPosts()` function to `claude.ts`
- Update `generatePost()` signature and implementation
- Import `INFOGRAPHIC_STYLES` from `brand-style.ts`

**Files affected:**
- `app/src/lib/claude.ts`

---

### Step 5: Update pipeline.ts — add classification + 70/30 split

This is the core change. Modify the generation phase (Phase 3) to:

1. **Calculate the split**: `const numTextOnly = Math.round(analyzedItems.length * 0.3);`
2. **Classify**: Call `classifyPosts()` with all analyzed posts. Log the classification results.
3. **Generate with style**: For each post, check its classification:
   - If `style === "text-only"`: call `generatePost(analysis, configPrompt, { textOnly: true })`
   - If infographic: call `generatePost(analysis, configPrompt, { styleDescription: INFOGRAPHIC_STYLES[style].description, username: "@olegrows" })`, then `generateInfographic()`

**Changes to Phase 3 in `pipeline.ts`** (lines 267-342):

Insert classification sub-step after the phase header:

```typescript
// Classification sub-step
log(`Classifying ${analyzedItems.length} posts (selecting styles + text-only)...`);
const numTextOnly = Math.round(analyzedItems.length * 0.3);
const classifications = await classifyPosts(
  analyzedItems.map((item, i) => ({
    index: i,
    text: item.tweet.text,
    analysis: item.analysis.slice(0, 500), // truncate for classification prompt
  })),
  numTextOnly
);

const classificationMap = new Map(classifications.map(c => [c.postIndex, c]));
const infographicCount = classifications.filter(c => c.style !== "text-only").length;
log(`Classification done: ${infographicCount} infographic + ${numTextOnly} text-only`);
```

Then modify the generation loop:

```typescript
await runConcurrent(analyzedItems, GENERATION_CONCURRENCY, async (item, idx) => {
  const classification = classificationMap.get(idx);
  const isTextOnly = classification?.style === "text-only";
  const styleDesc = !isTextOnly && classification 
    ? INFOGRAPHIC_STYLES[classification.style]?.description 
    : undefined;

  // ... existing prefix/logging ...

  const generated = await generatePost(item.analysis, config.newConceptsInstruction, {
    textOnly: isTextOnly,
    styleDescription: styleDesc,
    username: "@olegrows",
  });

  let generatedImageUrl = "";
  if (!isTextOnly) {
    // existing Kie AI generation code
    try {
      const imagePath = await generateInfographic(generated.imagePrompt, postId);
      generatedImageUrl = imagePath;
      log(`${prefix} Infographic ready (${classification?.style})`);
    } catch (kieErr) {
      log(`${prefix} Kie AI failed: ${kieErr instanceof Error ? kieErr.message : kieErr}`);
    }
  } else {
    log(`${prefix} Text-only post (skipping infographic)`);
  }

  const post: Post = {
    // ... existing fields ...
    infographicStyle: classification?.style || "",
  };
});
```

**Import additions at top of pipeline.ts:**
```typescript
import { classifyPosts, generatePost } from "./claude";
import { INFOGRAPHIC_STYLES } from "./brand-style";
```

**Edge cases:**
- If only 1 post: `numTextOnly = 0` (always generates infographic)
- If 2 posts: `numTextOnly = 1` (1 infographic, 1 text-only)
- If classification call fails: fall back to all-infographic mode (no text-only, generic style)
- Username is hardcoded as `"@olegrows"` for now (same as batch script constant)

**Actions:**
- Add imports for `classifyPosts` and `INFOGRAPHIC_STYLES`
- Insert classification sub-step at start of Phase 3
- Modify the generation loop to use classification results
- Add `infographicStyle` to Post construction

**Files affected:**
- `app/src/lib/pipeline.ts`

---

### Step 6: Update CLAUDE.md

Update the pipeline architecture section to document:
- Optimized Apify query format
- Classification step in generation phase
- 70/30 infographic/text-only split
- 5 infographic styles
- Username attribution

**Actions:**
- Update the "Pipeline Architecture" section
- Update the "External Services" Apify note

**Files affected:**
- `CLAUDE.md`

---

### Step 7: Update context/current-data.md

Update component statuses to reflect the pipeline upgrade.

**Actions:**
- Update "X/Twitter scraping" status note to mention optimized query
- Update pipeline-related entries

**Files affected:**
- `context/current-data.md`

---

### Step 8: Test the pipeline

**Actions:**
- Run `npm run dev` from workspace root
- Navigate to http://localhost:3000/run
- Run the pipeline with default settings (Growth Marketing config, ~3-5 posts)
- Verify:
  - Scraping is noticeably faster (~5s per creator instead of 90s)
  - Classification log messages appear in the generation phase
  - Some posts are text-only (no Kie AI call)
  - Infographic posts show style assignments in logs
  - Posts appear in /posts page correctly
  - Text-only posts show text without infographic image
  - Infographic posts show styled infographic

**Files affected:**
- None (testing only)

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/app/api/pipeline/route.ts` — Calls `runPipeline()`, no changes needed (same interface)
- `app/src/app/run/page.tsx` — Reads SSE progress, no changes needed (same `PipelineProgress` type)
- `app/src/app/posts/page.tsx` — Displays posts, already handles empty `generatedImageUrl`
- `app/src/app/api/posts/route.ts` — Reads CSV, will pick up new `infographicStyle` column
- `scripts/generate-smart.ts` — Standalone, not affected
- `scripts/generate-batch.ts` — Standalone, not affected

### Updates Needed for Consistency

- CLAUDE.md pipeline docs
- context/current-data.md component status

### Impact on Existing Workflows

- **Pipeline runs will be faster** due to optimized Apify query
- **Some posts will not have infographics** — the posts page already handles this gracefully
- **Backward compatible**: Existing posts in CSV with empty `infographicStyle` will work fine (empty string default)
- **No UI changes needed**: The posts page already conditionally renders infographic images

---

## Validation Checklist

- [ ] Apify scraping uses optimized `twitterHandles` query format
- [ ] `INFOGRAPHIC_STYLES` exported from `brand-style.ts` with all 5 styles
- [ ] `Post` interface has `infographicStyle` field
- [ ] `classifyPosts()` function exists in `claude.ts`
- [ ] `generatePost()` accepts `styleDescription`, `textOnly`, `username` options
- [ ] Pipeline Phase 3 includes classification sub-step
- [ ] ~30% of posts are text-only (no Kie AI call)
- [ ] ~70% of posts get infographics with style-specific prompts
- [ ] Text-only posts have empty `generatedImageUrl` and `generatedImagePrompt`
- [ ] Infographic posts have `infographicStyle` set to the assigned style name
- [ ] Pipeline runs without errors
- [ ] Posts appear correctly in /posts page
- [ ] CLAUDE.md updated
- [ ] context/current-data.md updated
- [ ] Existing CSV data not broken (backward compatible)

---

## Success Criteria

The implementation is complete when:

1. Pipeline runs with noticeably faster scraping (~5s per creator)
2. Classification step assigns styles intelligently (logged in pipeline output)
3. ~30% of generated posts are text-only, ~70% have infographics
4. Infographic posts use varied styles from the 5 available options
5. All posts save to CSV with `infographicStyle` field
6. Posts page displays both infographic and text-only posts correctly

---

## Notes

- The `@olegrows` username is hardcoded in the pipeline for now. Future: could be a field in the Config model so each config can have its own username.
- The classification call adds ~10-15s to the generation phase. This is negligible compared to Kie AI generation time (40-110s per image).
- With the 70/30 split, a 10-post pipeline run saves ~3 Kie AI calls ($$ and time). A 30% reduction in image generation is significant.
- The `infographicStyle` field in the Post interface could be displayed as a badge on the posts page in a future iteration.
- QC (Claude Vision quality check) is NOT added to the app pipeline in this change. It's validated in the scripts but adds complexity and cost. Consider adding it as a follow-up.
- If classification fails (Claude returns invalid JSON), the pipeline should fall back to all-infographic mode with generic styling rather than crashing.

---

## Implementation Notes

**Implemented:** 2026-04-19

### Summary

All 7 code steps implemented. Pipeline now uses optimized Apify `twitterHandles` query, AI-driven classification (5 infographic styles + text-only with 70/30 split), style-specific image prompts, and username attribution. TypeScript compiles cleanly.

### Deviations from Plan

- Added the "CRITICAL CONSTRAINT" about real person/brand names to the infographic system prompt (from generate-smart.ts) — this was in the reference script but not explicitly in the plan. Prevents Kie AI content filter rejections.
- Plan Step 7 mentioned updating the Apify actor name in decision #7 as `apidojo~twitter-scraper-lite` but incorrectly stated no actor change — the actor was already `apidojo~twitter-scraper-lite` in the code, only the query format changed.

### Issues Encountered

None.
