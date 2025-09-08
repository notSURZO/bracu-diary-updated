import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    // Get the main directory
    const mainDirectory = await CourseResourceDirectory.findById(id).lean();
    if (!mainDirectory) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }
    
    // Get subdirectories for this main directory
    const subdirectories = await CourseResourceDirectory.find({
      parentDirectoryId: id,
      isSubdirectory: true,
      visibility: 'public'
    }).lean();
    
    return NextResponse.json({ 
      item: mainDirectory,
      subdirectories: subdirectories.map(sub => ({
        _id: sub._id.toString(),
        title: sub.title,
        subdirectoryType: sub.subdirectoryType
      }))
    });
  } catch (e) {
    console.error('resource-directories/[id] GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}