import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_HOSTS = [
  "pbs.twimg.com",
  "video.twimg.com",
  "abs.twimg.com",
  "ton.twimg.com",
  "tiktokcdn-us.com",
  "tiktokcdn.com",
  "tiktokcdn-eu.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((h) => parsed.hostname.endsWith(h));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("url parameter required", { status: 400 });
  }

  // Serve local generated images
  if (url.startsWith("/data/generated-images/") || url.startsWith("data/generated-images/")) {
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    const filePath = path.join(process.cwd(), "..", cleanPath);
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase();
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/jpeg";
      return new Response(buffer, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      return new Response("Image not found", { status: 404 });
    }
  }

  if (!isAllowedUrl(url)) {
    return new Response("URL not allowed", { status: 403 });
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (!res.ok) {
      return new Response(`Upstream returned ${res.status}`, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Failed to fetch image: ${msg}`, { status: 502 });
  }
}
