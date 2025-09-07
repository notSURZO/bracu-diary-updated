import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory, { ICourseResourceDirectory } from '@/lib/models/CourseResourceDirectory';
import CourseResource from '@/lib/models/CourseResource';
import { Types } from 'mongoose';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getConnectionIds } from '@/lib/connections';
import { logDirectoryDeleted } from '@/lib/utils/activityLogger';

// GET /api/private-resource-directories/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { visibility } = await req.json();
    if (!['private', 'connections'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
    }

    await connectToDatabase();

    const updatedDirectory = await CourseResourceDirectory.findOneAndUpdate(
      { _id: id, ownerUserId: userId }, // Ensure only the owner can update
      { $set: { visibility } },
      { new: true }
    ).lean();

    if (!updatedDirectory) {
      return NextResponse.json({ error: 'Directory not found or you do not have permission to update it' }, { status: 404 });
    }

    // Revalidate caches to reflect the change immediately
    revalidateTag('private-resources');
    revalidatePath(`/private-resources/folders/${id}`);

    return NextResponse.json(updatedDirectory);
  } catch (error) {
    console.error('[Directory_PUT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/private-resource-directories/[id]
// Owner-only. Deletes the main private/connections directory and any subdirectories under it.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    // Ensure directory exists and is owned by requester
    const dir = await CourseResourceDirectory.findOne({ _id: id, ownerUserId: userId }).lean();
    if (!dir) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    // Log activity before deletion
    await logDirectoryDeleted(
      userId,
      dir.title,
      dir.courseCode,
      id,
      dir.visibility as 'private' | 'connections'
    );

    // Find subdirectory IDs first
    const subdirs = await CourseResourceDirectory.find({
      parentDirectoryId: id,
      ownerUserId: userId,
      isSubdirectory: true,
    }).select({ _id: 1 }).lean();
    const subIds = subdirs.map((s: any) => String(s._id));

    // Cascade delete resources under main and subdirectories
    const dirIds = [id, ...subIds];
    const resResult = await CourseResource.deleteMany({
      directoryId: { $in: dirIds },
      ownerUserId: userId,
    });

    // Delete subdirectories (e.g., Theory/Lab)
    const subResult = await CourseResourceDirectory.deleteMany({
      parentDirectoryId: id,
      ownerUserId: userId,
      isSubdirectory: true,
    });

    // Delete the main directory
    const mainResult = await CourseResourceDirectory.deleteOne({ _id: id, ownerUserId: userId });

    // Best-effort cache revalidation for private resources
    try {
      revalidateTag('private-resources');
      revalidatePath('/private-resources');
      revalidatePath(`/private-resources/folders/${id}`);
    } catch {}

    return NextResponse.json({
      ok: true,
      deleted: {
        main: (mainResult as any).deletedCount || 0,
        subdirectories: (subResult as any).deletedCount || 0,
        resources: (resResult as any).deletedCount || 0,
      },
    });
  } catch (error) {
    console.error('[Directory_DELETE]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const directory = (await CourseResourceDirectory.findById(
      id
    ).lean()) as unknown as ICourseResourceDirectory;

    if (!directory) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    // Check access
    const isOwner = directory.ownerUserId === userId;
    if (isOwner) {
      return NextResponse.json(directory);
    }

    if (directory.visibility === 'connections') {
      const connectionIds = await getConnectionIds(directory.ownerUserId);
      if (connectionIds.includes(userId)) {
        return NextResponse.json(directory);
      }
    }
    
    // Check for public visibility, if you add it later
    if (directory.visibility === 'public') {
      return NextResponse.json(directory);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  } catch (error) {
    console.error('[Directory_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
