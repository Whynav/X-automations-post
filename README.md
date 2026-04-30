# X AI

AI-powered viral content analyzer and generator for X/Twitter. Scrapes top-performing posts from marketing/CRO creators, deeply analyzes them, and generates ready-to-publish content with branded infographic images.

## How It Works

**4-phase pipeline:**

1. **Scrape** — Pulls recent posts from curated X/Twitter creators via Apify
2. **Analyze** — Gemini 2.5 Flash performs deep multimodal analysis (text + images)
3. **Generate** — Claude classifies each post and generates new content:
   - **Infographic (60%)** — Post text + image prompt → Kie AI generates a branded infographic
   - **Personal (30%)** — Post text paired with a personal photo
   - **Text-only (10%)** — Standalone text post
4. **Persist** — Saves everything to CSV + downloads generated images

## Setup

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/melnikoff-oleg/x-ai.git
cd x-ai
cd app && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your API keys in `.env`:

| Variable | Service | Get it at |
|----------|---------|-----------|
| `APIFY_API_TOKEN` | Apify (X/Twitter scraping) | [apify.com](https://apify.com) |
| `GEMINI_API_KEY` | Google Gemini (multimodal analysis) | [aistudio.google.com](https://aistudio.google.com) |
| `ANTHROPIC_API_KEY` | Anthropic Claude (content generation) | [console.anthropic.com](https://console.anthropic.com) |
| `KIE_AI_API_KEY` | Kie AI (infographic generation) | [kie.ai](https://kie.ai) |

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- **Posts** `/posts` — Side-by-side view of original tweets and AI-generated drafts with Twitter-authentic styling
- **Creators** `/creators` — Manage X creator accounts to scrape
- **Configs** `/configs` — Manage analysis and generation prompts
- **Run** `/run` — Execute the full pipeline with live progress streaming

## Scripts

```bash
# Generate content from a single creator (3 posts, with QC)
npx tsx scripts/generate-batch.ts

# Generate 10 posts with AI-driven style classification
npx tsx scripts/generate-smart.ts
```

## Tech Stack

- Next.js 16 (Turbopack, App Router)
- TypeScript, Tailwind CSS v4
- shadcn/ui with base-ui primitives
- CSV file-based storage
- SSE for real-time pipeline progress

## Data

Pre-seeded with 8 marketing/CRO creators and a "Growth Marketing" config. CSV files in `data/` store creators, configs, and generated posts.
