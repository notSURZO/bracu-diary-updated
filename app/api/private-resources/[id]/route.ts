import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import { getSupabaseAdmin } from '@/lib/storage/supabase';
import { logResourceDeleted } from '@/lib/utils/activityLogger';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE /api/private-resources/[id] called with id:', params.id);
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Invalid id', reason: 'missing_id' }, { status: 400 });

    const resource = await CourseResource.findById(id);
    if (!resource) return NextResponse.json({ error: 'Not found', reason: 'missing_document' }, { status: 404 });

    // Check ownership - only allow user to delete their own private resources
    if (resource.ownerUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden', reason: 'owner_mismatch', expectedOwner: resource.ownerUserId, requester: userId }, { status: 403 });
    }

    // Delete from Supabase if file exists
    if (resource.file?.url) {
      try {
        const supabase = getSupabaseAdmin();
        const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
        const fileName = resource.file.url.split('/').pop();
        if (fileName) {
          await supabase.storage.from(bucketName).remove([fileName]);
        }
      } catch (e) {
        console.warn('Supabase delete warning (dynamic DELETE):', e);
      }
    }

    // Log activity before deletion
    await logResourceDeleted(
      userId,
      resource.title,
      resource.courseCode,
      id,
      resource.kind as 'file' | 'youtube'
    );

    await CourseResource.deleteOne({ _id: id });
    revalidateTag('private-resources');
    if (resource.courseCode) revalidateTag(`private-resources:${resource.courseCode}`);
    if (resource.directoryId) revalidateTag(`private-resources:dir:${String(resource.directoryId)}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('private-resources DELETE (dynamic) error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
