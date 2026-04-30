# Strategy

## Current Focus Period

April 2026 — X AI app build, polish, and stabilization.

## Strategic Priorities

1. **X AI MVP complete** — Full pivot from TikTok to X/Twitter with 4-phase pipeline producing ready-to-post content + branded infographics
2. **Pipeline reliability** — Scraping, analysis, content generation, and image generation work end-to-end with robust error handling and retries
3. **Aesthetic parity** — UI matches the Instagram app's dark glass-morphism design (purple gradients, backdrop-blur, rounded-2xl cards)
4. **Content quality** — Generated posts are punchy, authentic X copy. Infographics match brand style consistently.

## What Success Looks Like

- App runs locally, full 4-phase pipeline executes without errors
- 10 seeded marketing/CRO creators scrape successfully
- Gemini deeply analyzes post content + visuals
- Claude generates ready-to-post text + image prompts (JSON format)
- Kie AI generates branded infographic images matching reference style
- Posts page shows both reference tweet and generated content
- Long-form AI analysis renders beautifully in modals

## Key Decisions Made

- **Apify for scraping** — Using `quacker~twitter-scraper` actor for X/Twitter
- **CSV storage** — Simple file-based storage matching Instagram app pattern, no database needed yet
- **Gemini 2.5 Flash** — For multimodal analysis with deep visual analysis focus
- **Kie AI nano-banana-2** — For infographic image generation with reference image style matching
- **Dark theme** — Matching Instagram app exactly with oklch color space, glass-morphism utilities
- **Sequential pipeline** — 1 worker for analysis/generation phases to avoid rate limits
- **30s video cap** — Videos longer than 30s are skipped to conserve Gemini credits
- **Brand style system** — Reference image codified into constants, injected into Claude + Kie AI
- **Custom markdown CSS** — `.markdown-body` in globals.css instead of Tailwind prose for full dark-theme control
