# Plan: Infographic Visual Quality — Style-Matched Generation Demo

**Created:** 2026-04-19
**Status:** Implemented
**Request:** Remove brand-style.jpeg, use infographic 1 as style reference, pick a CarlWeische post suited for an infographic, generate a new post + infographic matching the style, and show original vs generated in a standalone HTML page.

---

## Overview

### What This Plan Accomplishes

Creates a one-off visual quality test: takes CarlWeische's "Bezos 3 decisions/day" post, generates a new X post + branded infographic in the exact style of the reference infographics (black background, neon yellow-green accent, white bold typography, data-viz layout), and renders a side-by-side HTML comparison page showing the original post alongside the generated post + infographic.

### Why This Matters

The current brand style (warm cream/beige, sage green) doesn't match the actual reference infographics the user has collected. These infographics share a completely different aesthetic: black backgrounds, neon yellow-green (#C8FF00-ish) accents, white bold typography, data visualization focus. This exercise validates whether we can produce infographics that match the real target style.

---

## Current State

### Relevant Existing Structure

- `references/brand-style.jpeg` — Old brand style reference (to be removed)
- `references/infographic 1-5.jpeg` — 5 reference infographics with consistent dark/neon style
- `app/src/lib/brand-style.ts` — Brand style constants (currently describes cream/beige palette — wrong)
- `app/src/lib/claude.ts` — Claude content generation (injects BRAND_STYLE_PROMPT into system prompt)
- `app/src/lib/kie.ts` — Kie AI image generation (nano-banana-2 model)
- `data/posts.csv` — Contains CarlWeische posts with analysis

### Gaps or Problems Being Addressed

- `brand-style.jpeg` and `brand-style.ts` describe a completely different aesthetic (warm cream/beige) than the 5 reference infographics the user actually wants to match (dark/neon)
- No way to visually compare original vs generated content outside the app
- Need to validate Kie AI can reproduce the target infographic style

---

## Proposed Changes

### Summary of Changes

- Delete `references/brand-style.jpeg`
- Update `brand-style.ts` to match the actual reference infographic style (black bg, neon yellow-green, white bold typography)
- Create a one-off Node.js script that: calls Claude API to generate post text + image prompt for Carl's Bezos post, calls Kie AI to generate the infographic, and outputs a standalone HTML file
- The HTML file shows the original CarlWeische post (text + original image) side-by-side with the generated post (text + generated infographic)

### Selected Source Post

**CarlWeische — Bezos "3 Decisions" post** (ID: `832f2765...`)
> Jeff Bezos once said: "Only making three high-quality, high-impact decisions per day is enough." The key concept is to make fewer but more important decisions and avoid decision fatigue...

This post is ideal for an infographic because:
- Has a clear framework (3 decisions/day)
- Contains specific numbers and a named authority (Bezos)
- The concept translates well to a visual hierarchy/data layout
- Has an existing analysis in the CSV

### Style Reference

**Infographic 1** — "Google vs The 13 Next Biggest Websites"

Key visual elements to match:
- **Background:** Pure black (#000000) with subtle diagonal line texture
- **Primary accent:** Neon yellow-green (#C8FF00 / chartreuse)
- **Text:** White bold sans-serif for headings, lighter weight for body
- **Data viz:** Bar chart / area comparison with glowing accent color
- **Layout:** Large bold title at top, chart/visual in center, source attribution at bottom
- **Typography:** Bold, condensed, high-impact — NOT serif/editorial
- **Icons:** White outlined/filled icons for recognizable brands/concepts
- **Overall feel:** Dark, modern, data-forward, high contrast

### New Files to Create

| File Path | Purpose |
| --------- | ------- |
| `scripts/generate-demo.ts` | One-off script to generate post + infographic + HTML output |
| `output/demo-comparison.html` | Standalone HTML page showing original vs generated |

### Files to Modify

| File Path | Changes |
| --------- | ------- |
| `app/src/lib/brand-style.ts` | Update all style constants to match dark/neon infographic style |

### Files to Delete

| File Path | Reason |
| --------- | ------ |
| `references/brand-style.jpeg` | User requested removal; doesn't match target style |

---

## Design Decisions

### Key Decisions Made

1. **Bezos "3 Decisions" post over "Urgency" post**: The Bezos post has structured, quantifiable content (specific number, clear framework) that translates better to an infographic. The "Urgency" post is more narrative/philosophical.

2. **Standalone script, not app integration**: This is a quality validation exercise. A standalone script is faster to iterate on and lets us focus on the prompt/output quality without touching the app's pipeline flow.

3. **Update brand-style.ts permanently**: The 5 reference infographics all share the same dark/neon aesthetic. This isn't a one-off preference — it's the actual target style. Updating the constants benefits all future pipeline runs too.

4. **Infographic 1 as primary reference**: User specified "pick the first infographic." It's also the most representative of the style (bar chart, glowing accents, bold title, clean layout).

5. **Self-contained HTML file**: Embeds images as base64 so the file can be shared, opened anywhere, and doesn't depend on local file paths or a running server.

### Alternatives Considered

- **Using the app's pipeline**: Would work but adds overhead (need SSE, CSV updates, etc.) for what's a one-off quality test.
- **Keeping brand-style.jpeg**: Conflicts with the actual reference style. Removing it aligns the codebase with reality.

### Open Questions

1. **Should the script also send the reference infographic image to Kie AI as `image_input` for style matching?** The current pipeline doesn't do this (it used to send brand-style.jpeg). We should send infographic 1 as the reference image so Kie AI can match the style visually, not just from the text prompt.

---

## Step-by-Step Tasks

### Step 1: Delete brand-style.jpeg

Remove the old brand reference image.

**Actions:**
- Delete `references/brand-style.jpeg`

**Files affected:**
- `references/brand-style.jpeg` (deleted)

---

### Step 2: Update brand-style.ts

Rewrite the brand style constants to match the dark/neon infographic style from the reference images.

**Actions:**
- Update `BRAND_STYLE` object:
  - `colors.background`: `"pure black (#000000) with subtle diagonal line texture"`
  - `colors.primaryAccent`: `"neon yellow-green / chartreuse (#C8FF00)"`
  - `colors.secondaryAccent`: `"electric blue (#3B82F6) for secondary data"`
  - `colors.headingText`: `"white (#FFFFFF)"`
  - `colors.bodyText`: `"light gray (#CCCCCC)"`
- Update `typography`:
  - `titleFont`: `"bold condensed sans-serif (Impact/Bebas Neue style) — all caps or mixed case for maximum impact"`
  - `bodyFont`: `"clean sans-serif (Inter/Helvetica style)"`
  - `bulletStyle`: `"none — use data visualization instead of bullet lists"`
- Update `layout`:
  - `aspectRatio`: keep `"3:4 vertical"`
  - `style`: `"data-driven infographic with black background and neon accents"`
  - `hierarchy`: `"large bold title → data visualization/chart → source attribution at bottom"`
- Update `tone`: `"bold, data-forward, modern — like a premium analytics dashboard made shareable"`
- Update `referenceImagePath`: `"references/infographic 1.jpeg"`
- Update `BRAND_STYLE_PROMPT` to describe the new style comprehensively
- Update `REFERENCE_IMAGE_PATH` to point to `"references/infographic 1.jpeg"`

**Files affected:**
- `app/src/lib/brand-style.ts`

---

### Step 3: Create the generation script

Create `scripts/generate-demo.ts` — a standalone Node.js/TypeScript script that:

1. Reads the CarlWeische Bezos post data from `data/posts.csv` (ID starts with `832f2765`)
2. Reads the reference infographic (`references/infographic 1.jpeg`) as base64
3. Calls the Claude API to generate:
   - A new X post text (re-imagining the Bezos insight for our brand voice)
   - An image prompt for Kie AI describing the infographic to generate
4. Calls Kie AI to generate the infographic using:
   - The image prompt from Claude
   - The reference infographic as `image_input` for style matching
5. Downloads the generated infographic
6. Downloads the original post's image (from Twitter CDN via the media URL)
7. Generates a self-contained HTML file at `output/demo-comparison.html` with:
   - Side-by-side layout: left = original post (text + image), right = generated post (text + infographic)
   - Dark background matching the app's aesthetic
   - Images embedded as base64
   - Post text displayed in X/Twitter-style formatting
   - Metadata (views, likes for original; "Generated" label for new)

**Script structure:**
```typescript
// Load env from .env at workspace root
// Read CSV, find the target post
// Read reference infographic as base64
// Call Claude API with analysis + updated brand style prompt
// Call Kie AI with image prompt + reference image
// Download both images
// Generate HTML
// Write to output/demo-comparison.html
```

**The Claude prompt should include:**
- The post's existing analysis from the CSV
- The updated BRAND_STYLE_PROMPT
- Explicit instruction to design the infographic content around the "3 high-quality decisions" framework
- Instruction to match infographic 1's exact visual style (black bg, neon yellow-green, bar chart / visual data)

**The Kie AI call should include:**
- The image prompt from Claude
- `image_input` with the base64 of infographic 1 for style reference
- Same params: `nano-banana-2`, `3:4`, `2K`, `png`

**Files affected:**
- `scripts/generate-demo.ts` (new)

---

### Step 4: Create output directory and run the script

**Actions:**
- Create `output/` directory
- Run the script: `npx tsx scripts/generate-demo.ts`
- Verify the HTML file is generated at `output/demo-comparison.html`

**Files affected:**
- `output/demo-comparison.html` (new, generated)

---

### Step 5: Open and verify the HTML output

**Actions:**
- Open `output/demo-comparison.html` in the browser
- Verify:
  - Original post text displays correctly
  - Original post image loads (embedded base64)
  - Generated post text is punchy, authentic X copy
  - Generated infographic matches the dark/neon style of infographic 1
  - Side-by-side layout looks clean
- Screenshot or share with user for feedback

**Files affected:**
- None (verification only)

---

### Step 6: Update CLAUDE.md

**Actions:**
- Remove references to `brand-style.jpeg` throughout CLAUDE.md
- Update the Brand Style System section to reflect the new dark/neon aesthetic
- Add `output/` directory to workspace structure
- Add `scripts/` directory to workspace structure

**Files affected:**
- `CLAUDE.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/lib/claude.ts` — imports `BRAND_STYLE_PROMPT` from `brand-style.ts` (will benefit from updated style)
- `app/src/lib/pipeline.ts` — calls `generateInfographic` which may reference brand style
- `CLAUDE.md` — documents brand style system and references directory

### Updates Needed for Consistency

- CLAUDE.md brand style section needs rewriting to reflect dark/neon style
- Any documentation referencing "warm cream/beige" or "sage green" needs updating

### Impact on Existing Workflows

- Future pipeline runs (`/run` page) will use the updated brand style — all new infographics will follow the dark/neon aesthetic instead of cream/beige
- Existing generated images in `data/generated-images/` will still use the old style (no retroactive change)

---

## Validation Checklist

- [ ] `references/brand-style.jpeg` is deleted
- [ ] `brand-style.ts` describes the dark/neon infographic style
- [ ] Script runs without errors and produces `output/demo-comparison.html`
- [ ] HTML page opens in browser and shows side-by-side comparison
- [ ] Original post text and image display correctly
- [ ] Generated post text reads like authentic X content (not AI slop)
- [ ] Generated infographic uses black background with neon yellow-green accents
- [ ] Generated infographic has bold, high-impact typography
- [ ] Generated infographic contains specific data/framework (not generic filler)
- [ ] CLAUDE.md updated to reflect changes

---

## Success Criteria

The implementation is complete when:

1. Opening `output/demo-comparison.html` shows the original CarlWeische post next to a newly generated post with a Kie AI infographic that visually matches the style of infographic 1
2. The generated infographic uses black background, neon yellow-green accents, bold white typography, and data-driven layout
3. The generated post text is punchy, specific, and reads like real X content from a marketing expert

---

## Notes

- If Kie AI doesn't support `image_input` for style reference in the current API, fall back to a very detailed text-only prompt describing the visual style
- The reference infographics are all by "Jake Ward" — they share a consistent, distinctive style that's the real target aesthetic
- This exercise informs whether we need to adjust the Claude image prompt strategy, the Kie AI model/params, or add post-processing
- Consider keeping the script around for future A/B testing of different prompt strategies

---

## Implementation Notes

**Implemented:** 2026-04-19

### Summary

Deleted brand-style.jpeg, rewrote brand-style.ts with dark/neon style constants, created generate-demo.ts script, ran it to produce a side-by-side HTML comparison of original CarlWeische post vs AI-generated post + Kie AI infographic, and updated CLAUDE.md.

### Deviations from Plan

1. **Kie AI `image_input` not supported as base64 data URI** — API returned "File type not supported" when sending base64. Fell back to text-only prompt (as anticipated in the plan's Notes section).
2. **Image prompt must avoid real names** — Kie AI content filter rejected prompts containing "Jeff Bezos". Added a constraint to Claude's prompt to use generic terms ("top CEO", "elite founders") in image prompts only. Post text can still reference real people.
3. **Script module resolution** — `csv-parse` and other deps live in `app/node_modules`, not root. Used explicit `require()` with resolved paths from `app/node_modules`.

### Issues Encountered

- Kie AI content policy filter triggered on first attempt (real names in image prompt) — resolved by adding explicit constraint to Claude prompt
- Module resolution for standalone script outside app/ — resolved by requiring from app/node_modules directly
