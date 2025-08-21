import { clerkClient as getClerkClient, auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/models/User";
import CourseResourceDirectory from "@/lib/models/CourseResourceDirectory";
import CourseResource from "@/lib/models/CourseResource";
import { Types } from "mongoose";
import { FaYoutube, FaFilePdf, FaFileWord, FaFileAlt, FaLink, FaFileArchive } from "react-icons/fa";
import UploadModal from "@/app/components/resources/UploadModal";
import CompressModal from "@/app/components/resources/CompressModal";
import SearchInput from "@/app/components/resources/SearchInput";
import PrivateFolderGridClient from "./PrivateFolderGridClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDirectory(id: string) {
  await connectToDatabase();
  const { userId } = await auth();
  if (!userId) return null;
  // Be tolerant in lookup: fetch by id first, then enforce ownership/visibility in code
  if (!Types.ObjectId.isValid(id)) return null;
  const raw = await CourseResourceDirectory.findById(id).lean();
  if (!raw) return null;
  if (raw.visibility !== 'private' || raw.ownerUserId !== userId) {
    // Not accessible to this user
    return null;
  }
  return { _id: String(raw._id), courseCode: raw.courseCode, title: raw.title } as { _id: string; courseCode: string; title: string };
}

async function getResources(id: string) {
  await connectToDatabase();
  const { userId } = await auth();
  if (!userId) return { items: [] };
  const resources = await CourseResource.find({
    directoryId: new Types.ObjectId(id),
    visibility: 'private',
    ownerUserId: userId,
  }).sort({ createdAt: -1 }).lean().exec();
  return {
    items: resources.map((r: any) => ({
      _id: String(r._id),
      title: r.title,
      description: r.description,
      kind: r.kind,
      file: r.file,
      youtube: r.youtube,
      createdAt: r.createdAt,
      ownerUserId: r.ownerUserId,
    }))
  };
}

async function resolveOwnerNames(ownerIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    await connectToDatabase();
    const users = await (User as any)
      .find({ clerkId: { $in: ownerIds } }, { clerkId: 1, name: 1 })
      .lean();
    for (const u of users || []) {
      if (u?.clerkId && u?.name) map[u.clerkId] = u.name as string;
    }
  } catch {}
  const missing = ownerIds.filter((id) => !map[id]);
  if (missing.length) {
    try {
      const client = await (getClerkClient as any)();
      for (const id of missing) {
        try {
          const cu = await client.users.getUser(id);
          const fallback = [cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.username || cu.emailAddresses?.[0]?.emailAddress || id;
          map[id] = fallback as string;
        } catch {
          map[id] = id.slice(0, 6) + '…';
        }
      }
    } catch {
      for (const id of missing) map[id] = id.slice(0, 6) + '…';
    }
  }
  return map;
}

export default async function PrivateFolderPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }>) {
  const { id } = await params;
  const [dir, data] = await Promise.all([getDirectory(id), getResources(id)]);
  if (!dir) {
    return (
      <div className="p-6 text-sm text-gray-600">Folder not found.</div>
    );
  }
  const items: Array<{ _id: string; title: string; kind: 'file' | 'youtube'; file?: { url: string; bytes?: number; originalName?: string }; youtube?: { url: string; videoId: string }; description?: string; createdAt?: string; ownerUserId?: string }>
    = data.items || [];

  const sp = await searchParams;
  const q = (sp?.q || "").trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const filtered = tokens.length
    ? items.filter((it) => {
        const title = (it.title || "").toLowerCase();
        const desc = (it.description || "").toLowerCase();
        const fname = (it.file?.originalName || "").toLowerCase();
        const furl = (it.file?.url || "").toLowerCase();
        const yurl = (it.youtube?.url || "").toLowerCase();
        const hay = `${title}\n${desc}\n${fname}\n${furl}\n${yurl}`;
        // Require every token to be present somewhere in the haystack for AND-style keyword search
        return tokens.every((t) => hay.includes(t));
      })
    : items;

  // Resolve uploader display names for client rendering
  const ownerIds = Array.from(new Set(filtered.map((r: any) => r.ownerUserId).filter(Boolean)));
  const namesMap = ownerIds.length ? await resolveOwnerNames(ownerIds) : {};
  const enriched = filtered.map((r: any) => ({
    ...r,
    ownerDisplayName: r.ownerUserId ? (namesMap[r.ownerUserId] || r.ownerUserId.slice(0, 6) + '…') : undefined,
  }));

  function getFileType(u: string): "PDF" | "DOCX" | "VIDEO" | "TEXT" | "LINK" | "DRIVE" | "ZIP" {
    const url = u.toLowerCase();
    if (url.endsWith(".pdf")) return "PDF";
    if (url.endsWith(".doc") || url.endsWith(".docx")) return "DOCX";
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.endsWith(".mp4") || url.endsWith(".mov")) return "VIDEO";
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) return "DRIVE";
    if (url.endsWith(".zip") || url.endsWith(".rar") || url.endsWith(".7z")) return "ZIP";
    if (url.endsWith(".txt")) return "TEXT";
    return "LINK";
  }

  function colorForType(t: ReturnType<typeof getFileType>): string {
    switch (t) {
      case "PDF":
        return "#ef4444"; // red-500
      case "DOCX":
        return "#2563eb"; // blue-600
      case "VIDEO":
        return "#059669"; // emerald-600
      case "DRIVE":
        return "#22c55e"; // green-500
      case "ZIP":
        return "#f59e0b"; // amber-500
      case "TEXT":
        return "#7c3aed"; // violet-600
      default:
        return "#6b7280"; // gray-500
    }
  }

  function IconForType({ t }: { t: ReturnType<typeof getFileType> }) {
    const cls = "h-4 w-4 opacity-90";
    switch (t) {
      case "VIDEO":
        return <FaYoutube className={cls} />;
      case "PDF":
        return <FaFilePdf className={cls} />;
      case "DOCX":
        return <FaFileWord className={cls} />;
      case "ZIP":
        return <FaFileArchive className={cls} />;
      case "TEXT":
        return <FaFileAlt className={cls} />;
      case "DRIVE":
        return <FaLink className={cls} />; // Drive links displayed as generic link icon
      default:
        return <FaLink className={cls} />;
    }
  }

  const formatBytes = (b?: number) => {
    if (!b || b <= 0) return undefined;
    const units = ["B", "KB", "MB", "GB"]; let i = 0; let n = b;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
  };

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-nowrap">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">{dir.courseCode}</div>
          <h1 className="text-2xl font-bold text-gray-900">{dir.title} <span className="text-sm text-purple-600 font-medium">(Private)</span></h1>
        </div>
        <div className="flex items-center gap-3 sm:flex-nowrap flex-wrap">
          <div className="hidden sm:block sm:w-80 md:w-96">
            <SearchInput placeholder="Search files, videos, links..." />
          </div>
          <div className="flex items-center gap-2">
            <CompressModal triggerLabel="Compress" courseCode={dir.courseCode} defaultCourseName={dir.title} directoryId={dir._id} isPrivate={true} />
            <UploadModal triggerLabel="+ Upload" courseCode={dir.courseCode} defaultCourseName={dir.title} directoryId={dir._id} isPrivate={true} />
          </div>
        </div>
      </div>
      <div className="sm:hidden mb-3"><SearchInput placeholder="Search files, videos, links..." /></div>

      {filtered.length === 0 ? (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          No resources yet. Be the first to upload!
        </div>
      ) : (
        <PrivateFolderGridClient items={enriched as any} />
      )}
    </div>
  );
}
