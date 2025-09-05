import { clerkClient, auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/models/User";
import CourseResourceDirectory, { ICourseResourceDirectory } from "@/lib/models/CourseResourceDirectory";
import CourseResource from "@/lib/models/CourseResource";
import { Types } from "mongoose";
import { FaYoutube, FaFilePdf, FaFileWord, FaFileAlt, FaLink, FaFileArchive } from "react-icons/fa";
import UploadModal from "@/app/components/resources/UploadModal";
import CompressModal from "@/app/components/resources/CompressModal";
import SearchInput from "@/app/components/resources/SearchInput";
import PrivateFolderGridClient, { PrivateResourceItem } from "./PrivateFolderGridClient";
import PrivateFolderHeader from "./PrivateFolderHeader";
import { getConnectionIds } from "@/lib/connections";
import FolderTile from "@/app/components/resources/FolderTile";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Subdirectory = { _id: string; title: string; subdirectoryType?: 'theory' | 'lab' };

async function getDirectory(id: string): Promise<{ dir: any; subdirectories: Subdirectory[] } | null> {
  await connectToDatabase();
  const { userId } = await auth();
  if (!userId) return null;

  if (!Types.ObjectId.isValid(id)) return null;
  const raw = (await CourseResourceDirectory.findById(id).lean()) as ICourseResourceDirectory | null;
  if (!raw) return null;

  // Check access
  const isOwner = raw.ownerUserId === userId;
  if (isOwner) {
    const subdirectories = await CourseResourceDirectory.find({ parentDirectoryId: raw._id, isSubdirectory: true })
      .select({ _id: 1, title: 1, subdirectoryType: 1 })
      .lean();
    return { dir: { ...raw, _id: String(raw._id) }, subdirectories: (subdirectories || []).map((sd: any) => ({ _id: String(sd._id), title: sd.title, subdirectoryType: sd.subdirectoryType })) };
  }

  if (raw.visibility === 'connections') {
    const connectionIds = await getConnectionIds(raw.ownerUserId);
    // Primary check: new Connection model using Clerk IDs
    if (connectionIds.includes(userId)) {
      const subdirectories = await CourseResourceDirectory.find({ parentDirectoryId: raw._id, isSubdirectory: true })
        .select({ _id: 1, title: 1, subdirectoryType: 1 })
        .lean();
      return { dir: { ...raw, _id: String(raw._id) }, subdirectories: (subdirectories || []).map((sd: any) => ({ _id: String(sd._id), title: sd.title, subdirectoryType: sd.subdirectoryType })) };
    }

    // Fallback checks: legacy email-based connections on User model
    const [ownerUser, viewerUser] = await Promise.all([
      User.findOne({ clerkId: raw.ownerUserId }).lean(),
      User.findOne({ clerkId: userId }).lean(),
    ]);

    const ownerConnections: string[] = (ownerUser as any)?.connections || [];
    const viewerConnections: string[] = (viewerUser as any)?.connections || [];
    const ownerEmail: string | undefined = (ownerUser as any)?.email;
    const viewerEmail: string | undefined = (viewerUser as any)?.email;

    const connectedByEmail =
      (!!ownerConnections && !!viewerEmail && ownerConnections.includes(viewerEmail)) ||
      (!!viewerConnections && !!ownerEmail && viewerConnections.includes(ownerEmail));

    if (connectedByEmail) {
      const subdirectories = await CourseResourceDirectory.find({ parentDirectoryId: raw._id, isSubdirectory: true })
        .select({ _id: 1, title: 1, subdirectoryType: 1 })
        .lean();
      return { dir: { ...raw, _id: String(raw._id) }, subdirectories: (subdirectories || []).map((sd: any) => ({ _id: String(sd._id), title: sd.title, subdirectoryType: sd.subdirectoryType })) };
    }
  }

  return null;
}

async function getEnrichedResources(directoryId: string, ownerUserId: string, query?: string): Promise<PrivateResourceItem[]> {
  await connectToDatabase();

  // 1. Fetch resources
  const resources = await CourseResource.find({
    directoryId: new Types.ObjectId(directoryId),
    ownerUserId: ownerUserId,
  }).sort({ createdAt: -1 }).lean().exec();

  let items = resources.map((r: any) => ({
    _id: String(r._id),
    title: r.title,
    description: r.description,
    kind: r.kind,
    file: r.file,
    youtube: r.youtube,
    createdAt: r.createdAt?.toISOString(),
    ownerUserId: r.ownerUserId,
  }));

  // 2. Filter by search query
  const q = (query || "").trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  if (tokens.length > 0) {
    items = items.filter((it) => {
      const title = (it.title || "").toLowerCase();
      const desc = (it.description || "").toLowerCase();
      const fname = (it.file?.originalName || "").toLowerCase();
      const furl = (it.file?.url || "").toLowerCase();
      const yurl = (it.youtube?.url || "").toLowerCase();
      const hay = `${title}\n${desc}\n${fname}\n${furl}\n${yurl}`;
      return tokens.every((t) => hay.includes(t));
    });
  }

  // 3. Enrich with owner display names
  const ownerIds = Array.from(new Set(items.map((r) => r.ownerUserId).filter(Boolean)));
  if (ownerIds.length === 0) {
    return items;
  }

  const namesMap: Record<string, string> = {};
  try {
    const users = await User.find({ clerkId: { $in: ownerIds } }, { clerkId: 1, name: 1 }).lean();
    for (const u of users) {
      if (u.clerkId && u.name) namesMap[u.clerkId] = u.name;
    }
  } catch {}

  const missing = ownerIds.filter((id) => !namesMap[id]);
  if (missing.length > 0) {
    try {
      const clerk = await clerkClient();
      const clerkUsers = await clerk.users.getUserList({ userId: missing });
      for (const u of clerkUsers.data) {
        namesMap[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.emailAddresses?.[0]?.emailAddress || u.id;
      }
    } catch {
      // Fallback for any users not found or if clerk fails
      missing.forEach(id => {
        if (!namesMap[id]) namesMap[id] = id.slice(0, 6) + '…';
      });
    }
  }

  return items.map(it => ({
    ...it,
    ownerDisplayName: it.ownerUserId ? namesMap[it.ownerUserId] : undefined,
  }));
}

export default async function PrivateFolderPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }>) {
  const { id } = await params;
  const resp = await getDirectory(id);
  if (!resp) {
    return (
      <div className="p-6 text-sm text-gray-600">Folder not found or you do not have access.</div>
    );
  }
  const { dir, subdirectories } = resp;
  const sp = await searchParams;
  const enrichedResources = await getEnrichedResources(id, dir.ownerUserId, sp?.q);

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
        <PrivateFolderHeader
          directory={{
            _id: String(dir._id),
            courseCode: String(dir.courseCode),
            title: String(dir.title),
            visibility: dir.visibility as 'private' | 'connections',
            ownerUserId: String(dir.ownerUserId),
          }}
        />
        <div className="flex items-center gap-3 sm:flex-nowrap flex-wrap">
          <div className="hidden sm:block sm:w-80 md:w-96">
            <SearchInput placeholder="Search files, videos, links..." />
          </div>
          <div className="flex items-center gap-2">
            <CompressModal triggerLabel="Compress" courseCode={dir.courseCode} defaultCourseName={dir.title} directoryId={dir._id} isPrivate={true} />
            {subdirectories.length === 0 && (
              <UploadModal triggerLabel="+ Upload" courseCode={dir.courseCode} defaultCourseName={dir.title} directoryId={dir._id} isPrivate={true} />
            )}
          </div>
        </div>
      </div>
      <div className="sm:hidden mb-3"><SearchInput placeholder="Search files, videos, links..." /></div>

      {subdirectories.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Subfolders</div>
          <div className="grid gap-5 justify-center justify-items-center [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {(() => {
              const ordered = [...subdirectories].toSorted((a, b) => (a.subdirectoryType || '').localeCompare(b.subdirectoryType || ''));
              return ordered.map((sd) => (
                <FolderTile
                  key={sd._id}
                  _id={sd._id}
                  title={sd.title}
                  subdirectoryType={sd.subdirectoryType}
                  variant="private"
                  isSubfolder={true}
                />
              ));
            })()}
          </div>
        </div>
      )}

      {subdirectories.length === 0 ? (
        enrichedResources.length === 0 ? (
          <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
            No resources yet. Be the first to upload!
          </div>
        ) : (
          <PrivateFolderGridClient items={enrichedResources} />
        )
      ) : (
        <div className="mt-6 text-xs text-gray-600">
          Resources for this course are organized under the subfolders above.
        </div>
      )}
    </div>
  );
}
