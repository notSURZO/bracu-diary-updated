import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';
import type { PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { getSupabaseAdmin } from '@/lib/storage/supabase';
import { logResourceUpload, logResourceDeleted } from '@/lib/utils/activityLogger';

// GET ?q=&page=&limit= -> distinct courses (code, name, resourceCount) for visibility: 'public'
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const match: any = { visibility: 'public' };
    if (q) {
      // Case-insensitive filter on courseCode or courseName
      match.$or = [
        { courseCode: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { courseName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ];
    }
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: { courseCode: '$courseCode', courseName: '$courseName' },
          resourceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          courseCode: '$_id.courseCode',
          courseName: '$_id.courseName',
          resourceCount: 1,
        },
      },
      { $sort: { courseCode: 1, courseName: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const courses = await CourseResource.aggregate(pipeline).exec();
    return NextResponse.json({ items: courses, page, limit });
  } catch (error) {
    console.error('public-resources GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST -> create a public resource
function extractYouTubeId(inputUrl: string): string | null {
  try {
    const u = new URL(inputUrl);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return u.pathname.split('/')[1] || null;
    }
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
      const m = /\/shorts\/([^/]+)/.exec(u.pathname);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { courseCode, courseName, title, description, file, directoryId, kind, youtube } = body;
    const courseCodeTrimmed = (courseCode || '').trim().toUpperCase();
    const courseNameTrimmed = (courseName || '').trim();
    const titleTrimmed = (title || '').trim();

    if (!courseCodeTrimmed || !courseNameTrimmed || !titleTrimmed) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Guard: prevent uploading into a main directory if it has subfolders
    if (directoryId) {
      try {
        const dirDoc: any = await CourseResourceDirectory.findById(String(directoryId)).lean();
        if (dirDoc && !dirDoc.isSubdirectory) {
          const subCount = await CourseResourceDirectory.countDocuments({ parentDirectoryId: dirDoc._id });
          if (subCount > 0) {
            return NextResponse.json(
              { error: 'Uploads are restricted to subfolders for this course. Please open Theory or Lab and upload there.' },
              { status: 400 }
            );
          }
        }
      } catch {}
    }

    interface FileBlock {
      url: string;
      mime?: string;
      bytes?: number;
      provider?: string;
      publicId?: string;
      originalName?: string;
    }

    interface YoutubeBlock {
      url: string;
      videoId?: string;
    }

    let kindVal: 'youtube' | 'file';
    if (kind === 'youtube' || kind === 'file') {
      kindVal = kind;
    } else {
      kindVal = youtube?.url ? 'youtube' : 'file';
    }

    let fileBlock: FileBlock | undefined;
    let youtubeBlock: YoutubeBlock | undefined;

    if (kindVal === 'file') {
      if (!file?.url) return NextResponse.json({ error: 'File url required' }, { status: 400 });
      fileBlock = {
        url: String(file.url),
        mime: file.mime ? String(file.mime) : undefined,
        bytes: typeof file.bytes === 'number' ? file.bytes : undefined,
        provider: file.provider ? String(file.provider) : undefined,
        publicId: file.publicId ? String(file.publicId) : undefined,
        originalName: file.originalName ? String(file.originalName) : undefined,
      };
    } else {
      const yUrl = String(youtube?.url || '');
      const vid = extractYouTubeId(yUrl);
      youtubeBlock = { url: yUrl, videoId: vid || undefined };
    }

    // Sanitize minimal fields
    const resource = await CourseResource.create({
      courseCode,
      courseName,
      directoryId: directoryId ? new Types.ObjectId(String(directoryId)) : undefined,
      title,
      description: description || undefined,
      kind: kindVal,
      file: fileBlock,
      youtube: youtubeBlock,
      ownerUserId: userId,
      visibility: 'public',
    });

    // Log activity
    await logResourceUpload(
      userId,
      titleTrimmed,
      courseCodeTrimmed,
      (resource as any)._id.toString(),
      kindVal === 'file' ? fileBlock?.mime : 'youtube'
    );

    // Revalidate public listings
    revalidateTag('public-resources');
    revalidateTag(`public-resources:${resource.courseCode}`);
    if (resource.directoryId) {
      revalidateTag(`public-resources:dir:${String(resource.directoryId)}`);
    }
    
    // Also revalidate the main public resources page
    revalidateTag('public-resources:directories');

    return NextResponse.json({ ok: true, id: (resource as any)._id.toString() }, { status: 201 });
  } catch (error) {
    console.error('public-resources POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE (fallback): /api/public-resources?id=... or body { id }
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    let id = (url.searchParams.get('id') || '').trim();
    if (!id) {
      try {
        const body = await req.json();
        id = String(body?.id || '').trim();
      } catch {}
    }
    if (!id) return NextResponse.json({ error: 'Invalid id', reason: 'missing_id' }, { status: 400 });

    const resource: any = await CourseResource.findById(id).lean();
    if (!resource) return NextResponse.json({ error: 'Not found', reason: 'missing_document', id }, { status: 404 });

    // Enforce ownership when present; allow deletion if legacy doc lacks ownerUserId
    if (resource.ownerUserId && resource.ownerUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', reason: 'owner_mismatch', expectedOwner: resource.ownerUserId, requester: userId },
        { status: 403 }
      );
    }

    const bucket = process.env.SUPABASE_BUCKET as string | undefined;
    if (resource.kind === 'file' && resource.file?.url && bucket) {
      try {
        const urlStr = String(resource.file.url);
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = urlStr.indexOf(marker);
        if (idx !== -1) {
          const path = urlStr.substring(idx + marker.length);
          if (path) {
            const supabase = getSupabaseAdmin();
            await supabase.storage.from(bucket).remove([path]);
          }
        }
      } catch (e) {
        console.warn('Supabase delete warning (collection DELETE):', e);
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
    revalidateTag('public-resources');
    if (resource.courseCode) revalidateTag(`public-resources:${resource.courseCode}`);
    if (resource.directoryId) revalidateTag(`public-resources:dir:${String(resource.directoryId)}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('public-resources DELETE (collection) error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
