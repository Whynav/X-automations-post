import { NextRequest, NextResponse } from "next/server";
import { readConfigs, writeConfigs } from "@/lib/csv";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json(readConfigs());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const configs = readConfigs();
  const config = { id: crypto.randomUUID(), ...body };
  configs.push(config);
  writeConfigs(configs);
  return NextResponse.json(config, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const updates = await req.json();
  const configs = readConfigs();
  const idx = configs.findIndex((c) => c.id === updates.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  configs[idx] = { ...configs[idx], ...updates };
  writeConfigs(configs);
  return NextResponse.json(configs[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const configs = readConfigs();
  const filtered = configs.filter((c) => c.id !== id);
  if (filtered.length === configs.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  writeConfigs(filtered);
  return NextResponse.json({ success: true });
}
