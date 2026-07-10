import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "assets";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "images";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, GIF, WebP, and SVG are allowed" }, { status: 400 });
  }

  // Build a unique path: folder/timestamp-filename
  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const slug     = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 60);
  const ts       = Date.now();
  const path     = `${folder}/${ts}-${slug}.${ext}`;

  const bytes    = await file.arrayBuffer();
  const supabase = createAdminClient();

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error("[assets upload]", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ ok: true, path, url: urlData.publicUrl });
}
