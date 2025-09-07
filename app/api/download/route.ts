import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const filename = searchParams.get("filename") || undefined;
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Upstream error ${upstream.status}` }, { status: 502 });
    }

    const headers = new Headers(upstream.headers);
    // Force download
    const safeName = filename || url.split("/").pop() || "file";
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (e) {
    console.error("/api/download error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
