import Anthropic from "@anthropic-ai/sdk";
import { BRAND_STYLE_PROMPT, INFOGRAPHIC_STYLES } from "./brand-style";

const client = new Anthropic();

function sanitizePostText(text: string): string {
  let cleaned = text;
  // Remove [Image: ...] blocks (single or multi-line)
  cleaned = cleaned.replace(/\[Image:[\s\S]*?\]/g, "");
  // Strip markdown bold/italic
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1");
  // Strip markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  // Strip markdown links, keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  // Collapse 3+ newlines into 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

interface GeneratedPost {
  postText: string;
  imagePrompt: string;
}

interface Classification {
  postIndex: number;
  style: string;
  reasoning: string;
}

export const CONTENT_RATIOS = {
  infographic: 0.6,
  personal: 0.3,
  textOnly: 0.1,
};

export function computeSplit(total: number): { numInfographic: number; numPersonal: number; numTextOnly: number } {
  const numTextOnly = Math.max(total <= 2 ? 0 : 1, Math.round(total * CONTENT_RATIOS.textOnly));
  const numPersonal = Math.max(total <= 1 ? 0 : total <= 3 ? 1 : Math.round(total * CONTENT_RATIOS.personal), 0);
  const numInfographic = total - numTextOnly - numPersonal;
  return { numInfographic, numPersonal, numTextOnly };
}

export async function classifyPosts(
  posts: Array<{ index: number; text: string; analysis: string }>,
  split: { numInfographic: number; numPersonal: number; numTextOnly: number }
): Promise<Classification[]> {
  const { numInfographic, numPersonal, numTextOnly } = split;
  const styleNames = Object.keys(INFOGRAPHIC_STYLES);

  const postsText = posts
    .map((p) => `[Post ${p.index}]\n${p.text}\n\nAnalysis excerpt: ${p.analysis.slice(0, 200)}`)
    .join("\n\n---\n\n");

  const uniqueConstraint = numInfographic >= 5
    ? `You MUST use each of the 5 infographic styles at least once (the remaining ${numInfographic - 5} slots are best-fit repeats).`
    : `Pick the best-fit styles for each infographic post.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: `You are a content strategist who understands data visualization and social media content mix. You will receive ${posts.length} X/Twitter posts from a marketing/CRO creator. Your job is to classify each post into one of three categories.

You MUST select exactly:
- ${numInfographic} posts for INFOGRAPHIC (data-driven visual)
- ${numPersonal} posts for PERSONAL (will be paired with a personal/lifestyle photo)
- ${numTextOnly} posts for TEXT-ONLY (no image at all)

${uniqueConstraint}

The 5 infographic styles are:
1. "${styleNames[0]}" — Best for: A vs B comparisons, before/after data, two competing metrics
2. "${styleNames[1]}" — Best for: market share, percentage breakdowns, dominance statistics
3. "${styleNames[2]}" — Best for: top N lists, leaderboards, ranked comparisons
4. "${styleNames[3]}" — Best for: historical evolution, milestones over time, journey/progression narratives
5. "${styleNames[4]}" — Best for: frameworks, hierarchies, layered strategies, funnel concepts

Posts that should be "personal" (paired with a personal photo):
- Personal stories, lessons learned, behind-the-scenes moments
- Motivational or mindset content
- Founder journey updates, personal wins, reflections
- Opinion takes that feel more personal/authentic than data-driven
- Advice that reads like a conversation, not a framework

Posts that should be "text-only":
- Very short hot takes (1-2 lines)
- Call-to-action / hiring / community posts
- Replies or conversational posts without enough substance for any image

Respond with ONLY a JSON array — no markdown, no explanation:
[
  { "postIndex": 0, "style": "Bar Chart Comparison", "reasoning": "..." },
  { "postIndex": 1, "style": "personal", "reasoning": "..." },
  { "postIndex": 2, "style": "text-only", "reasoning": "..." },
  ...
]`,
    messages: [
      {
        role: "user",
        content: `Classify these ${posts.length} posts:\n\n${postsText}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text" || !block.text) {
    throw new Error("Classification: non-text response");
  }

  let jsonStr = block.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const classifications = JSON.parse(jsonStr) as Classification[];

  // Enforce the exact ratio — Claude doesn't always comply
  enforceRatio(classifications, split);

  return classifications;
}

function enforceRatio(
  classifications: Classification[],
  split: { numInfographic: number; numPersonal: number; numTextOnly: number }
) {
  const isInfographic = (s: string) => s !== "text-only" && s !== "personal";

  const count = () => {
    const inf = classifications.filter((c) => isInfographic(c.style)).length;
    const pers = classifications.filter((c) => c.style === "personal").length;
    const txt = classifications.filter((c) => c.style === "text-only").length;
    return { inf, pers, txt };
  };

  const allStyles = Object.keys(INFOGRAPHIC_STYLES);

  // Fix in priority order: text-only first, then personal, then infographic
  let cur = count();

  // Fix text-only count
  while (cur.txt > split.numTextOnly) {
    const entry = classifications.find((c) => c.style === "text-only");
    if (!entry) break;
    if (cur.pers < split.numPersonal) {
      entry.style = "personal";
    } else {
      const usedStyles = new Set(classifications.filter((c) => isInfographic(c.style)).map((c) => c.style));
      const unused = allStyles.find((s) => !usedStyles.has(s));
      entry.style = unused || allStyles[0];
    }
    cur = count();
  }
  while (cur.txt < split.numTextOnly) {
    const candidate = classifications.filter((c) => c.style === "personal").pop()
      || classifications.filter((c) => isInfographic(c.style)).pop();
    if (!candidate) break;
    candidate.style = "text-only";
    cur = count();
  }

  // Fix personal count
  while (cur.pers > split.numPersonal) {
    const entry = classifications.filter((c) => c.style === "personal").pop();
    if (!entry) break;
    const usedStyles = new Set(classifications.filter((c) => isInfographic(c.style)).map((c) => c.style));
    const unused = allStyles.find((s) => !usedStyles.has(s));
    entry.style = unused || allStyles[0];
    cur = count();
  }
  while (cur.pers < split.numPersonal) {
    const candidate = classifications.filter((c) => isInfographic(c.style)).pop();
    if (!candidate) break;
    candidate.style = "personal";
    cur = count();
  }
}

export async function generatePost(
  originalText: string,
  analysis: string,
  configPrompt: string,
  options?: {
    styleDescription?: string;
    textOnly?: boolean;
    personal?: boolean;
    username?: string;
  }
): Promise<GeneratedPost> {
  const isTextOnly = options?.textOnly ?? false;
  const isPersonal = options?.personal ?? false;
  const noImage = isTextOnly || isPersonal;

  let systemPrompt: string;

  if (noImage) {
    const personalNote = isPersonal
      ? `- This post will be paired with a personal/lifestyle photo, so write text that complements a personal image — be authentic, share insights from experience, use "I" voice.`
      : `- Since this post has NO image, the text must carry all the weight. Make it punchy, insightful, and standalone.`;

    systemPrompt = `You are an X/Twitter content creator who produces viral posts for the marketing/CRO niche. You study viral reference posts and reverse-engineer what makes them blow up — then you use those same viral mechanics to create a new post in YOUR niche.

YOUR PROCESS:
1. STUDY the original post — identify its viral hook type, structure/format, psychological triggers, and engagement pattern
2. EXTRACT the viral mechanics — the hook formula, the sentence rhythm, the formatting structure, the emotional arc
3. APPLY those mechanics to create a brand new post about marketing, CRO, growth, or conversion optimization
4. The TOPIC of your post will often be different from the original — what carries over is the viral structure, not the subject matter

Example: If the original is a personal story about a mentor saying "Urgency is only imagined" (story → quote → realization → lesson), you'd write a post with that SAME structure (story → quote → realization → lesson) but about a CRO insight, a growth lesson, or a marketing breakthrough.

Your output is ALWAYS a JSON object with exactly one field:
{ "postText": "..." }

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
- No emoji spam
- Conversational but authoritative tone — think "smart friend who happens to be an expert"
${personalNote}
- Can be up to the full tweet character limit if the content warrants it.`;
  } else {
    const styleBlock = options?.styleDescription
      ? `\n\n${options.styleDescription}`
      : "";

    const attributionBlock = options?.username
      ? `\n\nATTRIBUTION: Every infographic MUST include "${options.username}" in the bottom attribution area. Use format: "Visual by ${options.username}" or "Follow ${options.username} for growth insights". This is required — never omit it.`
      : "";

    systemPrompt = `You are an X/Twitter content creator and visual designer who produces viral posts for the marketing/CRO niche. You study viral reference posts and reverse-engineer what makes them blow up — then you use those same viral mechanics to create a new post in YOUR niche, paired with a branded infographic.

YOUR PROCESS:
1. STUDY the original post — identify its viral hook type, structure/format, psychological triggers, and engagement pattern
2. EXTRACT the viral mechanics — the hook formula, the sentence rhythm, the formatting structure, the emotional arc
3. APPLY those mechanics to create a brand new post about marketing, CRO, growth, or conversion optimization
4. The TOPIC of your post will often be different from the original — what carries over is the viral structure, not the subject matter

Example: If the original is a listicle ranking "top tools for X" with a punchy one-liner intro, you'd write a post with that SAME listicle-with-punchy-intro format but about CRO tools, landing page builders, or growth tactics.

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

${BRAND_STYLE_PROMPT}${styleBlock}${attributionBlock}

The image prompt must describe:
1. The exact text content to render on the infographic (title, bullet points, key stats, etc.)
2. The visual layout and structure (how information is organized)
3. Specific color usage matching the brand palette
4. Typography direction (serif title, sans-serif body, etc.)
5. Any diagrams, charts, or visual metaphors to include
6. The overall composition and information hierarchy

CRITICAL: The text content in the infographic must be interesting, specific, and valuable — not generic AI filler. Use real numbers, counterintuitive insights, and actionable advice. The text should make someone stop scrolling and screenshot the infographic.

CRITICAL CONSTRAINT: Do NOT include any real person's name, brand name, or celebrity reference in the image prompt text. The image generator will reject content with real names. Use generic terms like "top CEO", "elite founders", etc. instead. The post text CAN reference real people — only the image prompt must avoid them.`;
  }

  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Original Post:\n${originalText}\n\nPost Analysis:\n${analysis}\n\nInstructions:\n${configPrompt}`,
        },
      ],
    });

    if (!message.content || message.content.length === 0) {
      throw new Error(`Claude returned empty response (stop_reason: ${message.stop_reason})`);
    }

    const block = message.content[0];
    if (block.type !== "text" || !block.text) {
      throw new Error(`Claude returned non-text block: ${block.type}`);
    }

    try {
      let jsonStr = block.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (noImage) {
        if (parsed.postText) {
          return { postText: sanitizePostText(parsed.postText), imagePrompt: "" };
        }
        throw new Error("Missing postText field");
      }

      if (parsed.postText && parsed.imagePrompt) {
        return { postText: sanitizePostText(parsed.postText), imagePrompt: parsed.imagePrompt };
      }
      throw new Error("Missing postText or imagePrompt fields");
    } catch (parseErr) {
      if (attempt < maxRetries - 1) continue;
      throw new Error(
        `Failed to parse Claude JSON after ${maxRetries} attempts: ${parseErr instanceof Error ? parseErr.message : parseErr}`
      );
    }
  }

  throw new Error("generatePost failed after retries");
}
