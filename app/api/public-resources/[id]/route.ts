import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import { getSupabaseAdmin } from '@/lib/storage/supabase';

// DELETE /api/public-resources/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[public-resources/:id] DELETE called');
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = String(params.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const resource = await CourseResource.findById(id).lean();
    if (!resource) return NextResponse.json({ error: 'Not found', reason: 'missing_document', id }, { status: 404 });

    // Compatibility: some legacy documents may lack ownerUserId. Allow deletion by any authenticated user
    // ONLY when ownerUserId is missing. Otherwise, enforce strict ownership.
    if (resource.ownerUserId && resource.ownerUserId !== userId) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          reason: 'owner_mismatch',
          expectedOwner: resource.ownerUserId || null,
          requester: userId,
        },
        { status: 403 }
      );
    }

    // If it's a file resource with a Supabase public URL, delete the object as well.
    const bucket = process.env.SUPABASE_BUCKET as string | undefined;
    if (resource.kind === 'file' && resource.file?.url && bucket) {
      try {
        const url = String(resource.file.url);
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const path = url.substring(idx + marker.length);
          if (path) {
            const supabase = getSupabaseAdmin();
            await supabase.storage.from(bucket).remove([path]);
          }
        }
      } catch (e) {
        // best effort; continue with DB deletion
        console.warn('Supabase delete warning:', e);
      }
    }

    await CourseResource.deleteOne({ _id: id });

    // Revalidate relevant cache tags
    revalidateTag('public-resources');
    if (resource.courseCode) revalidateTag(`public-resources:${resource.courseCode}`);
    if (resource.directoryId) revalidateTag(`public-resources:dir:${String(resource.directoryId)}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('public-resources [id] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// OPTIONS for CORS/preflight safety
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}
