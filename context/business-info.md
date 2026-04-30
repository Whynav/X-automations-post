# Business Info

## Organization Overview

Oleg builds AI-powered content creation tools for social media. The focus is on helping creators and brands produce viral short-form content by analyzing what works for top creators in their niche.

## Products / Services / Focus Areas

- **Social Media AI (Instagram)** — Existing app that curates Instagram creator databases, scrapes their latest Reels, analyzes them with Gemini, and generates new content concepts with Claude. Live at github.com/melnikoff-oleg/social-media.
- **X AI** — This project. Scrapes viral X/Twitter posts via Apify, analyzes with Gemini multimodal (deep visual analysis), generates ready-to-post X content with Claude, and creates branded infographic images via Kie AI. Dark glass-morphism UI.

## Key Context

- Both apps share the same architecture: Apify scraping → Gemini analysis → Claude generation → file storage
- X AI extends the pipeline with a 4th phase: Kie AI image generation for branded infographics
- The Instagram app is the canonical reference for UI/UX — X AI matches its aesthetic (dark theme, glass-morphism, purple gradients)
- Target niche: marketing, CRO, growth. Pre-configured with "Growth Marketing" config
- Tech: Next.js 16 (Turbopack), TypeScript, Tailwind v4, shadcn/ui with base-ui primitives
