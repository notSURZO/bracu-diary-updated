import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { PDFDocument, PDFPage } from "pdf-lib";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const type = (file as any).type || "";
    if (type !== "application/pdf") {
      return NextResponse.json({ error: "Only application/pdf is supported" }, { status: 400 });
    }
    const size = (file as any).size || 0;
    if (size <= 0 || size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF too large (max 25MB)" }, { status: 400 });
    }

    const inputBytes = new Uint8Array(await file.arrayBuffer());

    // Load then re-save via pdf-lib to enable object streams and compression where possible
    const src = await PDFDocument.load(inputBytes, { ignoreEncryption: true, updateMetadata: false });
    const out = await PDFDocument.create();

    // Copy all pages to a fresh document (drops some unused objects/metadata)
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p: PDFPage) => out.addPage(p));

    // Strip basic metadata to reduce size
    out.setTitle("");
    out.setAuthor("");
    out.setSubject("");
    out.setKeywords([]);
    out.setProducer("");
    out.setCreator("");

    const optimized = await out.save({ useObjectStreams: true, addDefaultPage: false });

    const res = new NextResponse(Buffer.from(optimized), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="optimized.pdf"`,
        "X-Original-Size": String(size),
        "X-Optimized-Size": String(optimized.length),
        "Cache-Control": "no-store",
      },
    });
    return res;
  } catch (e: any) {
    console.error("/api/pdf/optimize error", e);
    return NextResponse.json({ error: e?.message || "Optimize failed" }, { status: 500 });
  }
}
