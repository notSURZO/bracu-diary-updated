import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 100) : [];
    if (!ids.length) return NextResponse.json({ users: [] });

    await connectToDatabase();
    const docs = await (User as any)
      .find({ clerkId: { $in: ids } }, { clerkId: 1, name: 1, picture_url: 1 })
      .lean();

    const byId: Record<string, { id: string; name: string; picture_url: string }> = {};
    for (const d of (docs || [])) {
      const id = String(d.clerkId);
      byId[id] = {
        id,
        name: String(d.name || ''),
        picture_url: String(d.picture_url || ''),
      };
    }

    // Fallback to Clerk for any missing pictures
    const missingForAvatar = ids.filter((id) => !byId[id] || !byId[id].picture_url);
    if (missingForAvatar.length) {
      try {
        for (const id of missingForAvatar) {
          try {
            const cu = await clerkClient.users.getUser(id);
            const img = cu?.imageUrl || '';
            if (!byId[id]) byId[id] = { id, name: [cu?.firstName, cu?.lastName].filter(Boolean).join(' '), picture_url: img };
            else if (!byId[id].picture_url) byId[id].picture_url = img;
          } catch {}
        }
      } catch {}
    }

    const users = ids.map((id) => byId[id]).filter(Boolean);
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ users: [] });
  }
}
