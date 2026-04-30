import fs from "fs";
import path from "path";
const ROOT = path.join(__dirname, "..");
const APP_MODULES = path.join(ROOT, "app", "node_modules");

const dotenv = require(path.join(APP_MODULES, "dotenv"));
dotenv.config({ path: path.join(ROOT, ".env") });

const Anthropic = require(path.join(APP_MODULES, "@anthropic-ai", "sdk")).default;
const { parse } = require(path.join(APP_MODULES, "csv-parse", "dist", "cjs", "sync.cjs"));
const TARGET_POST_ID_PREFIX = "832f2765";

const BRAND_STYLE_PROMPT = `The generated infographic must match this exact visual style:

COLOR PALETTE: Pure black (#000000) background with subtle diagonal line texture for depth. Neon yellow-green / chartreuse (#C8FF00) as the primary accent — used for bar fills, highlighted text, key numbers, and glowing elements. Electric blue (#3B82F6) as a secondary accent for contrast data. White (#FFFFFF) for headings and primary text. Light gray (#CCCCCC) for secondary text and labels.

TYPOGRAPHY: Main title in bold condensed sans-serif (Impact/Bebas Neue style) — large, high-impact, taking up significant space at the top. Can be all caps or mixed case. Key numbers and stats in neon yellow-green, large and prominent. Body text and labels in clean sans-serif (Inter/Helvetica). Source attribution in small light gray at the bottom.

LAYOUT: 3:4 vertical aspect ratio. Large bold title occupying top 15-20% of the image. Central area dominated by data visualization — bar charts, comparison charts, area charts, timelines, or ranked lists. Bottom area has source attribution and optional branding. High contrast, minimal decorative elements.

DATA VISUALIZATION: Use bar charts, stacked comparisons, ranked horizontal bars, timelines, or treemaps. Bars/fills in neon yellow-green (#C8FF00) with subtle glow effect. Grid lines in dark gray (#333333). Labels in white. Numbers prominently displayed alongside or inside chart elements. Use recognizable icons (white, outlined) when referencing brands or concepts.

DESIGN PRINCIPLES: Dark, modern, data-forward aesthetic. High contrast between black background and neon accents. No warm colors, no beige, no muted tones. Content must include specific numbers, real data points, and concrete comparisons — never generic filler. The infographic should look like it belongs on a premium data analytics Twitter account.`;

// --- Step 1: Find the target post ---

function findPost(): Record<string, string> {
  const csvPath = path.join(ROOT, "data", "posts.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const records: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const post = records.find((r) => r.id?.startsWith(TARGET_POST_ID_PREFIX));
  if (!post) throw new Error(`Post with ID starting ${TARGET_POST_ID_PREFIX} not found`);
  console.log(`Found post: ${post.text?.slice(0, 80)}...`);
  return post;
}

// --- Step 2: Call Claude to generate post text + image prompt ---

async function generateWithClaude(post: Record<string, string>): Promise<{ postText: string; imagePrompt: string }> {
  const client = new Anthropic();

  const systemPrompt = `You are an X/Twitter content creator and visual designer who produces viral posts for the marketing/CRO niche. You analyze reference posts and create original, ready-to-publish content.

Your output is ALWAYS a JSON object with exactly two fields:
{
  "postText": "...",
  "imagePrompt": "..."
}

## Post Text Guidelines
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

The image prompt must describe:
1. The exact text content to render on the infographic (title, bullet points, key stats, etc.)
2. The visual layout and structure (how information is organized)
3. Specific color usage matching the brand palette
4. Typography direction (serif title, sans-serif body, etc.)
5. Any diagrams, charts, or visual metaphors to include
6. The overall composition and information hierarchy

CRITICAL: The text content in the infographic must be interesting, specific, and valuable — not generic AI filler. Use real numbers, counterintuitive insights, and actionable advice. The text should make someone stop scrolling and screenshot the infographic.`;

  const userMessage = `Generate a new X/Twitter post inspired by this reference post. Create original content that captures the same insight but with your own angle.

Reference Post Text:
${post.text}

Post Analysis:
${post.analysis || "No analysis available."}

Focus on the core concept: decision-making quality over quantity — only 3 high-quality decisions per day. Design the infographic around this framework with specific data, comparisons, or a visual breakdown that makes the concept tangible and shareable.

CRITICAL CONSTRAINT FOR IMAGE PROMPT: Do NOT include any real person's name, brand name, or celebrity reference in the image prompt text. The image generator will reject content with real names. Use generic terms like "top CEO", "elite founders", etc. instead. The post text CAN reference real people — only the image prompt must avoid them.`;

  console.log("Calling Claude API...");

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

  console.log(`Generated post (${parsed.postText.length} chars)`);
  console.log(`Image prompt (${parsed.imagePrompt.length} chars)`);
  return parsed;
}

// --- Step 3: Call Kie AI to generate infographic ---

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

async function generateInfographic(imagePrompt: string): Promise<Buffer> {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey) throw new Error("KIE_AI_API_KEY not set");

  console.log("Creating Kie AI task...");

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

  console.log(`Kie AI task created: ${taskId}`);
  console.log("Polling for completion...");

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const statusRes = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!statusRes.ok) continue;

    const statusResult = await statusRes.json();
    const state = statusResult.data?.state;

    if (i % 5 === 0) console.log(`  Poll ${i + 1}: ${state}`);

    if (state === "success" || state === "completed") {
      const resultJson = statusResult.data.resultJson;
      if (!resultJson) throw new Error("Task succeeded but no resultJson");

      const parsed = JSON.parse(resultJson);
      const imageUrl = parsed.resultUrls?.[0] || parsed.output?.[0] || parsed.url;
      if (!imageUrl) throw new Error(`No image URL in result: ${resultJson.slice(0, 200)}`);

      console.log("Downloading generated image...");
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

// --- Step 4: Download original post image ---

async function downloadImage(url: string): Promise<Buffer> {
  console.log(`Downloading original image: ${url.slice(0, 60)}...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Image download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// --- Step 5: Generate HTML ---

function generateHTML(
  originalPost: Record<string, string>,
  generatedPostText: string,
  originalImageBase64: string,
  generatedImageBase64: string,
  originalImageType: string,
  generatedImageType: string
): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatPostText = (text: string) =>
    escapeHtml(text).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infographic Demo — Original vs Generated</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #0a0a0f;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px 20px;
      min-height: 100vh;
    }

    h1 {
      text-align: center;
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }

    .subtitle {
      text-align: center;
      color: #888;
      font-size: 14px;
      margin-bottom: 40px;
    }

    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      overflow: hidden;
      backdrop-filter: blur(20px);
    }

    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-original {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .badge-generated {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .card-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .stats {
      display: flex;
      gap: 16px;
      margin-left: auto;
      font-size: 13px;
      color: #888;
    }

    .stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .post-text {
      padding: 24px;
      font-size: 15px;
      line-height: 1.6;
      color: #d0d0d0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .image-container {
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.3);
    }

    .image-container img {
      max-width: 100%;
      max-height: 600px;
      border-radius: 8px;
      object-fit: contain;
    }

    @media (max-width: 768px) {
      .container {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <h1>Infographic Quality Test</h1>
  <p class="subtitle">Original CarlWeische post vs AI-generated post + infographic</p>

  <div class="container">
    <div class="card">
      <div class="card-header">
        <span class="badge badge-original">Original</span>
        <h2>@CarlWeische</h2>
        <div class="stats">
          <span>${escapeHtml(originalPost.views || "0")} views</span>
          <span>${escapeHtml(originalPost.likes || "0")} likes</span>
        </div>
      </div>
      <div class="post-text">${formatPostText(originalPost.text || "")}</div>
      <div class="image-container">
        <img src="data:image/${originalImageType};base64,${originalImageBase64}" alt="Original post image">
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="badge badge-generated">Generated</span>
        <h2>AI Post + Infographic</h2>
      </div>
      <div class="post-text">${formatPostText(generatedPostText)}</div>
      <div class="image-container">
        <img src="data:image/${generatedImageType};base64,${generatedImageBase64}" alt="Generated infographic">
      </div>
    </div>
  </div>
</body>
</html>`;
}

// --- Main ---

async function main() {
  console.log("=== Infographic Demo Generator ===\n");

  const post = findPost();

  const refImagePath = path.join(ROOT, "references", "infographic 1.jpeg");
  const refImageBase64 = fs.readFileSync(refImagePath).toString("base64");
  console.log(`Reference image loaded (${Math.round(refImageBase64.length * 0.75 / 1024)}KB)\n`);

  const { postText, imagePrompt } = await generateWithClaude(post);
  console.log(`\nPost text:\n${postText}\n`);
  console.log(`Image prompt:\n${imagePrompt.slice(0, 200)}...\n`);

  const generatedImageBuffer = await generateInfographic(imagePrompt);
  console.log(`Generated image: ${Math.round(generatedImageBuffer.length / 1024)}KB\n`);

  let originalImageBuffer: Buffer;
  try {
    const mediaUrls = JSON.parse(post.mediaUrls || "[]");
    if (mediaUrls.length === 0) throw new Error("No media URLs");
    originalImageBuffer = await downloadImage(mediaUrls[0]);
  } catch (e) {
    console.warn(`Could not download original image, using placeholder: ${e}`);
    originalImageBuffer = Buffer.alloc(0);
  }

  const html = generateHTML(
    post,
    postText,
    originalImageBuffer.length > 0 ? originalImageBuffer.toString("base64") : "",
    generatedImageBuffer.toString("base64"),
    "jpeg",
    "png"
  );

  const outputPath = path.join(ROOT, "output", "demo-comparison.html");
  fs.writeFileSync(outputPath, html);
  console.log(`\nHTML written to: ${outputPath}`);
  console.log(`File size: ${Math.round(html.length / 1024)}KB`);
  console.log("\nDone! Open the HTML file in a browser to view the comparison.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
