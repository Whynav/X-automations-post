import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getContextDir() {
  const primary = path.resolve(process.cwd(), "../context");
  if (fs.existsSync(primary)) return primary;
  const fallback = path.resolve(process.cwd(), "context");
  if (fs.existsSync(fallback)) return fallback;
  return primary;
}

export async function GET() {
  try {
    const dir = getContextDir();
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ files: [] });
    }

    const fileNames = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    const files = fileNames.map((name) => {
      const fullPath = path.join(dir, name);
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      
      // Extract title from first markdown header if available
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : name.replace(/\.md$/, "").replace(/[-_]/g, " ");

      return {
        filename: name,
        title,
        content,
        lastModified: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load knowledge files" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, content } = body;

    if (!filename || typeof filename !== "string" || !filename.endsWith(".md")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Prevent directory traversal
    const safeName = path.basename(filename);
    const dir = getContextDir();
    const targetPath = path.join(dir, safeName);

    fs.writeFileSync(targetPath, content, "utf-8");

    return NextResponse.json({ success: true, filename: safeName });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save file" },
      { status: 500 }
    );
  }
}
