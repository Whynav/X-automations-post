# Current Data

## App Status

| Component | Status | Notes |
| --------- | ------ | ----- |
| X/Twitter scraping (Apify) | Working | `apidojo~twitter-scraper-lite` with optimized `twitterHandles` query (~5s/creator), 8+ marketing/CRO creators |
| Media download | Ready | Twitter CDN URLs (pbs.twimg.com), 120s timeout |
| Gemini analysis | Ready | 2.5 Flash, deep visual analysis for images, 30s video cap, exponential backoff |
| Claude content generation | Ready | `claude-sonnet-4-5-20250929`, JSON output with postText + imagePrompt |
| Kie AI image generation | Ready | nano-banana-2, reference image style matching, 3:4 vertical infographics |
| Pipeline SSE streaming | Ready | Real-time progress with 4 phases: scrape → analyze → generate (with classification sub-step) → done |
| Style classification | Working | Single Claude call assigns 3 categories: infographic (60%), personal photo (30%), text-only (10%). Ratio enforced programmatically. |
| UI — Posts page | Complete | Twitter-authentic tweet cards (X dark theme colors, verified badges, action bar with hover states, full-height vertical images). Side-by-side original + AI generated layout. |
| UI — Other pages | Complete | Dark glass-morphism matching Instagram reference app aesthetic |
| CSV persistence | Ready | creators.csv, posts.csv, configs.csv in data/ with write locks |
| Markdown rendering | Complete | Custom `.markdown-body` CSS for dark theme |
| Brand style system | Updated | Dark/neon style (black bg, #C8FF00 accent). 5 reference infographics in references/ |
| Batch generation script | Validated | `scripts/generate-batch.ts` — parallel pipeline with QC, user confirmed high quality |
| Smart generation script | Working | `scripts/generate-smart.ts` — 10-post with AI-driven style classification (5 styles), 7 infographic + 3 text-only |
| Quality control (QC) | Working | Claude Vision reviews each infographic for defects, auto-retry on failure |

## Seeded Creators

| Username | Category | Source |
| -------- | -------- | ------ |
| CarlWeische | marketing-cro | User-provided |
| boringmarketer | marketing-cro | User-provided |
| blvckledge | marketing-cro | User-provided |
| PJaccetturo | marketing-cro | User-provided |
| richpage | marketing-cro | Researched |
| maboroshi_mrsharma | marketing-cro | Researched |
| KateBour | marketing-cro | Researched |
| thejustinwelsh | marketing-cro | Researched |
| amandanat | marketing-cro | Researched |
| kieranflanagan | marketing-cro | Researched |

## Known Limitations

- Gemini free tier has daily quota limits — pipeline may hit 429 errors during heavy testing
- Kie AI images expire from CDN after 24 hours — downloaded to data/generated-images/ immediately
- Kie AI generation takes 40-110 seconds per image — generation phase is the bottleneck
- Kie AI generated PNGs are ~5MB — must compress to JPEG before sending to Claude Vision for QC (5MB limit)
- Kie AI content filter rejects image prompts containing real person/brand names — use generic terms
- No database — CSV storage works for small scale but won't scale to large datasets
- Videos > 30 seconds use thumbnail + text analysis only (not skipped entirely)
- Apify actor field names may vary — normalization layer handles multiple formats
