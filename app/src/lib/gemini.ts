import fs from "fs";
import path from "path";

function getGeminiKey(): string {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  try {
    const rootEnvPath = path.resolve(process.cwd(), "..", ".env");
    if (fs.existsSync(rootEnvPath)) {
      const match = fs.readFileSync(rootEnvPath, "utf-8").match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match?.[1]?.trim()) return match[1].trim();
    }
  } catch {}
  return "";
}
const BASE = "https://generativelanguage.googleapis.com";

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 45_000
): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

export async function uploadVideo(
  videoBuffer: Buffer,
  filename: string
): Promise<{ uri: string; mimeType: string }> {
  const startRes = await fetchWithTimeout(
    `${BASE}/upload/v1beta/files?key=${getGeminiKey()}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(videoBuffer.length),
        "X-Goog-Upload-Header-Content-Type": "video/mp4",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: filename } }),
    },
    60_000
  );

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => "");
    throw new Error(`Gemini upload start failed (${startRes.status}): ${errText.slice(0, 200)}`);
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL returned from Gemini");

  const uploadRes = await fetchWithTimeout(
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Length": String(videoBuffer.length),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(videoBuffer),
    },
    180_000
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Gemini file upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`);
  }

  const result = await uploadRes.json();
  if (!result?.file?.uri) {
    throw new Error(`Gemini upload returned no file URI: ${JSON.stringify(result).slice(0, 200)}`);
  }

  await waitForFileActive(result.file.uri);

  return { uri: result.file.uri, mimeType: result.file.mimeType || "video/mp4" };
}

export async function uploadImage(
  imageBuffer: Buffer,
  filename: string,
  mimeType: string = "image/jpeg"
): Promise<{ uri: string; mimeType: string }> {
  const startRes = await fetchWithTimeout(
    `${BASE}/upload/v1beta/files?key=${getGeminiKey()}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(imageBuffer.length),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: filename } }),
    },
    30_000
  );

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => "");
    throw new Error(`Gemini image upload start failed (${startRes.status}): ${errText.slice(0, 200)}`);
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL returned from Gemini");

  const uploadRes = await fetchWithTimeout(
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Length": String(imageBuffer.length),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(imageBuffer),
    },
    60_000
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Gemini image upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`);
  }

  const result = await uploadRes.json();
  if (!result?.file?.uri) {
    throw new Error(`Gemini image upload returned no file URI: ${JSON.stringify(result).slice(0, 200)}`);
  }

  await waitForFileActive(result.file.uri);

  return { uri: result.file.uri, mimeType: result.file.mimeType || mimeType };
}

async function waitForFileActive(fileUri: string): Promise<void> {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetchWithTimeout(`${fileUri}?key=${getGeminiKey()}`, {}, 15_000);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.state === "ACTIVE") return;
      if (data.state === "FAILED") throw new Error("Gemini file processing failed");
    } catch (err) {
      if (err instanceof Error && err.message.includes("processing failed")) throw err;
    }
  }
  throw new Error("Gemini file processing timed out after 2 minutes");
}

const DEEP_VISUAL_ANALYSIS = `
When analyzing visuals, provide an extremely detailed breakdown:
- Visual composition and layout structure
- Color palette and color relationships
- Typography choices (fonts, sizes, weights, hierarchy)
- Information architecture and visual flow
- Design techniques (contrast, alignment, proximity, repetition)
- Iconography and decorative elements
- How the visual reinforces or extends the text message
- What makes this visual attention-grabbing in a Twitter feed
- Specific design elements that could be replicated or adapted`;

interface AnalyzePostOptions {
  text: string;
  prompt: string;
  mediaFiles?: Array<{ uri: string; mimeType: string }>;
}

export async function analyzePost(options: AnalyzePostOptions): Promise<string> {
  const { text, prompt, mediaFiles } = options;

  const parts: Array<Record<string, unknown>> = [];

  const fullPrompt = mediaFiles && mediaFiles.length > 0
    ? `${prompt}\n\n${DEEP_VISUAL_ANALYSIS}\n\nOriginal post text:\n${text}`
    : `${prompt}\n\nOriginal post text:\n${text}`;

  parts.push({ text: fullPrompt });

  if (mediaFiles) {
    for (const file of mediaFiles) {
      parts.push({ file_data: { mime_type: file.mimeType, file_uri: file.uri } });
    }
  }

  return callGemini(parts);
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
];

async function callGemini(parts: Array<Record<string, unknown>>): Promise<string> {
  let lastError = "";

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetchWithTimeout(
          `${BASE}/v1beta/models/${model}:generateContent?key=${getGeminiKey()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts }] }),
          },
          120_000
        );
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (res.status === 404) {
        // Model not available on this tier/account, immediately try next candidate model
        lastError = `Model ${model} returned 404`;
        break;
      }

      if (res.status === 503 || res.status === 429) {
        // Temporary spike or rate limit on this model, try next candidate model in list
        const errText = await res.text().catch(() => "");
        lastError = `${model} returned ${res.status}: ${errText.slice(0, 150)}`;
        console.warn(`[Gemini] ${model} unavailable (${res.status}), trying next fallback model...`);
        break;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        lastError = `${model} failed (${res.status}): ${errText.slice(0, 150)}`;
        break;
      }

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Gemini returned invalid JSON: ${raw.slice(0, 200)}`);
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const reason = data?.candidates?.[0]?.finishReason || "unknown";
        throw new Error(`No text in Gemini response (finishReason: ${reason})`);
      }

      return text;
    }
  }

  throw new Error(`Gemini analysis failed across all fallback models: ${lastError}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Studio Asset Generation (replaces Claude + Kie AI entirely)
// ────────────────────────────────────────────────────────────────────────────

export interface StudioAssets {
  hookFormula: string;
  whyItWorked: string;
  visualArchetype: string;
  redditAeoAdaptation: string;
  personalizeQuestion: string;
  claudePromptPacket: string;
  chatgptImagePrompt: string;
}

interface GenerateStudioOptions {
  postText: string;
  analysis: string;
  generationPrompt: string;
}

/**
 * Calls Gemini 2.5 Flash with the full generation prompt and parses the
 * structured JSON into the 7 studio asset fields.
 *
 * COST: Uses GEMINI_API_KEY only. Zero Anthropic / Kie AI spend.
 */
export async function generateStudioAssets(
  options: GenerateStudioOptions
): Promise<StudioAssets> {
  const { postText, analysis, generationPrompt } = options;

  const fullPrompt = `You are the Master Reverse-Engineering Engine for an elite Reddit Marketing & AEO/GEO Agency ($1M–$2M operator caliber).
Your job is to reverse-engineer the provided viral X post into our exact agency niche, extract its core psychological formula, and produce a complete, self-contained prompt packet for Claude Pro.

AGENCY OPERATING FOUNDATION:
- Service: Organic Reddit Distribution & LLM Citation Engineering (AEO/GEO).
- ICP: B2B AI SaaS, Developer Tools, and Tech Startups (specifically 2.5–3.5 months post-funding).
- Core Pain Points:
  1. The Brand Void (empty search for "{startup} review reddit", hallucinated Google AI Overviews).
  2. The LLM Hijack (ChatGPT/Perplexity category queries citing competitor Reddit threads).
- The Enemies: Bot upvote farms (domain blacklists), lazy SEO agencies (6-month blog timelines), traditional PR firms ($10k Forbes articles with zero trials).
- Secret Sauce: Aged high-CQS accounts, localized warmup history, 100% subreddit rule compliance, subtle unlinked mentions over anchor links, >95% thread survival tracking.
- Performance Guarantee: 1 Million impressions in 2 months or we work for free.
- Proof Vectors at 0 Clients: Campaign data from past distribution for 2–3 YC-backed startups, public subreddit launch dissections, live 48-hour Perplexity/ChatGPT citation shifts.

BRANDED INFOGRAPHIC VISUAL ARCHETYPES (MANDATORY CLASSIFICATION):
Evaluate the core viral mechanism of the post. Categorize "visual_archetype" into EXACTLY ONE of these 6 options:
1. "Bar Chart Comparison" (Reference: infographic 1):
   - Dominant side-by-side vertical bar chart comparing two entities (e.g., Google vs 13 biggest sites, Reddit vs 10 review platforms, organic CQS vs paid ads).
   - Primary hero bar: neon chartreuse (#C8FF00) with glowing bloom, large bold stat on top (e.g. '85.8B'), ranking below ('#1').
   - Secondary bar: dark fill with stacked white brand/platform logos inside, stat on top ('#2 - #14').
   - Thin dark gray horizontal grid lines, 3:4 vertical layout.
2. "Proportional Blocks" (Reference: infographic 2):
   - Vertically stacked proportional rectangular blocks with flush edges and dimension bracket annotations on right.
   - Hero block (~70-85% area): neon chartreuse (#C8FF00) with bold percentage centered inside (e.g. '85% of brand mentions in AI answers come from third-party sites').
   - Medium block (~10-15%): electric blue (#3B82F6) (e.g. '13% brand-owned domain').
   - Small block (~2-5%): white (#FFFFFF) (e.g. '2% uncited').
3. "Ranked Horizontal Bars" (Reference: infographic 3):
   - Clean leaderboard ranking 10-15 rows.
   - Each row: white outlined domain/platform icon on left, item name, proportional horizontal neon chartreuse (#C8FF00) bar extending right, percentage/value at end of bar.
   - Thin dark gray horizontal separator lines, compact row spacing.
4. "Timeline" (Reference: infographic 4):
   - Upward progression / line chart running bottom-left to top-right on pure black background with diagonal texture.
   - Data points as glowing neon chartreuse (#C8FF00) dots.
   - Left side: quoted milestones / contrarian statements (e.g. 'SEO is dead', 'AI killed Google') with year and context.
   - Right side: metric values along vertical axis ('$1B', '$10B' ... '$100B+').
5. "Pyramid / Funnel" (Reference: infographic 5):
   - 3-tier triangular pyramid shape.
   - Top tier (apex / conversion): neon chartreuse (#C8FF00) fill with white label (e.g. 'Convert: Competitor comparisons, buyer guides').
   - Middle tier: white (#FFFFFF) fill with dark label (e.g. 'Discover: Case studies, pain points, data studies').
   - Bottom tier (broadest): electric blue (#3B82F6) fill with white label (e.g. 'Awareness: Educational guides, trends').
   - Thin callout lines extending right to specific bullet points for each tier.
6. "Text-Only":
   - Use ONLY when the post relies strictly on punchy personal narrative, contrarian founder philosophy, or raw copy where an infographic would feel forced or dilute the message.

ANTI-AI-SLOP DIRECTIVES (MUST ENFORCE IN CLAUDE PROMPT PACKET):
- No symmetric architecture (vary sentence length sharply; mix 4-word punchlines with dense operational sentences).
- No bolded colons for lists (**Label**: Description). Write naturally.
- No em dashes (—). Use periods.
- No rule of 3 triplets.
- No softeners or disclaimers ("It's important to note", "While not a silver bullet", "Ultimately").
- No X/Y/Z patterns ("It's not X, not Y, but Z").
- Active verbs over is/are.
- Banned buzzwords: delve, testament, unlock, game-changer, landscape, crucial, harness, tailor, tapestry, symphony, navigate.
- No emoji numbered lists (1️⃣, 🧵, 🚀, 💡).

TASK SPECIFICATION:
${generationPrompt}

---
SOURCE SCRAPED POST TEXT:
${postText}

GEMINI DEEP ANALYSIS OF THIS SOURCE POST:
${analysis.slice(0, 2000)}

---
CRITICAL REQUIREMENT FOR "claude_prompt_packet":
The "claude_prompt_packet" must be a ready-to-run master prompt for Claude Pro that:
1. Tells Claude: "Adopt the persona of a highly successful, battle-tested Reddit & AEO Marketing Agency Owner ($1M–$2M revenue level) operating in my exact spot."
2. Instructs Claude to reverse-engineer the source post's viral structure, hook tension, sentence rhythm, and emotional triggers into our Reddit/AEO agency domain.
3. Explicitly tells Claude: "If I have left [INSERT MY QUICK ANSWER HERE] blank or only gave brief notes, do NOT give generic advice. Think like a successful Reddit agency owner in my shoes: proactively inject realistic operational numbers, specific subreddit examples (r/SaaS, r/devops, r/microsaas), automod triggers, or live citation test mechanics."
4. Mandates Claude to output:
   - 5 High-Hook Variations (under 240 chars each)
   - 1 Standalone Banger Post (short, punchy, opinionated)
   - 1 Full Viral Thread (6–10 tweets: Hook -> Context/Trap -> Concrete Steps -> Proof Vector -> Soft CTA / Lead Magnet 'HIJACK' or 'SUBS')
   - Visual Direction: Provide the visual archetype ([ARCHETYPE]) and exact instructions for what concept/data to visualize and how it will look.
5. Enforces all strict anti-slop rules (no em dashes, no bold colons, no emoji lists).

---
Return ONLY a valid JSON object (no markdown fences, no preamble) with exactly these keys:
{
  "why_it_worked": "2 concise sentences explaining the operator credibility trigger, psychological tension, and engagement driver.",
  "hook_formula": "Abstracted bracketed template of the opening hook.",
  "visual_archetype": "One of: ['Bar Chart Comparison', 'Proportional Blocks', 'Ranked Horizontal Bars', 'Timeline', 'Pyramid / Funnel', 'Text-Only']",
  "reddit_aeo_adaptation": "2 sentences explaining how this hook maps directly to our Reddit/AEO agency positioning.",
  "personalize_question": "1 pointed question asking the operator for a specific subreddit stat, observation, or lesson.",
  "claude_prompt_packet": "The complete, self-contained master prompt for Claude Pro described above.",
  "chatgpt_image_prompt": "If visual_archetype is 'Text-Only', return empty string. Otherwise, write a complete prompt for ChatGPT Images specifying WHAT it is (exact title, numbers, data) and HOW it will look (3:4 vertical, pure black #000000 background, neon chartreuse #C8FF00 and electric blue #3B82F6 accents, bold typography, matching the archetype from the references)."
}`;

  const rawText = await callGemini([{ text: fullPrompt }]);

  // Strip markdown fences if Gemini wraps in them despite instruction
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: return raw text as the prompt packet
    return {
      hookFormula: "",
      whyItWorked: "",
      visualArchetype: "Text-Only Punchy",
      redditAeoAdaptation: "",
      personalizeQuestion: "What specific observation or data point can you add from your own research today?",
      claudePromptPacket: rawText,
      chatgptImagePrompt: "",
    };
  }

  return {
    hookFormula: String(parsed.hook_formula || ""),
    whyItWorked: String(parsed.why_it_worked || ""),
    visualArchetype: String(parsed.visual_archetype || "Text-Only Punchy"),
    redditAeoAdaptation: String(parsed.reddit_aeo_adaptation || ""),
    personalizeQuestion: String(parsed.personalize_question || ""),
    claudePromptPacket: String(parsed.claude_prompt_packet || ""),
    chatgptImagePrompt: String(parsed.chatgpt_image_prompt || ""),
  };
}
