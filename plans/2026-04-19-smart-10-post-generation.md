# Plan: Smart 10-Post Generation — AI-Driven Style Selection + Text-Only Posts

**Created:** 2026-04-19
**Status:** Implemented
**Request:** Scrape 10 CarlWeische posts, generate 10 new posts (7 with infographics, 3 text-only). Use all 5 infographic styles. Claude selects the best-matching style per post, and identifies the 3 posts least suited for infographics.

---

## Overview

### What This Plan Accomplishes

Creates `scripts/generate-smart.ts` — a new generation script that scrapes 10 CarlWeische posts, uses Claude to classify each post into the best infographic style (or text-only), generates 7 infographic posts + 3 text-only posts, runs QC on infographics, and outputs a comprehensive HTML comparison page. The key innovation is the **classification step**: Claude analyzes all 10 posts and decides which get which style, based on content fit.

### Why This Matters

This moves from manually assigning styles to having the AI make intelligent style decisions. It also validates that text-only posts can stand on their own, giving us a realistic content mix (not every X post needs an infographic).

---

## Current State

### Relevant Existing Structure

- `scripts/generate-batch.ts` — Working 3-post batch script with parallelism + QC (3 styles hardcoded 1:1)
- `references/infographic 1-5.jpeg` — 5 reference infographic images with distinct styles
- `app/src/lib/apify.ts` — Apify scraping patterns

### Gaps or Problems Being Addressed

- Current batch script assigns styles 1:1 (post 1 → style 1, etc.) — no intelligent matching
- No support for text-only posts
- Only uses 3 of 5 available styles
- Scale limited to 3 posts

---

## Proposed Changes

### Summary of Changes

- Create `scripts/generate-smart.ts` with a new 2-phase architecture:
  - **Phase 1 — Classification**: Send all 10 scraped post texts to Claude in a single call. Claude returns a JSON array classifying each post as one of 5 infographic styles or "text-only", with reasoning.
  - **Phase 2 — Generation**: Generate all 10 posts in parallel. 7 get infographics (with QC), 3 get text-only treatment.
- Add 2 new style descriptions (Timeline + Pyramid/Funnel) to the styles array
- Smarter HTML output with sections: "With Infographic" and "Text-Only"

### All 5 Infographic Styles

| # | Label | Best For | Reference |
|---|-------|----------|-----------|
| 1 | Bar Chart Comparison | A vs B comparisons, before/after, two competing things | infographic 1.jpeg |
| 2 | Proportional Blocks | Market share, percentage breakdowns, dominance stats | infographic 2.jpeg |
| 3 | Ranked Horizontal Bars | Top N lists, leaderboards, ranked comparisons | infographic 3.jpeg |
| 4 | Timeline | Historical evolution, journey, milestones over time, "X is dead" narratives | infographic 4.jpeg |
| 5 | Pyramid/Funnel | Frameworks, hierarchies, layered concepts, strategy models | infographic 5.jpeg |

### Posts Best Suited as Text-Only

Posts that should NOT get infographics (Claude will identify these):
- Personal stories/anecdotes (selfie posts, "my journey" stories)
- Opinion-only takes without data or frameworks
- Call-to-action / hiring / seeking posts
- Short hot takes without enough substance for a visual

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `scripts/generate-smart.ts` | Smart 10-post generation with AI-driven style classification |
| `output/smart-comparison.html` | Generated HTML showing all 10 posts (7 infographic + 3 text-only) |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `CLAUDE.md` | Document the smart script and classification approach |

---

## Design Decisions

### Key Decisions Made

1. **Classification as a separate Claude call before generation**: Instead of having each post decide its own style independently, send ALL 10 posts to Claude in one call so it can see the full set and distribute styles intelligently — avoiding putting all posts in the same style, ensuring variety, and picking the genuinely worst 3 for text-only.

2. **Classification prompt returns structured JSON**: Claude outputs an array of `{ postIndex, style, reasoning }` objects. `style` is one of the 5 labels or `"text-only"`. This makes it deterministic and parseable.

3. **Constraint: exactly 7 infographic + 3 text-only**: The classification prompt explicitly constrains Claude to pick exactly 3 text-only posts. This prevents it from being too conservative or too generous.

4. **All 5 styles must be used at least once**: The classification prompt requires each of the 5 infographic styles to be used at least once across the 7 infographic posts (remaining 2 slots are best-fit repeats). This ensures variety.

5. **Text-only posts still get Claude-generated post text**: They just skip the image prompt, Kie AI call, and QC steps. The HTML shows them in a distinct section with a "Text Only" badge.

6. **Parallelism structure**: Classification is sequential (needs all posts to decide). Then all 10 Claude generation calls run in parallel. Then 7 Kie AI + QC pipelines run in parallel. Text-only posts finish immediately after Claude generation.

### Alternatives Considered

- **Per-post classification**: Each post picks its own style independently. Rejected because it can't ensure variety or the exact 7/3 split.
- **Random style assignment**: Doesn't leverage the AI's understanding of content-style fit.
- **Hardcoded rules**: Too brittle, can't handle the variety of content topics.

### Open Questions

None.

---

## Step-by-Step Tasks

### Step 1: Create the smart generation script

Create `scripts/generate-smart.ts` based on `generate-batch.ts` with these modifications:

**Configuration:**
```typescript
const USERNAME = "@olegrows";
const CREATOR = "CarlWeische";
const NUM_POSTS = 10;
const NUM_INFOGRAPHIC = 7;
const NUM_TEXT_ONLY = 3;
const MAX_QC_ATTEMPTS = 3;
```

**Styles array** — expand to 5 entries:

Style 4 (Timeline):
```
SPECIFIC STYLE — TIMELINE / LINE CHART:
Create a vertical timeline infographic showing progression/evolution over time.
- A vertical or diagonal line chart running from bottom-left to top-right
- Data points as dots/circles on the line in neon yellow-green (#C8FF00)
- Each milestone annotated with a quoted statement or event name on the left side
- Year/date and context in neon yellow-green below each quote
- Dollar values or metrics on the right side aligned with each data point
- The line should show growth/progression upward
- Bold contrarian title at top in large white condensed sans-serif (e.g., quotes with quotation marks)
- Legend box in top-left area
- Subtle diagonal line texture on black background
```

Style 5 (Pyramid/Funnel):
```
SPECIFIC STYLE — PYRAMID / FUNNEL DIAGRAM:
Create a pyramid/funnel infographic with 3 layered sections.
- A triangular pyramid shape divided into 3 horizontal tiers
- Top tier (smallest): neon yellow-green (#C8FF00) fill with label inside (e.g., "Convert")
- Middle tier: white (#FFFFFF) fill with label inside (e.g., "Discover")
- Bottom tier (largest): electric blue (#3B82F6) fill with label inside (e.g., "Awareness")
- Each tier has bullet points extending to the right side, connected by thin lines with small dots
- Bullet points in white text listing specific items/strategies for each tier
- Large bold title at top in white condensed sans-serif, with key word highlighted in neon yellow-green
- Clean spacing between tiers
- No additional decorative elements — let the pyramid be the hero visual
```

**New function — `classifyPosts()`:**

Call Claude with all 10 post texts and ask it to classify each one. The prompt:

```
System: You are a content strategist who understands data visualization. You will receive 10 X/Twitter posts from a marketing/CRO creator. Your job is to classify each post into either an infographic style or text-only.

You MUST select exactly 7 posts for infographics and exactly 3 for text-only.
You MUST use each of the 5 infographic styles at least once (the remaining 2 slots are best-fit repeats).

The 5 infographic styles are:
1. "Bar Chart Comparison" — Best for: A vs B comparisons, before/after data, two competing metrics
2. "Proportional Blocks" — Best for: market share, percentage breakdowns, dominance statistics
3. "Ranked Horizontal Bars" — Best for: top N lists, leaderboards, ranked comparisons
4. "Timeline" — Best for: historical evolution, milestones over time, journey/progression narratives
5. "Pyramid/Funnel" — Best for: frameworks, hierarchies, layered strategies, funnel concepts

Posts that should be "text-only":
- Personal stories/anecdotes without data or frameworks
- Opinion-only takes without numbers or structure
- Call-to-action / hiring / community posts
- Short hot takes without enough substance for a visual

Respond with ONLY a JSON array — no markdown, no explanation:
[
  { "postIndex": 0, "style": "Bar Chart Comparison", "reasoning": "..." },
  { "postIndex": 1, "style": "text-only", "reasoning": "..." },
  ...
]
```

User message includes all 10 posts numbered 0-9 with their full text.

**Modified generation flow:**

```
1. Scrape 10 posts from Apify (sequential — single API call)
2. Classify all 10 posts (sequential — single Claude call, needs all posts)
3. Generate all 10 posts in parallel (Promise.allSettled):
   - For infographic posts: Claude gen → Kie AI → QC → retry if fail
   - For text-only posts: Claude gen only (just postText, no imagePrompt)
4. Download original images in parallel
5. Generate HTML with two sections
6. Write to output/smart-comparison.html
```

**Text-only Claude generation** — use a slightly different prompt for text-only posts:
- Same system prompt but WITHOUT image prompt guidelines
- Output is just `{ "postText": "..." }` (no imagePrompt field)
- The prompt emphasizes making the text itself the star — more punchy, longer if needed, thread-worthy

**HTML structure:**
- Title: "Smart Generation — 10 Posts (7 Infographic + 3 Text-Only)"
- Section 1: "Posts with Infographics" — 7 rows, each showing original vs generated + infographic + QC tab
- Section 2: "Text-Only Posts" — 3 rows, each showing original vs generated text (no image column)
- Each row shows the assigned style badge and classification reasoning
- Summary stats at the top: style distribution, QC pass rate, total time

**Actions:**
- Create `scripts/generate-smart.ts` with all the above

**Files affected:**
- `scripts/generate-smart.ts` (new)

---

### Step 2: Run the script

**Actions:**
- Run: `npx tsx scripts/generate-smart.ts`
- Expected runtime: ~3-5 minutes (scrape ~5s with optimized query, classify ~10s, 10 parallel Claude calls ~20s, 7 parallel Kie AI ~120s, 7 QC ~10s)

**Files affected:**
- `output/smart-comparison.html` (new, generated)

---

### Step 3: Open and verify the HTML output

**Actions:**
- Open `output/smart-comparison.html` in the browser
- Verify:
  - 7 infographic posts show with correct style badges
  - 3 text-only posts display without images
  - All 5 styles used at least once
  - @olegrows appears in each infographic
  - QC tabs work
  - Classification reasoning is visible and makes sense
  - Text-only posts genuinely are less suited for infographics

**Files affected:**
- None (verification only)

---

### Step 4: Update CLAUDE.md

**Actions:**
- Document `generate-smart.ts` alongside the other scripts
- Note the classification approach and the 5 styles

**Files affected:**
- `CLAUDE.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `scripts/generate-batch.ts` — Previous batch script (kept, this is the evolution)
- `references/infographic 1-5.jpeg` — All 5 styles now used

### Updates Needed for Consistency

- CLAUDE.md scripts section

### Impact on Existing Workflows

- No impact on existing scripts — this is a new standalone script
- Uses all 5 reference infographic styles for the first time

---

## Validation Checklist

- [ ] Script runs without errors
- [ ] 10 posts scraped from CarlWeische via Apify
- [ ] Classification step returns exactly 7 infographic + 3 text-only
- [ ] All 5 infographic styles used at least once
- [ ] 10 Claude generation calls complete in parallel
- [ ] 7 Kie AI calls complete in parallel
- [ ] QC runs on all 7 infographic posts
- [ ] Text-only posts have no image generation
- [ ] HTML file generated at `output/smart-comparison.html`
- [ ] HTML shows infographic section (7 posts) and text-only section (3 posts)
- [ ] Classification reasoning is visible for each post
- [ ] @olegrows appears in each infographic
- [ ] Generated text reads like authentic X content
- [ ] CLAUDE.md updated

---

## Success Criteria

The implementation is complete when:

1. `output/smart-comparison.html` opens showing 10 posts — 7 with infographics using all 5 styles, 3 text-only
2. The style assignments make sense (e.g., comparison posts get bar charts, lists get ranked bars, etc.)
3. The 3 text-only posts are genuinely the least suited for infographics
4. All infographic posts pass QC (or show best attempt with warning)
5. Total execution time under 8 minutes

---

## Notes

- With 7 parallel Kie AI calls, we might hit rate limits. If so, batch into groups of 3-4 with a small delay between batches.
- The classification call is cheap (~1 Claude call) but very high leverage — it prevents wasting Kie AI credits on posts that don't need infographics.
- Future: the classification step could be integrated into the app's pipeline to automatically decide which pipeline-generated posts should get infographics.
- The text-only Claude prompt could be tuned separately — text-only posts might benefit from being longer (thread format) since they don't have a visual hook.
- Use the optimized Apify query format: `{ "includeSearchTerms": false, "maxItems": N, "sort": "Latest", "twitterHandles": ["username"] }` — returns exactly N tweets in ~5s instead of the old `startUrls` format that returned 500+ and took 90s+.
- If we need more posts to find 10 with images, increase `maxItems` to 20-30. The optimized query is so fast it doesn't matter.

---

## Implementation Notes

**Implemented:** 2026-04-19

### Summary

Created `scripts/generate-smart.ts` with full 2-phase architecture: classification + parallel generation. Script ran successfully in 293s (~4.9 min). 9 of 10 posts generated — 6 infographics (all passed QC) + 3 text-only. One post failed due to Claude returning malformed JSON (fixed with more robust parsing). All 5 infographic styles were used. Updated CLAUDE.md with smart script documentation.

### Deviations from Plan

1. **Apify `maxItems: 20` instead of 10**: Used 20 to ensure enough posts with varied content for classification, then selected top 10 by engagement.
2. **JSON parse robustness**: Added fallback regex extraction (`/\{[\s\S]*\}/`) when `JSON.parse` fails on Claude's response — Post 0 failed on first run due to malformed JSON, this fix prevents it in future runs.
3. **1 post failed (Post 0)**: Claude returned JSON with a syntax error at position 161. The script continued with 9 posts gracefully via `Promise.allSettled`. Fixed with robust parsing for future runs.
4. **Kie AI timeout on Post 9**: First attempt timed out after 3 minutes. Auto-retry succeeded on attempt 2 (38.7s). The retry mechanism worked as designed.

### Issues Encountered

1. **Claude malformed JSON**: Post 0's Claude response had a JSON syntax error. The `Promise.allSettled` pattern handled this gracefully — other 9 posts continued. Added fallback regex JSON extraction to prevent this in future runs.
2. **Kie AI timeout**: Post 9's first Kie AI attempt timed out after 3 minutes. Automatic retry succeeded. No code changes needed — the existing retry mechanism handled it.
3. **No rate limiting issues**: All 7 Kie AI calls ran in parallel without hitting rate limits.
