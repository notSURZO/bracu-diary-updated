import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import { Types } from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Directory ID is required' }, { status: 400 });
    }

    // Find private resources in this directory that belong to the current user
    const resources = await CourseResource.find({
      directoryId: new Types.ObjectId(id),
      visibility: 'private',
      ownerUserId: userId
    })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

    const items = resources.map(resource => ({
      _id: resource._id.toString(),
      title: resource.title,
      description: resource.description,
      kind: resource.kind,
      file: resource.file,
      youtube: resource.youtube,
      createdAt: resource.createdAt,
      ownerUserId: resource.ownerUserId,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('private-resources by-directory GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
