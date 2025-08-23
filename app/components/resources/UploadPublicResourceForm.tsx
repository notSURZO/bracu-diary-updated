"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "react-toastify";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";

interface Props {
  courseCode: string;
  defaultCourseName?: string;
  directoryId?: string;
  isPrivate?: boolean;
  onSuccess?: () => void;
}

export default function UploadPublicResourceForm({ courseCode, defaultCourseName, directoryId, isPrivate = false, onSuccess }: Readonly<Props>) {
  const router = useRouter();
  const { userId } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileMeta, setFileMeta] = useState<{ bytes?: number; mime?: string; originalName?: string } | undefined>();
  const [courseName, setCourseName] = useState(defaultCourseName || "");
  const [submitting, setSubmitting] = useState(false);
  const [source, setSource] = useState<"link" | "file">("link");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const detectedType = useMemo(() => {
    const u = fileUrl.trim().toLowerCase();
    if (!u) return "";
    if (u.endsWith(".pdf")) return "PDF";
    if (u.endsWith(".doc") || u.endsWith(".docx")) return "DOC/DOCX";
    if (u.endsWith(".txt")) return "TEXT";
    if (u.endsWith(".mp4") || u.endsWith(".mov") || u.includes("youtube.com") || u.includes("youtu.be")) return "VIDEO";
    return "LINK";
  }, [fileUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseCode || !courseName || !title || !fileUrl) {
      toast.error("Please fill required fields");
      return;
    }
    // basic type guard for supported types
    const url = fileUrl.trim().toLowerCase();
    const allowed = [
      url.endsWith(".pdf"),
      url.endsWith(".doc"),
      url.endsWith(".docx"),
      url.endsWith(".txt"),
      url.endsWith(".mp4"),
      url.endsWith(".mov"),
      url.includes("youtube.com"),
      url.includes("youtu.be"),
      url.startsWith("http://"),
      url.startsWith("https://"),
    ].some(Boolean);
    if (!allowed) {
      toast.error("Unsupported or invalid URL. Please use pdf, doc/docx, txt, mp4/mov, or YouTube link.");
      return;
    }
    try {
      setSubmitting(true);
      // Determine kind and payload based on source and URL
      const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
      const payload: any = {
        courseCode,
        courseName,
        title,
        description,
        directoryId,
      };
      if (source === 'link' && isYouTube) {
        payload.kind = 'youtube';
        payload.youtube = { url: fileUrl };
      } else {
        payload.kind = 'file';
        payload.file = { url: fileUrl, bytes: fileMeta?.bytes, mime: fileMeta?.mime, originalName: fileMeta?.originalName };
      }
      const res = await fetch(`/api/${isPrivate ? 'private' : 'public'}-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Upload failed");
      }
      const { id } = await res.json();

      // Optimistically broadcast creation so FolderGridClient updates instantly
      try {
        const optimisticItem = source === 'link' && isYouTube
          ? {
              _id: id as string,
              title: title.trim(),
              description,
              kind: 'youtube' as const,
              youtube: { url: fileUrl },
              ownerUserId: userId || undefined,
              createdAt: new Date().toISOString(),
            }
          : {
              _id: id as string,
              title: title.trim(),
              description,
              kind: 'file' as const,
              file: { url: fileUrl, bytes: fileMeta?.bytes, originalName: fileMeta?.originalName },
              ownerUserId: userId || undefined,
              createdAt: new Date().toISOString(),
            };
        window.dispatchEvent(new CustomEvent(`${isPrivate ? 'private-' : ''}resource:created`, { detail: { item: optimisticItem } }));
      } catch {}

      toast.success("Resource uploaded");
      setTitle("");
      setDescription("");
      setFileUrl("");
      setFileMeta(undefined);
      // notify parent (modal) and also refresh route so non-listener pages update instantly
      try { onSuccess?.(); } catch {}
      try { router.refresh(); } catch {}
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Upload a Public Resource</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {directoryId ? (
          <>
            <div className="md:col-span-1">
              <label htmlFor="course-code" className="mb-1 block text-xs text-gray-600">Course Code</label>
              <input id="course-code" value={courseCode ?? ""} readOnly className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="course-name" className="mb-1 block text-xs text-gray-600">Course Name</label>
              <input id="course-name" value={defaultCourseName ?? ""} readOnly className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
            </div>
          </>
        ) : (
          <>
            <div className="md:col-span-1">
              <label htmlFor="course-code" className="mb-1 block text-xs text-gray-600">Course Code</label>
              <input id="course-code" value={courseCode ?? ""} readOnly className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="course-name" className="mb-1 block text-xs text-gray-600">Course Name</label>
              <input
                id="course-name"
                value={courseName ?? ""}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g., Data Structures"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </>
        )}
        <div className="md:col-span-1">
          <label htmlFor="resource-title" className="mb-1 block text-xs text-gray-600">Title</label>
          <input
            id="resource-title"
            value={title ?? ""}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resource title"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="md:col-span-2">
          <div className="mb-2 inline-flex rounded-md bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSource('link')}
              className={`px-3 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${source === 'link' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => setSource('file')}
              className={`px-3 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${source === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              File
            </button>
          </div>
          {source === 'link' ? (
            <div key="link-mode">
              <label htmlFor="file-url" className="mb-1 block text-xs text-gray-600">File URL</label>
              <input
                id="file-url"
                value={fileUrl ?? ""}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
                type="url"
              />
            </div>
          ) : (
            <div key="file-mode">
              <label htmlFor="file-input" className="mb-1 block text-xs text-gray-600">Select File</label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  setUploadError(null);
                  if (!f) return;
                  const allowedExt = ["pdf","doc","docx","txt"];
                  const ext = f.name.split(".").pop()?.toLowerCase();
                  const allowedMime = new Set([
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "text/plain",
                  ]);
                  if (!ext || !allowedExt.includes(ext) || (f.type && !allowedMime.has(f.type))) {
                    setUploadError("Only PDF, DOC, DOCX, and TXT files are allowed.");
                    return;
                  }
                  try {
                    setUploading(true);
                    // Request Supabase signed upload URL
                    const presign = await fetch('/api/uploads/presign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ mime: f.type, size: f.size, filename: f.name })
                    });
                    if (!presign.ok) {
                      const j = await presign.json().catch(() => ({}));
                      throw new Error(j.error || 'Presign failed');
                    }
                    const { bucket, path, token, publicUrl } = await presign.json();
                    const supabase = getSupabaseClient();
                    const { error: upErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, f);
                    if (upErr) throw upErr;
                    setFileUrl(publicUrl as string);
                    setFileMeta({ bytes: f.size, mime: f.type || undefined, originalName: f.name });
                  } catch (err: any) {
                    setUploadError(err.message || 'Upload failed');
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {uploading && <p className="mt-2 text-[12px] text-gray-600">Uploading…</p>}
              {uploadError && <p className="mt-2 text-[12px] text-red-600">{uploadError}</p>}
              {fileUrl && (
                <p className="mt-2 text-[12px] text-green-700 break-all">Uploaded. URL: {fileUrl}</p>
              )}
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-1 block text-xs text-gray-600">Description (optional)</label>
          <textarea
            id="description"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Add a short description"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {submitting ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </form>
  );
}
