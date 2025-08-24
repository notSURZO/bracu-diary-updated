import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin, getPublicObjectUrl } from "@/lib/storage/supabase";

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
]);

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mime = String(body?.mime || "");
  const size = Number(body?.size || 0);
  const filename = String(body?.filename || "file");

  if (!ALLOWED.has(mime)) return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  if (size <= 0 || size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 400 });

  const ext = (filename.includes('.') ? filename.split(".").pop() : '') || '';
  const path = `resources/${userId}/${randomUUID()}${ext ? '.' + ext : ''}`;
  const bucket = process.env.SUPABASE_BUCKET as string;
  if (!bucket) return NextResponse.json({ error: "Missing SUPABASE_BUCKET" }, { status: 500 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('supabase createSignedUploadUrl error', error);
    return NextResponse.json({ error: "Presign failed" }, { status: 500 });
  }

  const publicUrl = getPublicObjectUrl(bucket, path);
  return NextResponse.json({ bucket, path, token: data.token, publicUrl });
}
