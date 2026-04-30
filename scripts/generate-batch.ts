import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const APP_MODULES = path.join(ROOT, "app", "node_modules");

const dotenv = require(path.join(APP_MODULES, "dotenv"));
dotenv.config({ path: path.join(ROOT, ".env") });

const Anthropic = require(path.join(APP_MODULES, "@anthropic-ai", "sdk")).default;

// ─── Configuration ───────────────────────────────────────────────────────────

const USERNAME = "@olegrows";
const CREATOR = "CarlWeische";
const NUM_POSTS = 3;
const MAX_QC_ATTEMPTS = 3;

// ─── Style Descriptions ─────────────────────────────────────────────────────

const STYLES = [
  {
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
  {
    label: "Proportional Blocks",
    description: `SPECIFIC STYLE — PROPORTIONAL STACKED BLOCKS:
Create a proportional area/treemap infographic with stacked rectangular blocks of different sizes.
- The largest block should be neon yellow-green (#C8FF00), taking up ~70-80% of the area, with its percentage displayed large and centered inside
- A medium block in electric blue (#3B82F6), ~10-15% of the area, with its percentage centered inside
- A small block in white (#FFFFFF), ~2-5% of the area, with its percentage centered inside
- All blocks should be stacked vertically, flush against each other
- Dimension annotations on the right side with bracket lines and labels (e.g., "85% third-party domains")
- The visual should immediately communicate proportion/dominance at a glance
- Clean edges, no rounded corners on the blocks`,
  },
  {
    label: "Ranked Horizontal Bars",
    description: `SPECIFIC STYLE — HORIZONTAL BAR CHART (RANKED LIST):
Create a ranked horizontal bar chart infographic listing 10-15 items.
- Each row has: a small icon/symbol on the far left, then the item name, then a horizontal neon yellow-green (#C8FF00) bar extending right, then the percentage/value at the end of the bar
- Bars should be proportional to their values — longest bar at top, shortest at bottom
- Column headers at the top (e.g., "Category" and "Value") in light gray
- Compact row spacing — maximize the number of items visible
- Clean alignment — all icons, names, bars, and values perfectly aligned in columns
- The overall effect should look like a leaderboard or ranking table
- Thin horizontal separator lines between rows in very dark gray`,
  },
];

const BRAND_STYLE_PROMPT = `The generated infographic must match this exact visual style:

COLOR PALETTE: Pure black (#000000) background with subtle diagonal line texture for depth. Neon yellow-green / chartreuse (#C8FF00) as the primary accent — used for bar fills, highlighted text, key numbers, and glowing elements. Electric blue (#3B82F6) as a secondary accent for contrast data. White (#FFFFFF) for headings and primary text. Light gray (#CCCCCC) for secondary text and labels.

TYPOGRAPHY: Main title in bold condensed sans-serif (Impact/Bebas Neue style) — large, high-impact, taking up significant space at the top. Can be all caps or mixed case. Key numbers and stats in neon yellow-green, large and prominent. Body text and labels in clean sans-serif (Inter/Helvetica). Source attribution in small light gray at the bottom.

LAYOUT: 3:4 vertical aspect ratio. Large bold title occupying top 15-20% of the image. Central area dominated by data visualization. Bottom area has source attribution and optional branding. High contrast, minimal decorative elements.

DESIGN PRINCIPLES: Dark, modern, data-forward aesthetic. High contrast between black background and neon accents. No warm colors, no beige, no muted tones. Content must include specific numbers, real data points, and concrete comparisons — never generic filler.`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScrapedPost {
  id: string;
  text: string;
  url: string;
  mediaUrls: string[];
  views: number;
  likes: number;
  retweets: number;
}

interface QCResult {
  pass: boolean;
  issues: string[];
  transcription: string;
  styleMatch: string;
  confidence: number;
}

interface GenerationResult {
  post: ScrapedPost;
  styleLabel: string;
  postText: string;
  imagePrompt: string;
  imageBuffer: Buffer;
  originalImageBuffer: Buffer;
  qcResult: QCResult;
  attempts: number;
  qcPassed: boolean;
}

// ─── Apify Scraping ─────────────────────────────────────────────────────────

async function scrapeCreatorPosts(username: string, count: number): Promise<ScrapedPost[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");

  const actor = "apidojo~twitter-scraper-lite";
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`;

  console.log(`Scraping @${username} via Apify...`);
  const startTime = Date.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: `https://x.com/${username}` }],
      tweetsDesired: 20,
      proxyConfig: { useApifyProxy: true },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Apify scrape failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data: Record<string, unknown>[] = await res.json();
  console.log(`  Apify returned ${data.length} tweets (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

  const posts: ScrapedPost[] = data
    .filter((raw) => {
      const text = String(raw.fullText || raw.full_text || raw.text || "");
      if (text.startsWith("RT @")) return false;
      if (raw.isRetweet || raw.isReply) return false;

      const extEntities = raw.extendedEntities as Record<string, unknown> | undefined;
      const rawMedia = (extEntities?.media || raw.media) as Record<string, unknown>[] | undefined;
      if (!Array.isArray(rawMedia) || rawMedia.length === 0) return false;

      const hasImage = rawMedia.some((m) => String(m.type || "photo") === "photo");
      return hasImage;
    })
    .map((raw) => {
      const extEntities = raw.extendedEntities as Record<string, unknown> | undefined;
      const rawMedia = (extEntities?.media || raw.media) as Record<string, unknown>[] | undefined;
      const imageUrls = (rawMedia || [])
        .filter((m) => String(m.type || "photo") === "photo")
        .map((m) => String(m.media_url_https || m.media_url || ""));

      const idStr = String(raw.id || "");
      return {
        id: idStr,
        text: String(raw.fullText || raw.full_text || raw.text || ""),
        url: String(raw.twitterUrl || raw.url || `https://x.com/${username}/status/${idStr}`),
        mediaUrls: imageUrls,
        views: Number(raw.viewCount || raw.view_count || 0),
        likes: Number(raw.likeCount || raw.favorite_count || 0),
        retweets: Number(raw.retweetCount || raw.retweet_count || 0),
      };
    })
    .sort((a, b) => (b.likes + b.retweets) - (a.likes + a.retweets));

  const selected = posts.slice(0, count);
  console.log(`  Selected ${selected.length} image posts (top by engagement)`);
  for (const p of selected) {
    console.log(`    - ${p.likes} likes | ${p.text.slice(0, 60)}...`);
  }

  return selected;
}

// ─── Claude Content Generation ──────────────────────────────────────────────

async function generateWithClaude(
  post: ScrapedPost,
  styleDescription: string,
  username: string
): Promise<{ postText: string; imagePrompt: string }> {
  const client = new Anthropic();

  const systemPrompt = `You are an X/Twitter content creator and visual designer who produces viral posts for the marketing/CRO niche. You study viral reference posts, reverse-engineer what makes them blow up, and use those same viral mechanics to create new posts in YOUR niche — paired with branded infographics.

YOUR PROCESS:
1. STUDY the original post — identify its viral hook type, structure/format, psychological triggers, and engagement pattern
2. EXTRACT the viral mechanics — the hook formula, the sentence rhythm, the formatting structure, the emotional arc
3. APPLY those mechanics to create a brand new post about marketing, CRO, growth, or conversion optimization
4. The TOPIC of your post will often be different from the original — what carries over is the viral structure, not the subject matter

Your output is ALWAYS a JSON object with exactly two fields:
{
  "postText": "...",
  "imagePrompt": "..."
}

## Post Text Guidelines
- postText is PLAIN TEXT that gets copy-pasted directly into Twitter's compose box
- NEVER use markdown: no **bold**, no *italic*, no # headers, no [links](), no \`code\`
- NEVER include image descriptions, image captions, or [Image: ...] blocks — the image is handled separately
- NEVER reference or describe an attached image in the text — write as if the text stands alone
- Steal the viral structure, hook pattern, and format from the reference post — apply it to your niche
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

${styleDescription}

ATTRIBUTION: Every infographic MUST include "${username}" in the bottom attribution area. Use format: "Visual by ${username}" or "Follow ${username} for growth insights". This is required — never omit it.

The image prompt must describe:
1. The exact text content to render on the infographic (title, bullet points, key stats, etc.)
2. The visual layout and structure (how information is organized)
3. Specific color usage matching the brand palette
4. Typography direction
5. Any diagrams, charts, or visual metaphors to include
6. The overall composition and information hierarchy

CRITICAL: The text content in the infographic must be interesting, specific, and valuable — not generic AI filler. Use real numbers, counterintuitive insights, and actionable advice.

CRITICAL CONSTRAINT: Do NOT include any real person's name, brand name, or celebrity reference in the image prompt text. The image generator will reject content with real names. Use generic terms like "top CEO", "elite founders", etc. instead. The post text CAN reference real people — only the image prompt must avoid them.`;

  const userMessage = `Study this viral reference post. Reverse-engineer its hook type, structure, formatting pattern, and engagement triggers. Then use those same viral mechanics to write a NEW post about marketing/CRO/growth — the topic can be different, but the viral formula should carry over.

Reference Post Text:
${post.text}

Create an infographic that supports your new post's core concept in a compelling, data-forward way. Extract specific numbers, frameworks, or comparisons and make them visual.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Claude returned non-text block");

  let jsonStr = block.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const parsed = JSON.parse(jsonStr);
  if (!parsed.postText || !parsed.imagePrompt) throw new Error("Missing postText or imagePrompt");

  return parsed;
}

// ─── Kie AI Infographic Generation ──────────────────────────────────────────

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

async function generateInfographic(imagePrompt: string, label: string): Promise<Buffer> {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey) throw new Error("KIE_AI_API_KEY not set");

  const createRes = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt: imagePrompt,
        aspect_ratio: "3:4",
        resolution: "2K",
        output_format: "png",
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`Kie AI createTask failed (${createRes.status}): ${errText.slice(0, 300)}`);
  }

  const createResult = await createRes.json();
  const taskId = createResult.data?.taskId;
  if (!taskId) throw new Error(`No taskId: ${JSON.stringify(createResult).slice(0, 200)}`);

  console.log(`  [${label}] Kie AI task: ${taskId}`);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const statusRes = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!statusRes.ok) continue;

    const statusResult = await statusRes.json();
    const state = statusResult.data?.state;

    if (i % 5 === 4) console.log(`  [${label}] Poll ${i + 1}: ${state}`);

    if (state === "success" || state === "completed") {
      const resultJson = statusResult.data.resultJson;
      if (!resultJson) throw new Error("Task succeeded but no resultJson");

      const parsed = JSON.parse(resultJson);
      const imageUrl = parsed.resultUrls?.[0] || parsed.output?.[0] || parsed.url;
      if (!imageUrl) throw new Error(`No image URL in result`);

      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
      if (!imgRes.ok) throw new Error(`Image download failed (${imgRes.status})`);

      return Buffer.from(await imgRes.arrayBuffer());
    }

    if (state === "fail" || state === "failed") {
      throw new Error(`Kie AI failed: ${statusResult.data.failMsg || "unknown"}`);
    }
  }

  throw new Error("Kie AI timed out after 3 minutes");
}

// ─── Image Compression (for QC — Claude has 5MB limit) ─────────────────────

async function compressForQC(imageBuffer: Buffer): Promise<{ data: string; mediaType: string }> {
  // Convert PNG to JPEG at lower quality using canvas-free approach:
  // just downsample if too large. Claude's limit is 5MB base64 = ~3.75MB raw.
  // If the PNG is over 3.5MB, we'll reduce by requesting a smaller version.
  // For now, if it's a PNG > 3.5MB, convert to JPEG via a re-encode trick.

  if (imageBuffer.length <= 3_500_000) {
    return { data: imageBuffer.toString("base64"), mediaType: "image/png" };
  }

  // Use sharp if available, otherwise fall back to a subprocess
  try {
    const { execSync } = require("child_process");
    const tmpIn = path.join(ROOT, "output", ".qc-tmp-in.png");
    const tmpOut = path.join(ROOT, "output", ".qc-tmp-out.jpg");
    fs.writeFileSync(tmpIn, imageBuffer);
    execSync(`sips -s format jpeg -s formatOptions 60 "${tmpIn}" --out "${tmpOut}" 2>/dev/null`);
    const jpegBuffer = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);
    return { data: jpegBuffer.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    // If sips fails, just send a truncated version — better than crashing
    console.warn("  Warning: could not compress image for QC, sending as-is");
    return { data: imageBuffer.toString("base64"), mediaType: "image/png" };
  }
}

// ─── Quality Control ────────────────────────────────────────────────────────

async function qualityCheck(
  imageBuffer: Buffer,
  imagePrompt: string,
  styleLabel: string
): Promise<QCResult> {
  const client = new Anthropic();
  const compressed = await compressForQC(imageBuffer);

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: `You are a quality control reviewer for AI-generated infographics.
You will receive a generated infographic image and the prompt that was used to create it.

Analyze the image and check for these defects:
1. DUPLICATED TEXT: Any line of text that appears twice (exact or near-exact repeat). This is a VERY common AI image generation artifact — look carefully.
2. GARBLED/UNREADABLE TEXT: Text that is distorted, overlapping, or illegible.
3. MISSING CONTENT: Key elements from the prompt that are missing from the image.
4. LAYOUT ISSUES: Elements overlapping, cut off, or positioned incorrectly.
5. STYLE MATCH: Does the overall aesthetic match what was requested? (dark background, neon accents, data visualization)

Respond with ONLY a JSON object — no markdown, no explanation:
{
  "pass": true or false,
  "issues": ["description of each issue found"],
  "transcription": "exact text content visible in the image, line by line, separated by newlines",
  "styleMatch": "brief assessment of how well it matches the requested style",
  "confidence": 0.0 to 1.0
}

Be strict. If there are ANY duplicated text lines, it MUST fail.
If text is significantly garbled or unreadable, it MUST fail.
Minor stylistic differences are acceptable — focus on text quality and correctness.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: compressed.mediaType as "image/png" | "image/jpeg",
              data: compressed.data,
            },
          },
          {
            type: "text",
            text: `Review this generated infographic.\n\nStyle requested: ${styleLabel}\n\nOriginal image prompt:\n${imagePrompt}`,
          },
        ],
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("QC: Claude returned non-text block");

  let jsonStr = block.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    console.warn(`  QC JSON parse failed, treating as fail. Raw: ${jsonStr.slice(0, 200)}`);
    return {
      pass: false,
      issues: ["QC response was not valid JSON"],
      transcription: "",
      styleMatch: "unknown",
      confidence: 0,
    };
  }
}

// ─── Generate with Retry (per-post pipeline) ────────────────────────────────

async function generateWithRetry(
  post: ScrapedPost,
  style: typeof STYLES[number],
  index: number
): Promise<GenerationResult> {
  const label = `Post ${index + 1} (${style.label})`;
  let lastImageBuffer: Buffer | null = null;
  let lastPostText = "";
  let lastImagePrompt = "";
  let lastQcResult: QCResult = { pass: false, issues: ["No attempts made"], transcription: "", styleMatch: "", confidence: 0 };

  for (let attempt = 1; attempt <= MAX_QC_ATTEMPTS; attempt++) {
    console.log(`\n  [${label}] Attempt ${attempt}/${MAX_QC_ATTEMPTS}`);

    // Generate content with Claude
    console.log(`  [${label}] Calling Claude...`);
    const t1 = Date.now();
    const { postText, imagePrompt } = await generateWithClaude(post, style.description, USERNAME);
    console.log(`  [${label}] Claude done (${((Date.now() - t1) / 1000).toFixed(1)}s, ${postText.length} chars)`);
    lastPostText = postText;
    lastImagePrompt = imagePrompt;

    // Generate infographic with Kie AI
    console.log(`  [${label}] Calling Kie AI...`);
    const t2 = Date.now();
    let imageBuffer: Buffer;
    try {
      imageBuffer = await generateInfographic(imagePrompt, label);
    } catch (err) {
      console.error(`  [${label}] Kie AI failed: ${err instanceof Error ? err.message : err}`);
      lastQcResult = { pass: false, issues: [`Kie AI generation failed: ${err}`], transcription: "", styleMatch: "N/A", confidence: 0 };
      continue;
    }
    console.log(`  [${label}] Kie AI done (${((Date.now() - t2) / 1000).toFixed(1)}s, ${Math.round(imageBuffer.length / 1024)}KB)`);
    lastImageBuffer = imageBuffer;

    // Quality check
    console.log(`  [${label}] Running QC...`);
    const t3 = Date.now();
    const qcResult = await qualityCheck(imageBuffer, imagePrompt, style.label);
    console.log(`  [${label}] QC done (${((Date.now() - t3) / 1000).toFixed(1)}s) — ${qcResult.pass ? "PASS" : "FAIL"} (confidence: ${qcResult.confidence})`);
    lastQcResult = qcResult;

    if (qcResult.pass) {
      // Download original image in the background while we return
      const originalImageBuffer = await downloadOriginalImage(post);
      return {
        post,
        styleLabel: style.label,
        postText,
        imagePrompt,
        imageBuffer,
        originalImageBuffer,
        qcResult,
        attempts: attempt,
        qcPassed: true,
      };
    }

    console.log(`  [${label}] QC issues: ${qcResult.issues.join("; ")}`);
  }

  // All retries exhausted — use the last attempt
  console.warn(`  [${label}] QC failed after ${MAX_QC_ATTEMPTS} attempts — using best attempt`);
  const originalImageBuffer = await downloadOriginalImage(post);

  return {
    post,
    styleLabel: style.label,
    postText: lastPostText,
    imagePrompt: lastImagePrompt,
    imageBuffer: lastImageBuffer || Buffer.alloc(0),
    originalImageBuffer,
    qcResult: lastQcResult,
    attempts: MAX_QC_ATTEMPTS,
    qcPassed: false,
  };
}

// ─── Image Download ─────────────────────────────────────────────────────────

async function downloadOriginalImage(post: ScrapedPost): Promise<Buffer> {
  if (post.mediaUrls.length === 0) return Buffer.alloc(0);
  try {
    const res = await fetch(post.mediaUrls[0], { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return Buffer.alloc(0);
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return Buffer.alloc(0);
  }
}

// ─── HTML Generation ────────────────────────────────────────────────────────

function generateBatchHTML(results: GenerationResult[]): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatPostText = (text: string) =>
    escapeHtml(text).replace(/\n/g, "<br>");

  const rows = results
    .map((r, i) => {
      const origImgSrc = r.originalImageBuffer.length > 0
        ? `data:image/jpeg;base64,${r.originalImageBuffer.toString("base64")}`
        : "";
      const genImgSrc = r.imageBuffer.length > 0
        ? `data:image/png;base64,${r.imageBuffer.toString("base64")}`
        : "";

      const qcBadgeClass = r.qcPassed ? "badge-pass" : "badge-fail";
      const qcBadgeText = r.qcPassed ? "QC PASS" : "QC FAILED";
      const qcWarning = !r.qcPassed ? `<div class="qc-warning">Best attempt shown after ${r.attempts} tries</div>` : "";

      const issuesList = r.qcResult.issues.length > 0
        ? r.qcResult.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")
        : "<li>No issues found</li>";

      return `
    <div class="row">
      <div class="row-header">
        <span class="style-badge">${escapeHtml(r.styleLabel)}</span>
        <span class="attempt-info">Attempt ${r.attempts}/${MAX_QC_ATTEMPTS}</span>
      </div>
      <div class="row-cards">
        <div class="card">
          <div class="card-header">
            <span class="badge badge-original">Original</span>
            <h2>@${escapeHtml(CREATOR)}</h2>
            <div class="stats">
              <span>${r.post.views.toLocaleString()} views</span>
              <span>${r.post.likes.toLocaleString()} likes</span>
            </div>
          </div>
          <div class="post-text">${formatPostText(r.post.text)}</div>
          ${origImgSrc ? `<div class="image-container"><img src="${origImgSrc}" alt="Original"></div>` : ""}
        </div>

        <div class="card">
          <div class="card-header">
            <span class="badge badge-generated">Generated</span>
            <h2>${escapeHtml(USERNAME)}</h2>
            <span class="badge ${qcBadgeClass}">${qcBadgeText}</span>
          </div>
          <div class="post-text">${formatPostText(r.postText)}</div>
          ${genImgSrc ? `<div class="image-container"><img src="${genImgSrc}" alt="Generated"></div>` : ""}
          ${qcWarning}
          <div class="qc-toggle" onclick="this.nextElementSibling.classList.toggle('open')">
            QC Report ▾
          </div>
          <div class="qc-panel">
            <div class="qc-section">
              <strong>Status:</strong> ${r.qcPassed ? "✓ Passed" : "✗ Failed"} (confidence: ${r.qcResult.confidence})
            </div>
            <div class="qc-section">
              <strong>Style Match:</strong> ${escapeHtml(r.qcResult.styleMatch || "N/A")}
            </div>
            <div class="qc-section">
              <strong>Issues:</strong>
              <ul>${issuesList}</ul>
            </div>
            <div class="qc-section">
              <strong>Transcription:</strong>
              <pre>${escapeHtml(r.qcResult.transcription || "N/A")}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch Infographic Comparison — ${CREATOR}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #0a0a0f;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px 20px;
      min-height: 100vh;
    }

    h1 { text-align: center; font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #888; font-size: 14px; margin-bottom: 40px; }

    .row { margin-bottom: 48px; }

    .row-header {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 16px; padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .style-badge {
      background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2));
      border: 1px solid rgba(168,85,247,0.3);
      color: #c084fc; padding: 6px 16px; border-radius: 20px;
      font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    }

    .attempt-info { color: #666; font-size: 13px; }

    .row-cards {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    }

    .card {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px; overflow: hidden; backdrop-filter: blur(20px);
    }

    .card-header {
      padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center; gap: 10px;
    }

    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-original { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .badge-generated { background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
    .badge-pass { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); margin-left: auto; }
    .badge-fail { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); margin-left: auto; }

    .card-header h2 { font-size: 16px; font-weight: 600; color: #fff; }
    .stats { display: flex; gap: 12px; margin-left: auto; font-size: 12px; color: #888; }

    .post-text {
      padding: 20px; font-size: 14px; line-height: 1.6; color: #d0d0d0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .image-container {
      padding: 12px; display: flex; justify-content: center; background: rgba(0,0,0,0.3);
    }
    .image-container img { max-width: 100%; max-height: 500px; border-radius: 8px; object-fit: contain; }

    .qc-warning {
      padding: 8px 20px; background: rgba(234,179,8,0.1); color: #facc15;
      font-size: 12px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .qc-toggle {
      padding: 12px 20px; font-size: 13px; color: #888; cursor: pointer;
      border-top: 1px solid rgba(255,255,255,0.06);
      transition: color 0.2s;
    }
    .qc-toggle:hover { color: #c084fc; }

    .qc-panel {
      max-height: 0; overflow: hidden; transition: max-height 0.3s ease;
      border-top: 1px solid rgba(255,255,255,0.04);
    }
    .qc-panel.open { max-height: 2000px; }

    .qc-section { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
    .qc-section strong { color: #aaa; }
    .qc-section ul { margin-top: 6px; padding-left: 20px; }
    .qc-section li { margin-bottom: 4px; color: #d0d0d0; }
    .qc-section pre {
      margin-top: 6px; padding: 12px; background: rgba(0,0,0,0.4);
      border-radius: 8px; font-size: 12px; white-space: pre-wrap; color: #bbb;
      max-height: 300px; overflow-y: auto;
    }

    @media (max-width: 768px) { .row-cards { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Batch Infographic Quality Test</h1>
  <p class="subtitle">@${escapeHtml(CREATOR)} posts → AI-generated posts + infographics (${results.length} styles)</p>
  ${rows}
</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const totalStart = Date.now();
  console.log("=== Batch Infographic Generator ===");
  console.log(`Creator: @${CREATOR} | Username: ${USERNAME} | Styles: ${STYLES.length}\n`);

  // Step 1: Scrape posts
  const posts = await scrapeCreatorPosts(CREATOR, NUM_POSTS);
  if (posts.length === 0) throw new Error("No image posts found");

  const actualCount = Math.min(posts.length, STYLES.length);
  console.log(`\nProcessing ${actualCount} posts in parallel...\n`);

  // Step 2: Generate all posts in parallel (Claude → Kie AI → QC, with retries)
  const results = await Promise.allSettled(
    posts.slice(0, actualCount).map((post, i) =>
      generateWithRetry(post, STYLES[i], i)
    )
  );

  const successResults: GenerationResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      successResults.push(r.value);
    } else {
      console.error(`\nPost ${i + 1} failed entirely: ${r.reason}`);
    }
  }

  if (successResults.length === 0) throw new Error("All posts failed");

  // Step 3: Generate HTML
  console.log(`\nGenerating HTML (${successResults.length} results)...`);
  const html = generateBatchHTML(successResults);

  const outputDir = path.join(ROOT, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "batch-comparison.html");
  fs.writeFileSync(outputPath, html);

  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\nHTML written to: ${outputPath}`);
  console.log(`File size: ${Math.round(html.length / 1024)}KB`);
  console.log(`Total time: ${totalTime}s`);
  console.log(`\nResults:`);
  for (const r of successResults) {
    console.log(`  ${r.styleLabel}: ${r.qcPassed ? "QC PASS" : "QC FAIL"} (${r.attempts} attempts)`);
  }
  console.log("\nDone! Open the HTML file in a browser.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
