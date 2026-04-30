import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { configName } = body;
  const maxPosts = Math.min(Math.max(Number(body.maxPosts) || 20, 1), 100);
  const topK = Math.min(Math.max(Number(body.topK) || 3, 1), 10);
  const daysLookback = Math.min(Math.max(Number(body.daysLookback) || 30, 1), 365);

  if (!configName || typeof configName !== "string") {
    return new Response(JSON.stringify({ error: "configName required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runPipeline(
          { configName, maxPosts, topK, daysLookback },
          (progress) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
              );
            } catch {
              // stream already closed by client
            }
          }
        );
      } catch (err) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                phase: "error",
                creatorsProcessed: 0,
                creatorsTotal: 0,
                postsProcessed: 0,
                postsTotal: 0,
                activeTasks: [],
                errors: [err instanceof Error ? err.message : String(err)],
                log: [`Pipeline failed: ${err instanceof Error ? err.message : String(err)}`],
              })}\n\n`
            )
          );
        } catch {
          // stream already closed
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
