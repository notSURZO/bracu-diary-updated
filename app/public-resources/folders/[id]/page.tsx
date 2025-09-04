import { headers } from "next/headers";
import { clerkClient as getClerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/models/User";
import { FaYoutube, FaFilePdf, FaFileWord, FaFileAlt, FaLink } from "react-icons/fa";
import UploadModal from "@/app/components/resources/UploadModal";
import CompressModal from "@/app/components/resources/CompressModal";
import SearchInput from "@/app/components/resources/SearchInput";
import FolderGridClient from "./FolderGridClient";
import FolderTile from "@/app/components/resources/FolderTile";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Directory = { _id: string; courseCode: string; title: string };
type Subdirectory = { _id: string; title: string; subdirectoryType?: 'theory' | 'lab' };

async function getDirectory(id: string): Promise<{ item: Directory; subdirectories: Subdirectory[] } | null> {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const url = `${proto}://${host}/api/resource-directories/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return { item: data.item as Directory, subdirectories: (data.subdirectories || []) as Subdirectory[] };
}

async function getResources(id: string) {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const url = `${proto}://${host}/api/public-resources/by-directory/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { items: [] };
  return res.json();
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
          const full = [cu.firstName, cu.lastName].filter(Boolean).join(' ');
          if (full) {
            map[id] = full as string;
          }
        } catch {
          // ignore; will handle below
        }
      }
    } catch {
      // ignore network/SDK errors; we'll fall back to short id
    }
  }
  // Final fallback for any unresolved IDs: shortened id
  for (const id of ownerIds) {
    if (!map[id]) map[id] = id.slice(0, 6) + '…';
  }
  return map;
}

export default async function FolderPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }>) {
  const { id } = await params;
  const [dirResp, data] = await Promise.all([getDirectory(id), getResources(id)]);
  if (!dirResp) {
    return (
      <div className="p-6 text-sm text-gray-600">Folder not found.</div>
    );
  }
  const dir = dirResp.item;
  const subdirectories = dirResp.subdirectories || [];
  const items: Array<{ _id: string; title: string; kind: 'file' | 'youtube'; file?: { url: string; bytes?: number; originalName?: string }; youtube?: { url: string; videoId: string }; description?: string; createdAt?: string; upvoters?: string[]; downvoters?: string[] }>
    = data.items || [];

  const sp = await searchParams;
  const q = (sp?.q || "").trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => {
        const title = (it.title || "").toLowerCase();
        const desc = (it.description || "").toLowerCase();
        return title.startsWith(q) || desc.startsWith(q);
      })
    : items;

  // Resolve uploader display names for client rendering
  const ownerIds = Array.from(new Set(filtered.map((r: any) => r.ownerUserId).filter(Boolean)));
  const namesMap = ownerIds.length ? await resolveOwnerNames(ownerIds) : {};
  const enriched = filtered.map((r: any) => ({
    ...r,
    ownerDisplayName: r.ownerUserId ? (namesMap[r.ownerUserId] || r.ownerUserId.slice(0, 6) + '…') : undefined,
  }));

  function getFileType(u: string): "PDF" | "DOCX" | "VIDEO" | "TEXT" | "LINK" | "DRIVE" {
    const url = u.toLowerCase();
    if (url.endsWith(".pdf")) return "PDF";
    if (url.endsWith(".doc") || url.endsWith(".docx")) return "DOCX";
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.endsWith(".mp4") || url.endsWith(".mov")) return "VIDEO";
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) return "DRIVE";
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

  // removed unused Cloudinary toDownloadUrl helper

  // For viewing, use the original Cloudinary URL exactly as returned by the API.

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-nowrap">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">{dir.courseCode}</div>
          <h1 className="text-2xl font-bold text-gray-900">{dir.title}</h1>
        </div>
        <div className="flex items-center gap-3 sm:flex-nowrap flex-wrap">
          <div className="hidden sm:block sm:w-80 md:w-96">
            <SearchInput placeholder="Search files, videos, links..." />
          </div>
          <div className="flex items-center gap-2">
            <CompressModal triggerLabel="Compress" courseCode={dir.courseCode} defaultCourseName={dir.title} directoryId={dir._id} />
            {subdirectories.length === 0 && (
              <UploadModal triggerLabel="+ Upload" courseCode={dir.courseCode} defaultCourseName={dir.title} directoryId={dir._id} />
            )}
          </div>
        </div>
      </div>
      <div className="sm:hidden mb-3"><SearchInput placeholder="Search files, videos, links..." /></div>

      {subdirectories.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Subfolders</div>
          <div className="grid gap-5 justify-center justify-items-center [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] sm:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {(() => {
              const ordered = [...subdirectories].toSorted((a, b) => (a.subdirectoryType || '').localeCompare(b.subdirectoryType || ''));
              return ordered.map((sd) => (
                <FolderTile
                  key={sd._id}
                  _id={sd._id}
                  title={sd.title}
                  subdirectoryType={sd.subdirectoryType}
                  variant="public"
                  isSubfolder={true}
                />
              ));
            })()}
          </div>
        </div>
      )}

      {subdirectories.length === 0 ? (
        filtered.length === 0 ? (
          <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
            <>No resources yet. Be the first to upload!</>
          </div>
        ) : (
          <FolderGridClient items={enriched as any} />
        )
      ) : (
        <div className="mt-6 text-xs text-gray-600">
          Resources for this course are organized under the subfolders above.
        </div>
      )}
    </div>
  );
}

// Server Component child: fetch and render owner name from Mongo User model via clerkId
async function OwnerName({ ownerId }: { readonly ownerId: string }) {
  try {
    await connectToDatabase();
    const u = await (User as any).findOne({ clerkId: ownerId }).lean();
    if (u?.name) {
      return <span title={u.name} className="truncate max-w-[160px] sm:max-w-[220px] inline-block align-middle">by {u.name}</span>;
    }
    // Fallback to Clerk if not found
    try {
      const client = await (getClerkClient as any)();
      const clerkUser = await client.users.getUser(ownerId);
      const full = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
      if (full) {
        return <span title={full} className="truncate max-w-[160px] sm:max-w-[220px] inline-block align-middle">by {full}</span>;
      }
    } catch {}
    return <span title={ownerId} className="truncate max-w-[160px] sm:max-w-[220px] inline-block align-middle">by {ownerId.slice(0, 6)}…</span>;
  } catch {
    return <span title={ownerId} className="truncate max-w-[160px] sm:max-w-[220px] inline-block align-middle">by {ownerId.slice(0, 6)}…</span>;
  }
}
