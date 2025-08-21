"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import JSZip from "jszip";
import { toast } from "react-toastify";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";

interface Props {
  triggerLabel?: string;
  courseCode: string;
  defaultCourseName?: string;
  directoryId?: string;
  isPrivate?: boolean;
}

export default function CompressModal({ triggerLabel = "Compress", courseCode, defaultCourseName, directoryId, isPrivate = false }: Props) {
  const router = useRouter();
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState(6);
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimatedBlob, setEstimatedBlob] = useState<Blob | null>(null);
  const [estimatedName, setEstimatedName] = useState<string>("");
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [optimizedName, setOptimizedName] = useState<string>("");
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [optimizeBeforeZip, setOptimizeBeforeZip] = useState(false);
  // Publish output type: for PDFs allow uploading as optimized/original PDF or as ZIP. Non-PDF => ZIP.
  const [outputType, setOutputType] = useState<"zip" | "pdf">("zip");

  const MAX_UPLOAD = 10 * 1024 * 1024; // keep aligned with presign route

  const formatBytes = (b?: number) => {
    if (!b || b <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"]; let i = 0; let n = b;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
  };

  // NextUI Modal handles focus trapping and ESC.

  // Return focus to trigger on close
  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
    }
  }, [open]);

  function resetAll() {
    setFile(null);
    setLevel(6);
    setCompressing(false);
    setUploading(false);
    setPublicUrl(null);
    setTitle("");
    setDescription("");
    setEstimating(false);
    setEstimatedBlob(null);
    setEstimatedName("");
    setEstimateError(null);
    setOptimizing(false);
    setOptimizedBlob(null);
    setOptimizedName("");
    setOptimizeError(null);
    setOptimizeBeforeZip(false);
  }

  // Clear optimized state when file changes
  useEffect(() => {
    setOptimizedBlob(null);
    setOptimizedName("");
    setOptimizeError(null);
    setOptimizing(false);
    // Reset output type depending on file type
    if (file) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      setOutputType(isPdf ? 'zip' : 'zip');
    } else {
      setOutputType('zip');
    }
  }, [file]);

  // Auto-optimize when enabled and file is PDF
  useEffect(() => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (optimizeBeforeZip && isPdf && !optimizedBlob && !optimizing) {
      // fire and forget; UI will reflect optimizing state
      handleOptimizePdf();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizeBeforeZip, file]);

  // Estimate compressed size (debounced) and cache blob so we can reuse for upload
  useEffect(() => {
    let cancelled = false;
    let timer: any;
    async function run() {
      if (!file) { setEstimatedBlob(null); setEstimatedName(""); return; }
      setEstimateError(null);
      setEstimating(true);
      try {
        // choose source: optimized PDF if enabled and available; else original file
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        const sourceBlob: Blob = (optimizeBeforeZip && isPdf && optimizedBlob) ? optimizedBlob : file;
        const sourceName = (optimizeBeforeZip && isPdf && optimizedBlob) ? (optimizedName || file.name) : file.name;

        const zip = new JSZip();
        zip.file(sourceName, sourceBlob, { compression: "DEFLATE", compressionOptions: { level } });
        const blob = await zip.generateAsync({ type: "blob" });
        if (cancelled) return;
        const zipName = sourceName.replace(/\.(pdf|docx?|txt)$/i, "") + ".zip";
        setEstimatedBlob(blob);
        setEstimatedName(zipName);
      } catch (e: any) {
        if (!cancelled) {
          setEstimateError(e?.message || "Failed to estimate compressed size");
          setEstimatedBlob(null);
          setEstimatedName("");
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }
    // debounce 250ms on file/level change
    timer = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [file, level, optimizeBeforeZip, optimizedBlob, optimizedName]);

  async function handleCompressAndUpload() {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = new Set(["pdf","doc","docx","txt"]);
    if (!ext || !allowed.has(ext)) {
      toast.error("Only PDF, DOC, DOCX, and TXT files are supported for compression");
      return;
    }
    try {
      setCompressing(true);
      // Choose source: optimized PDF if enabled and available; else original
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const sourceBlob: Blob = (optimizeBeforeZip && isPdf && optimizedBlob) ? optimizedBlob : file;
      const sourceName = (optimizeBeforeZip && isPdf && optimizedBlob) ? (optimizedName || file.name) : file.name;

      // Reuse estimated blob if available; else generate now
      let zipBlob = estimatedBlob;
      let zipName = estimatedName || sourceName.replace(/\.(pdf|docx?|txt)$/i, "") + ".zip";
      if (!zipBlob) {
        const zip = new JSZip();
        zip.file(sourceName, sourceBlob, { compression: "DEFLATE", compressionOptions: { level } });
        zipBlob = await zip.generateAsync({ type: "blob" });
      }

      setCompressing(false);
      setUploading(true);

      // Presign upload to Supabase
      const presign = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime: 'application/zip', size: zipBlob.size, filename: zipName })
      });
      if (!presign.ok) {
        const j = await presign.json().catch(() => ({}));
        throw new Error(j.error || 'Presign failed');
      }
      const { bucket, path, token, publicUrl: signedUrl } = await presign.json();
      const supabase = getSupabaseClient();
      const { error: upErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, zipBlob);
      if (upErr) throw upErr;

      setPublicUrl(signedUrl as string);
      setTitle((prev) => prev || zipName.replace(/\.zip$/i, " (compressed)"));
      toast.success("Compressed and uploaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Compression/upload failed");
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  }

  // Single-step: prepare artifact (pdf or zip), upload to Supabase, then create MongoDB resource
  async function handleUploadAndPublish() {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    try {
      setCompressing(true);
      let artifactBlob: Blob;
      let artifactName: string;
      let artifactMime: string;

      if (outputType === 'pdf' && isPdf) {
        artifactBlob = optimizedBlob || file;
        const base = file.name.replace(/\.pdf$/i, '');
        artifactName = optimizedBlob ? (optimizedName || `${base}.optimized.pdf`) : file.name;
        artifactMime = 'application/pdf';
      } else {
        // ZIP is default or for non-PDFs
        const sourceBlob: Blob = (optimizeBeforeZip && isPdf && optimizedBlob) ? optimizedBlob : file;
        const sourceName = (optimizeBeforeZip && isPdf && optimizedBlob) ? (optimizedName || file.name) : file.name;
        let zipBlob = estimatedBlob;
        let zipName = estimatedName || sourceName.replace(/\.(pdf|docx?|txt)$/i, '') + '.zip';
        if (!zipBlob) {
          const zip = new JSZip();
          zip.file(sourceName, sourceBlob, { compression: 'DEFLATE', compressionOptions: { level } });
          zipBlob = await zip.generateAsync({ type: 'blob' });
        }
        artifactBlob = zipBlob as Blob;
        artifactName = zipName;
        artifactMime = 'application/zip';
      }

      // Enforce 10MB max (matches presign route)
      if (artifactBlob.size > MAX_UPLOAD) {
        toast.error(`File exceeds ${formatBytes(MAX_UPLOAD)} upload limit`);
        setCompressing(false);
        return;
      }

      setCompressing(false);
      setUploading(true);

      // Presign
      const presign = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime: artifactMime, size: artifactBlob.size, filename: artifactName })
      });
      if (!presign.ok) {
        const j = await presign.json().catch(() => ({}));
        throw new Error(j.error || 'Presign failed');
      }
      const { bucket, path, token, publicUrl: publicFileUrl } = await presign.json();

      // Upload to Supabase signed URL
      const supabase = getSupabaseClient();
      const { error: upErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, artifactBlob);
      if (upErr) throw upErr;

      // Create resource
      const payload: any = {
        courseCode,
        courseName: defaultCourseName || '',
        title: title.trim(),
        description,
        directoryId,
        kind: 'file',
        file: { url: publicFileUrl as string, bytes: artifactBlob.size, mime: artifactMime, originalName: artifactName },
      };
      const res = await fetch(`/api/${isPrivate ? 'private' : 'public'}-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Create resource failed');
      }
      const { id } = await res.json();

      // Optimistic broadcast so FolderGridClient can insert instantly
      try {
        const item = {
          _id: id as string,
          title: title.trim(),
          description,
          kind: 'file' as const,
          file: { url: publicFileUrl as string, bytes: artifactBlob.size, originalName: artifactName },
          ownerUserId: userId || undefined,
          createdAt: new Date().toISOString(),
          ownerDisplayName: 'You',
          upvoters: [],
          downvoters: [],
        };
        window.dispatchEvent(new CustomEvent(`${isPrivate ? 'private-' : ''}resource:created`, { detail: { item } }));
      } catch {}

      toast.success('Uploaded & published');
      setOpen(false);
      resetAll();
      // router.refresh(); // no longer necessary due to optimistic insert
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Upload & publish failed');
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  }

  async function handleOptimizePdf() {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' || file.type !== 'application/pdf') {
      toast.error('Optimization is available for PDFs only');
      return;
    }
    try {
      setOptimizing(true);
      setOptimizeError(null);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/pdf/optimize', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j.error || 'Optimize failed');
      }
      const blob = await res.blob();
      setOptimizedBlob(blob);
      const baseName = file.name.replace(/\.pdf$/i, '');
      setOptimizedName(`${baseName}.optimized.pdf`);
      toast.success('Optimized PDF ready');
    } catch (e: any) {
      console.error(e);
      setOptimizeError(e?.message || 'Optimize failed');
      toast.error(e?.message || 'Optimize failed');
    } finally {
      setOptimizing(false);
    }
  }

  async function handleUploadOptimizedPdf() {
    if (!optimizedBlob) return;
    try {
      setUploading(true);
      const filename = optimizedName || 'optimized.pdf';
      const presign = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime: 'application/pdf', size: optimizedBlob.size, filename })
      });
      if (!presign.ok) {
        const j = await presign.json().catch(() => ({}));
        throw new Error(j.error || 'Presign failed');
      }
      const { bucket, path, token, publicUrl: signedUrl } = await presign.json();
      const supabase = getSupabaseClient();
      const { error: upErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, optimizedBlob);
      if (upErr) throw upErr;
      setPublicUrl(signedUrl as string);
      setTitle((prev) => prev || filename);
      toast.success('Optimized PDF uploaded');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitResource(e: React.FormEvent) {
    e.preventDefault();
    if (!publicUrl) {
      toast.error("Please compress and upload a file first");
      return;
    }
    try {
      const payload: any = {
        courseCode,
        courseName: defaultCourseName || "",
        title: title || "Compressed file",
        description,
        directoryId,
        kind: 'file',
        file: { url: publicUrl, bytes: undefined, mime: 'application/zip', originalName: title || undefined },
      };
      const res = await fetch(`/api/${isPrivate ? 'private' : 'public'}-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Create resource failed');
      }
      const { id } = await res.json();

      // Optimistic broadcast so grids update instantly
      try {
        const item = {
          _id: id as string,
          title: (title || 'Compressed file').trim(),
          description,
          kind: 'file' as const,
          file: { url: publicUrl, bytes: undefined, originalName: title || undefined },
          ownerUserId: userId || undefined,
          createdAt: new Date().toISOString(),
          ownerDisplayName: 'You',
        };
        window.dispatchEvent(new CustomEvent(`${isPrivate ? 'private-' : ''}resource:created`, { detail: { item } }));
      } catch {}

      toast.success('Resource created');
      setOpen(false);
      resetAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create resource');
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Compress files before upload"
      >
        {triggerLabel}
      </button>
      <Modal isOpen={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }} backdrop="opaque">
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader id="compress-modal-title">Compress a File</ModalHeader>
              <ModalBody>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="space-y-4">
                  <div>
                    <label htmlFor="compress-file-input" className="mb-1 block text-xs text-gray-600">Select File (PDF, DOC/DOCX, TXT)</label>
                    <input
                      id="compress-file-input"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <label htmlFor="level" className="mb-1 block text-xs text-gray-600">Compression level: {level}</label>
                    <input id="level" type="range" min={1} max={9} value={level} onChange={(e) => setLevel(parseInt(e.target.value, 10))} className="w-full" />
                    <p className="mt-1 text-[11px] text-gray-500">Higher level = smaller ZIP, but slower.</p>
                  </div>
                  {file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) && (
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={optimizeBeforeZip}
                        onChange={(e) => setOptimizeBeforeZip(e.target.checked)}
                      />
                      Optimize PDFs before zipping
                    </label>
                  )}
                  {file && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-[12px]">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-gray-700">Original:</span>
                        <span className="font-medium text-gray-900">{formatBytes(file.size)}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-700">Estimated ZIP:</span>
                        {estimating ? (
                          <span className="text-gray-600">Calculating…</span>
                        ) : estimatedBlob ? (
                          <>
                            <span className="font-medium text-gray-900">{formatBytes(estimatedBlob.size)}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-700">Savings:</span>
                            <span className="font-medium text-emerald-700">
                              {Math.max(0, Math.round((1 - (estimatedBlob.size / file.size)) * 100))}%
                            </span>
                          </>
                        ) : (
                          <span className="text-red-600">{estimateError || 'Unavailable'}</span>
                        )}
                      </div>
                      {estimatedBlob && estimatedBlob.size > MAX_UPLOAD && (
                        <p className="mt-2 text-red-600">Warning: Estimated ZIP exceeds {formatBytes(MAX_UPLOAD)} upload limit.</p>
                      )}
                      {file.type === 'application/pdf' && (
                        <div className="mt-3 border-t pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleOptimizePdf}
                              disabled={optimizing}
                              className="inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm transition-colors disabled:opacity-60 hover:bg-emerald-700"
                            >
                              {optimizing ? 'Optimizing…' : 'Optimize PDF (server)'}
                            </button>
                            {optimizeError && <span className="text-[12px] text-red-600">{optimizeError}</span>}
                          </div>
                          {optimizedBlob && (
                            <div className="mt-2 text-[12px] text-gray-700">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>Optimized:</span>
                                <span className="font-medium text-gray-900">{formatBytes(optimizedBlob.size)}</span>
                                <span className="text-gray-400">•</span>
                                <span>Savings:</span>
                                <span className="font-medium text-emerald-700">{Math.max(0, Math.round((1 - (optimizedBlob.size / file.size)) * 100))}%</span>
                              </div>
                              <div className="mt-2 text-[11px] text-gray-500">You can publish as optimized PDF or ZIP below.</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {/* Output type chooser for PDFs */}
                    {file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) && (
                      <div className="flex items-center gap-3 text-xs text-gray-700">
                        <label className="inline-flex items-center gap-1">
                          <input type="radio" name="outtype" checked={outputType==='zip'} onChange={() => setOutputType('zip')} />
                          ZIP
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input type="radio" name="outtype" checked={outputType==='pdf'} onChange={() => setOutputType('pdf')} />
                          PDF
                        </label>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUploadAndPublish}
                      disabled={!file || compressing || uploading}
                      className="ml-auto inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-60 hover:bg-blue-700"
                    >
                      {compressing ? 'Preparing…' : uploading ? 'Publishing…' : 'Upload & Publish'}
                    </button>
                  </div>
                  {/* close inner content stack */}
                  </div>

                  <form className="mt-6 border-t pt-4">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">Details</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-1">
                        <label htmlFor="ccode" className="mb-1 block text-xs text-gray-600">Course Code</label>
                        <input id="ccode" value={courseCode} readOnly className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
                      </div>
                      <div className="md:col-span-1">
                        <label htmlFor="cname" className="mb-1 block text-xs text-gray-600">Course Name</label>
                        <input id="cname" value={defaultCourseName || ''} readOnly className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="ziptitle" className="mb-1 block text-xs text-gray-600">Title</label>
                        <input id="ziptitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My resource title" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="zipdesc" className="mb-1 block text-xs text-gray-600">Description (optional)</label>
                        <textarea id="zipdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Add a short description" />
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-gray-500">Use the "Upload & Publish" button above to finish.</div>
                  </form>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
