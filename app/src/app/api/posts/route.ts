import { NextRequest, NextResponse } from "next/server";
import { readPosts, writePosts } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const configName = searchParams.get("configName");
  const creator = searchParams.get("creator");

  let posts = readPosts();
  if (configName) posts = posts.filter((p) => p.configName === configName);
  if (creator) posts = posts.filter((p) => p.creator === creator);

  return NextResponse.json(posts);
}

export async function PATCH(req: NextRequest) {
  const { id, starred } = await req.json();
  const posts = readPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  posts[idx].starred = starred;
  writePosts(posts);
  return NextResponse.json(posts[idx]);
}
