# Plan: Batch Infographic Generation — 3 Posts × 3 Styles with Parallelism

**Created:** 2026-04-19
**Status:** Implemented
**Request:** Save the working generation workflow to a reusable script, add configurable username (default @olegrows) for infographic attribution, scrape 3 CarlWeische posts, generate 3 new posts with infographics in the styles of infographic 1-3, show results as HTML, maximize parallelism.

---

## Overview

### What This Plan Accomplishes

Evolves the one-off `generate-demo.ts` into a production-quality `generate-batch.ts` script that: scrapes 3 fresh posts from CarlWeische via Apify, generates 3 new posts with infographics (each matching a different reference style — infographic 1, 2, and 3), embeds a configurable username (@olegrows by default) in the infographic attribution, runs Claude calls and Kie AI calls in parallel where possible, and outputs a single HTML page showing all 3 original/generated pairs.

### Why This Matters

Validates the full end-to-end pipeline at scale (3 posts instead of 1) with parallelism for speed, and establishes the username branding that makes generated content ready to publish under Oleg's handle.

---

## Current State

### Relevant Existing Structure

- `scripts/generate-demo.ts` — Working single-post generation script (Claude + Kie AI + HTML output)
- `references/infographic 1-5.jpeg` — 5 reference infographic images
- `app/src/lib/apify.ts` — Apify scraping functions (used by the app pipeline)
- `app/src/lib/brand-style.ts` — Updated brand style constants (dark/neon)
- `data/posts.csv` — Existing posts (3 CarlWeische posts already scraped)
- `output/demo-comparison.html` — Previous single-post comparison output

### Gaps or Problems Being Addressed

- Current script only handles 1 post at a time
- No configurable username — infographic attribution is whatever Claude/Kie AI decides
- No parallelism — Claude and Kie AI calls are sequential
- Need fresh posts from Apify instead of relying on existing CSV data
- Need to support multiple infographic styles in a single run

---

## Proposed Changes

### Summary of Changes

- Create `scripts/generate-batch.ts` — new batch generation script with parallelism
- Add configurable `USERNAME` constant (default `@olegrows`) injected into Claude's image prompt instructions
- Scrape 3 CarlWeische posts via Apify (top by engagement, image posts only)
- Run 3 Claude API calls in parallel (one per post)
- Run 3 Kie AI calls in parallel (one per post, each with a different style prompt based on infographic 1-3)
- Generate `output/batch-comparison.html` showing 3 rows of original vs generated
- Keep `generate-demo.ts` as-is for reference

### Style Descriptions for Infographics 1-3

**Infographic 1** — "Google vs The 13 Next Biggest Websites"
- Vertical bar chart comparison
- Two side-by-side bars: one neon yellow-green, one with stacked white icons inside
- Large numbers prominently displayed above bars
- Glowing effect on the accent-colored bar
- Ranking labels (#1, #2-#14) at bottom
- Source attribution at bottom-left, "Visual by / Follow for" at bottom-right

**Infographic 2** — "85% of brand mentions in AI answers come from third-party sites"
- Proportional stacked blocks (treemap/area chart style)
- Three blocks: large neon yellow-green (85%), medium blue (13%), small white (2%)
- Percentage labels inside each block
- Dimension annotations on the right side with bracket lines
- Source attribution at bottom-left

**Infographic 3** — "Top cited domains by LLMs in 2026"
- Horizontal bar chart (ranked list, 20+ items)
- Favicon icons to the left of each domain name
- Neon yellow-green bars extending right with percentages
- Column headers ("Domain" / "Citation frequency") at top
- Compact rows, clean alignment
- Source + "Follow Jake Ward" at bottom

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `scripts/generate-batch.ts` | Batch generation: scrape → Claude (parallel) → Kie AI (parallel) → HTML |
| `output/batch-comparison.html` | Generated HTML showing 3 original/generated pairs |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `CLAUDE.md` | Document the batch script and username configuration |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Separate script, not modifying generate-demo.ts**: Keep the original as a simple reference. The batch script is structurally different (parallelism, multiple styles, scraping).

2. **Scrape fresh posts via Apify**: Rather than reusing the 3 posts in CSV, scrape fresh from Apify to test the full pipeline. Filter to image posts only (text-only posts don't make good side-by-side comparisons). Take top 3 by engagement.

3. **Per-style prompt variations**: Each of the 3 posts gets a different style-specific prompt appended to the base brand style prompt. This tests whether Kie AI can produce visually distinct infographics guided by text descriptions of each style.

4. **Parallel Claude calls, then parallel Kie AI calls**: Call Claude for all 3 posts simultaneously (they're independent). Once all 3 return, call Kie AI for all 3 simultaneously. This cuts total time from ~6 minutes sequential to ~2 minutes parallel.

5. **Username as a constant at the top of the script**: Simple to change. The user mentioned "able to be changed inside the app" — for now, it's a script constant. Future: could be a config in the app's configs page.

6. **Username injected into image prompt instructions**: Add a line to the system prompt telling Claude to always include `Follow @olegrows` or `Visual by @olegrows` in the infographic attribution area, matching the "Visual by Jake Ward / Follow for posts on marketing" pattern from the reference infographics.

### Alternatives Considered

- **Reusing CSV posts**: Simpler but doesn't test the scraping step. User specifically said "scrape 3 posts."
- **Sequential execution**: Works but wastes time. Parallel is ~3x faster for 3 posts.
- **Single style for all 3**: User explicitly asked for "styles of infographic 1-3."

### Open Questions

None — all clarified.

---

## Step-by-Step Tasks

### Step 1: Create the batch generation script

Create `scripts/generate-batch.ts` with the following structure:

**Configuration section:**
```typescript
const USERNAME = "@olegrows";
const CREATOR = "CarlWeische";
const NUM_POSTS = 3;
```

**Style descriptions array** — 3 entries, one per infographic style:
- Style 1 (bar chart comparison): Describe the vertical bar comparison layout from infographic 1
- Style 2 (proportional blocks): Describe the treemap/area blocks from infographic 2
- Style 3 (ranked horizontal bars): Describe the horizontal ranked list from infographic 3

**Functions:**
1. `scrapeCreatorPosts(username, count)` — Call Apify to get top posts, filter to image posts, return top N by engagement
2. `generateWithClaude(post, styleDescription, username)` — Same as generate-demo.ts but with style-specific additions and username attribution instruction
3. `generateInfographic(imagePrompt)` — Same as generate-demo.ts (Kie AI call with polling)
4. `qualityCheck(imageBuffer, imagePrompt, styleLabel)` — Send generated image to Claude Vision to verify quality (see QC section below)
5. `generateWithRetry(post, styleDescription, styleLabel, username, maxAttempts)` — Wraps Claude → Kie AI → QC loop, retries up to maxAttempts on QC failure
6. `downloadImage(url)` — Same as generate-demo.ts
7. `generateBatchHTML(results)` — Generate HTML with N rows, each row showing original, generated, and QC report tab

**Quality Control (QC) step — `qualityCheck()`:**

After each Kie AI image is generated, send it to Claude Vision (claude-sonnet-4-5-20250929 with image input) with a structured QC prompt:

```
System: You are a quality control reviewer for AI-generated infographics. 
You will receive a generated infographic image and the prompt that was used to create it.

Analyze the image and check for these defects:
1. DUPLICATED TEXT: Any line of text that appears twice (exact or near-exact repeat). This is a common AI image generation artifact.
2. GARBLED/UNREADABLE TEXT: Text that is distorted, overlapping, or illegible.
3. MISSING CONTENT: Key elements from the prompt that are missing from the image.
4. LAYOUT ISSUES: Elements overlapping, cut off, or positioned incorrectly.
5. STYLE MATCH: Does the overall aesthetic match what was requested? (dark background, neon accents, data visualization)

Respond with JSON:
{
  "pass": true/false,
  "issues": ["description of each issue found"],
  "transcription": "exact text content visible in the image, line by line",
  "styleMatch": "brief assessment of how well it matches the requested style",
  "confidence": 0.0-1.0
}

Be strict. If there are ANY duplicated text lines, it MUST fail.
```

The image is sent as base64 in the user message along with the original image prompt for comparison.

**QC outcomes:**
- `pass: true` → Accept the infographic, proceed
- `pass: false` → Log the issues, retry generation (new Claude call for a fresh image prompt, then new Kie AI call). Max 2 retries (3 total attempts).
- After max retries, accept whatever we have but flag it in the HTML output with a warning badge

**Main flow:**
```
1. Scrape posts from Apify (sequential — single API call)
2. For all 3 posts in parallel (Promise.allSettled):
   a. Call Claude to generate post text + image prompt
   b. Call Kie AI to generate infographic
   c. Run QC check on the generated image
   d. If QC fails, retry from step (a) — up to 2 retries
3. Download all 3 original images in parallel (Promise.all)
4. Generate HTML with QC report tab for each post
5. Write to output/batch-comparison.html
```

Note: Steps 2a-2d are bundled per-post so retries don't block other posts. All 3 posts run their full generate→QC→retry loops in parallel.

**Claude prompt modifications:**
- Add to system prompt: `ATTRIBUTION: Every infographic MUST include "${USERNAME}" in the bottom attribution area. Use format: "Visual by ${USERNAME}" or "Follow ${USERNAME} for growth insights". This is required — never omit it.`
- Replace the hardcoded "Focus on the core concept..." with a generic instruction that adapts to whatever the post content is about
- Append the style-specific description to the image prompt instructions

**HTML modifications:**
- Show 3 rows instead of 1
- Each row has a style label ("Style: Bar Chart Comparison", "Style: Proportional Blocks", "Style: Ranked Horizontal Bars")
- Full-width rows with side-by-side original/generated cards (same layout as demo)
- Each generated card has a **QC tab** (toggleable) showing:
  - Pass/Fail badge (green/red)
  - Transcription of text found in the image
  - List of issues (if any)
  - Style match assessment
  - Number of attempts taken (e.g., "Attempt 2/3")
  - If QC failed after all retries, show a yellow warning badge "QC Failed — best attempt shown"

**Actions:**
- Create `scripts/generate-batch.ts` with all the above

**Files affected:**
- `scripts/generate-batch.ts` (new)

---

### Step 2: Create output directory if needed and run the script

**Actions:**
- Ensure `output/` directory exists
- Run: `npx tsx scripts/generate-batch.ts`
- Expected runtime: ~2-3 minutes (scrape ~30s, Claude parallel ~15s, Kie AI parallel ~60s, downloads ~5s)

**Files affected:**
- `output/batch-comparison.html` (new, generated)

---

### Step 3: Open and verify the HTML output

**Actions:**
- Open `output/batch-comparison.html` in the browser
- Verify all 3 rows display correctly
- Check that @olegrows appears in each generated infographic
- Check that each infographic has a distinct visual style
- Verify original post images load

**Files affected:**
- None (verification only)

---

### Step 4: Update CLAUDE.md

**Actions:**
- Add `generate-batch.ts` to scripts/ description
- Document the USERNAME configuration
- Note the parallelism strategy

**Files affected:**
- `CLAUDE.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `scripts/generate-demo.ts` — Original single-post script (kept for reference)
- `app/src/lib/apify.ts` — Apify scraping patterns (replicated in script for standalone use)
- `app/src/lib/brand-style.ts` — Brand style constants (BRAND_STYLE_PROMPT copied into script)

### Updates Needed for Consistency

- CLAUDE.md scripts section

### Impact on Existing Workflows

- No impact on existing app pipeline — this is a standalone script
- `output/batch-comparison.html` replaces `output/demo-comparison.html` as the latest comparison

---

## Validation Checklist

- [ ] Script runs without errors
- [ ] 3 posts scraped from CarlWeische via Apify
- [ ] 3 Claude content generation calls complete successfully (in parallel)
- [ ] 3 Kie AI calls complete successfully (in parallel)
- [ ] QC step runs on each generated infographic
- [ ] QC correctly identifies defects (duplicated text, garbled text, etc.)
- [ ] Failed QC triggers automatic retry (up to 2 retries)
- [ ] HTML file generated at `output/batch-comparison.html`
- [ ] HTML shows 3 rows of original vs generated
- [ ] Each generated card has a QC tab showing pass/fail, transcription, and issues
- [ ] Each infographic uses a visually distinct style
- [ ] @olegrows appears in each generated infographic's attribution
- [ ] Original post images display correctly
- [ ] Generated post text reads like authentic X content
- [ ] CLAUDE.md updated

---

## Success Criteria

The implementation is complete when:

1. `output/batch-comparison.html` opens in browser showing 3 rows of original CarlWeische posts alongside AI-generated posts + infographics
2. Each infographic uses a different visual style (bar comparison, proportional blocks, ranked list)
3. Each infographic includes @olegrows attribution
4. Each generated card includes a QC tab showing pass/fail status, text transcription, and any issues found
5. Infographics that passed QC have no duplicated text, garbled text, or major layout issues
6. Total script execution time is under 5 minutes (accounting for possible QC retries)

---

## Notes

- If Apify returns fewer than 3 image posts for CarlWeische, the script should gracefully handle it (generate for however many are available)
- If a Kie AI call fails for one post, the script should continue with the other 2 rather than failing entirely — use `Promise.allSettled` instead of `Promise.all`
- The username constraint for Kie AI may be tricky — Kie AI's content filter might reject prompts with specific usernames. If so, we can use a more generic attribution like "Follow for growth insights" and add the username only in the HTML overlay
- Consider adding timing logs to demonstrate the parallelism speedup
- QC uses Claude Vision (same model as content generation) — each QC call costs ~1 API call. With retries, worst case is 3 posts × 3 attempts × (1 generation + 1 QC) = 18 Claude calls, but typical case is 3-6
- The QC transcription doubles as documentation — future iterations can compare transcriptions across runs to measure consistency
- QC confidence score could be used in the future to auto-accept above a threshold without human review

---

## Implementation Notes

**Implemented:** 2026-04-19

### Summary

Created `scripts/generate-batch.ts` with full pipeline: Apify scraping → parallel Claude content generation → parallel Kie AI infographic generation → Claude Vision QC with auto-retry → HTML output with QC report tabs. All 3 posts generated successfully, all passed QC on first attempt. Total runtime: 217s (~3.6 min). Updated CLAUDE.md with batch script documentation.

### Deviations from Plan

1. **Image compression for QC**: Generated PNGs are ~5MB which exceeds Claude's 5MB base64 image input limit. Added `compressForQC()` function that converts PNG to JPEG via macOS `sips` when the image exceeds 3.5MB. This was not anticipated in the plan.
2. **Apify returned 584 tweets**: Much more than expected. The scraper worked well — got 3 high-engagement image posts (477, 321, 243 likes).
3. **All 3 posts passed QC on first attempt**: The retry mechanism wasn't exercised this run, but it's fully implemented and ready.

### Issues Encountered

1. **Claude 5MB image limit**: QC calls failed with "image exceeds 5 MB maximum" since Kie AI generates 2K resolution PNGs (~5MB). Resolved by adding JPEG compression via `sips` (macOS built-in) before sending to Claude Vision.
2. **No other issues**: Scraping, parallel Claude calls, parallel Kie AI calls, and QC all worked correctly on first run after the compression fix.
