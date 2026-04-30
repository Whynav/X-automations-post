const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com";

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 120_000
): Promise<Response> {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

export async function uploadVideo(
  videoBuffer: Buffer,
  filename: string
): Promise<{ uri: string; mimeType: string }> {
  const startRes = await fetchWithTimeout(
    `${BASE}/upload/v1beta/files?key=${GEMINI_KEY}`,
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
    `${BASE}/upload/v1beta/files?key=${GEMINI_KEY}`,
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
      const res = await fetchWithTimeout(`${fileUri}?key=${GEMINI_KEY}`, {}, 15_000);
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

async function callGemini(parts: Array<Record<string, unknown>>): Promise<string> {
  const maxRetries = 5;
  const delays = [5000, 15000, 30000, 60000, 90000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${BASE}/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        },
        180_000
      );
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      throw new Error(`Gemini request failed: ${err instanceof Error ? err.message : err}`);
    }

    if ((res.status === 429 || res.status === 503) && attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini analysis failed (${res.status}): ${errText.slice(0, 200)}`);
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

  throw new Error("Gemini analysis failed after 5 retries");
}
