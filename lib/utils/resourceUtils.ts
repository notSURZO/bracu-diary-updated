import { NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';
import { getSupabaseAdmin } from '@/lib/storage/supabase';
import { revalidateTag } from 'next/cache';

// Common types
export interface ResourceQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Common query parameter parsing
export function parseQueryParams(req: NextRequest): ResourceQueryParams {
  const { searchParams } = new URL(req.url);
  return {
    q: (searchParams.get('q') || '').trim(),
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
    limit: Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10))),
    sort: (searchParams.get('sort') || '').trim(),
  };
}

// Common sort object creation
export function createSortObject(sortParam: string): Record<string, 1 | -1> {
  switch (sortParam) {
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'code_asc':
      return { courseCode: 1, title: 1 };
    case 'code_desc':
      return { courseCode: -1, title: 1 };
    case 'title_asc':
      return { title: 1 };
    case 'title_desc':
      return { title: -1 };
    default:
      return { courseCode: 1, title: 1 };
  }
}

// Common search filter creation
export function createSearchFilter(q: string, baseFilter: any = {}): any {
  if (!q) return baseFilter;
  
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anchored = `^${safe}`;
  
  return {
    $and: [
      baseFilter,
      {
        $or: [
          { courseCode: { $regex: anchored, $options: 'i' } },
          { title: { $regex: anchored, $options: 'i' } },
        ],
      },
    ],
  };
}

// Common authentication check
export async function checkAuth(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }
  return { userId };
}

// Common database connection
export async function ensureDatabaseConnection() {
  await connectToDatabase();
}

// Common resource deletion with Supabase cleanup
export async function deleteResourceWithCleanup(
  resourceId: string,
  userId: string,
  revalidateTags: string[]
) {
  const resource = await CourseResource.findById(resourceId).lean();
  if (!resource) {
    return { error: 'Not found', status: 404 };
  }

  // Check ownership
  if (resource.ownerUserId && resource.ownerUserId !== userId) {
    return { 
      error: 'Forbidden', 
      reason: 'owner_mismatch',
      expectedOwner: resource.ownerUserId,
      requester: userId,
      status: 403 
    };
  }

  // Delete from Supabase if file exists
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
      console.warn('Supabase delete warning:', e);
    }
  }

  // Delete from database
  await CourseResource.deleteOne({ _id: resourceId });

  // Revalidate cache tags
  revalidateTags.forEach(tag => {
    try {
      revalidateTag(tag);
    } catch (e) {
      console.warn(`Failed to revalidate tag ${tag}:`, e);
    }
  });

  return { success: true };
}

// Common YouTube ID extraction
export function extractYouTubeId(inputUrl: string): string | null {
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

// Common file type detection
export function getFileType(url: string): "PDF" | "DOCX" | "VIDEO" | "TEXT" | "LINK" | "DRIVE" | "ZIP" {
  const urlLower = url.toLowerCase();
  if (urlLower.endsWith(".pdf")) return "PDF";
  if (urlLower.endsWith(".doc") || urlLower.endsWith(".docx")) return "DOCX";
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be") || urlLower.endsWith(".mp4") || urlLower.endsWith(".mov")) return "VIDEO";
  if (urlLower.includes("drive.google.com") || urlLower.includes("docs.google.com")) return "DRIVE";
  if (urlLower.endsWith(".zip") || urlLower.endsWith(".rar") || urlLower.endsWith(".7z")) return "ZIP";
  if (urlLower.endsWith(".txt")) return "TEXT";
  return "LINK";
}

// Common file size formatting
export function formatBytes(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}
