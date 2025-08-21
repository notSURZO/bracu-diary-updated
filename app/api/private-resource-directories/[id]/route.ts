import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory, { ICourseResourceDirectory } from '@/lib/models/CourseResourceDirectory';
import { Types } from 'mongoose';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getConnectionIds } from '@/lib/connections';

// GET /api/private-resource-directories/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { visibility } = await req.json();
    if (!['private', 'connections'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
    }

    await connectToDatabase();

    const updatedDirectory = await CourseResourceDirectory.findOneAndUpdate(
      { _id: params.id, ownerUserId: userId }, // Ensure only the owner can update
      { $set: { visibility } },
      { new: true }
    ).lean();

    if (!updatedDirectory) {
      return NextResponse.json({ error: 'Directory not found or you do not have permission to update it' }, { status: 404 });
    }

    // Revalidate caches to reflect the change immediately
    revalidateTag('private-resources');
    revalidatePath(`/private-resources/folders/${params.id}`);

    return NextResponse.json(updatedDirectory);
  } catch (error) {
    console.error('[Directory_PUT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await connectToDatabase();

    const directory = (await CourseResourceDirectory.findById(
      params.id
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
