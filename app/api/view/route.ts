import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
    return NextResponse.redirect(url);
  } catch (e) {
    console.error('/api/view error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
