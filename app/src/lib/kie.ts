import fs from "fs";
import path from "path";

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const API_BASE = "https://api.kie.ai/api/v1/jobs";

interface TaskCreateResponse {
  code: number;
  data: {
    taskId: string;
  };
}

interface TaskStatusResponse {
  code: number;
  data: {
    state: string;
    failMsg?: string;
    resultJson?: string;
  };
}

async function createTask(prompt: string): Promise<string> {
  const res = await fetch(`${API_BASE}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt,
        aspect_ratio: "3:4",
        resolution: "2K",
        output_format: "png",
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Kie AI createTask failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const result: TaskCreateResponse = await res.json();
  if (!result.data?.taskId) {
    throw new Error(`Kie AI returned no taskId: ${JSON.stringify(result).slice(0, 200)}`);
  }

  return result.data.taskId;
}

async function pollTaskStatus(taskId: string): Promise<string> {
  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(
      `${API_BASE}/recordInfo?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${KIE_AI_API_KEY}` },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) continue;

    const result: TaskStatusResponse = await res.json();
    const state = result.data?.state;

    if (state === "success" || state === "completed") {
      const resultJson = result.data.resultJson;
      if (!resultJson) throw new Error("Kie AI task succeeded but no resultJson");

      let parsed;
      try {
        parsed = JSON.parse(resultJson);
      } catch {
        throw new Error(`Failed to parse Kie AI resultJson: ${resultJson.slice(0, 200)}`);
      }

      const imageUrl =
        parsed.resultUrls?.[0] || parsed.output?.[0] || parsed.url;
      if (!imageUrl) {
        throw new Error(`No image URL in Kie AI result: ${resultJson.slice(0, 200)}`);
      }

      return imageUrl;
    }

    if (state === "fail" || state === "failed") {
      throw new Error(`Kie AI generation failed: ${result.data.failMsg || "unknown error"}`);
    }
  }

  throw new Error("Kie AI generation timed out after 3 minutes");
}

function ensureGeneratedImagesDir(): string {
  const dir = path.join(process.cwd(), "..", "data", "generated-images");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function generateInfographic(
  prompt: string,
  postId: string
): Promise<string> {
  const taskId = await createTask(prompt);
  const imageUrl = await pollTaskStatus(taskId);

  const imageRes = await fetch(imageUrl, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!imageRes.ok) {
    throw new Error(`Failed to download generated image (${imageRes.status})`);
  }

  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const dir = ensureGeneratedImagesDir();
  const filePath = path.join(dir, `${postId}.png`);
  fs.writeFileSync(filePath, buffer);

  return `data/generated-images/${postId}.png`;
}
