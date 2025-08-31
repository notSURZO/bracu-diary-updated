import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
  const { id } = await params;
    const dir = await CourseResourceDirectory.findOne({ _id: id, visibility: 'public' }).lean();
    if (!dir) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch public subdirectories under this directory (e.g., Theory/Lab)
    const subs = await CourseResourceDirectory.find({
      parentDirectoryId: id,
      visibility: 'public',
      isSubdirectory: true,
    })
      .sort({
        // Show theory before lab consistently
        subdirectoryType: 1,
        createdAt: 1,
      })
      .lean();

    return NextResponse.json({ item: dir, subdirectories: subs || [] });
  } catch (e) {
    console.error('directory GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/resource-directories/[id]
// Cascades by removing Theory/Lab subfolders under this directory
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const { id } = params;

    const dir = await CourseResourceDirectory.findOne({ _id: id, visibility: 'public' }).lean();
    if (!dir) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete subdirectories (e.g., Theory/Lab) first
    const subResult = await CourseResourceDirectory.deleteMany({
      parentDirectoryId: id,
      visibility: 'public',
      isSubdirectory: true,
    });

    // Delete the main directory
    const mainResult = await CourseResourceDirectory.deleteOne({ _id: id });

    // Best-effort cache revalidation
    try {
      revalidateTag('public-resources');
      revalidatePath('/public-resources');
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      deleted: {
        main: (mainResult as any).deletedCount || 0,
        subdirectories: (subResult as any).deletedCount || 0,
      },
    });
  } catch (e) {
    console.error('directory DELETE error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
