import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin, getPublicObjectUrl } from '@/lib/storage/supabase';

const BUCKET = process.env.SUPABASE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_EVENT_BUCKET || 'event-images';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const filename = (file as File).name || 'image';
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ext = safeName.includes('.') ? safeName.split('.').pop() : 'jpg';
    const path = `events/${userId}/${Date.now()}-${safeName}`;

    const supabase = getSupabaseAdmin();

    // Ensure bucket exists (auto-create if missing)
    const bucketInfo = await supabase.storage.getBucket(BUCKET);
    if (!bucketInfo.data) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (createErr) {
        console.error('Failed to create bucket', BUCKET, createErr);
        return NextResponse.json({ message: `Bucket '${BUCKET}' not found and could not be created`, error: createErr.message }, { status: 500 });
      }
    } else if (bucketInfo.data && (bucketInfo.data as any).public === false) {
      // Ensure bucket is public to allow viewing via public URL
      const { error: updateErr } = await supabase.storage.updateBucket(BUCKET, { public: true });
      if (updateErr) {
        console.warn('Could not set bucket public; images may not be viewable via public URL', updateErr);
      }
    }

    const doUpload = async () => {
      return await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: (file as File).type || 'image/jpeg', cacheControl: '3600', upsert: false });
    };

    let { error } = await doUpload();
    if (error && String(error.message).toLowerCase().includes('bucket not found')) {
      // Retry once after creating bucket as public
      await supabase.storage.createBucket(BUCKET, { public: true });
      ({ error } = await doUpload());
    }

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ message: `Upload failed (bucket: ${BUCKET})`, error: error.message }, { status: 500 });
    }

    const url = getPublicObjectUrl(BUCKET, path);
    return NextResponse.json({ success: true, url, path, bucket: BUCKET });
  } catch (error) {
    console.error('Upload route error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to upload image', error: message }, { status: 500 });
  }
}
