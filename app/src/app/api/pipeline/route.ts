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

  const { configName, creatorUsername } = body;
  const maxPosts = Math.min(Math.max(Number(body.maxPosts) || 20, 1), 100);
  const topK = Math.min(Math.max(Number(body.topK) || 3, 1), 10);
  const daysLookback = Math.min(Math.max(Number(body.daysLookback) || 30, 1), 365);

  if (!configName || typeof configName !== "string") {
    return new Response(JSON.stringify({ error: "configName required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send regular keep-alive comments so browser never drops connection
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 5000);

      try {
        await runPipeline(
          { configName, creatorUsername, maxPosts, topK, daysLookback },
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
        clearInterval(heartbeat);
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
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
