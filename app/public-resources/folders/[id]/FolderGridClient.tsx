"use client";

import VoteButtons from "@/app/components/resources/VoteButtons";
import CopyLinkButton from "@/app/components/resources/CopyLinkButton";
import { FaYoutube, FaFilePdf, FaFileWord, FaFileAlt, FaLink, FaFileArchive } from "react-icons/fa";
import { useState, useCallback, useEffect, useRef } from "react";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/nextjs";

export type ResourceItem = {
  _id: string;
  title: string;
  description?: string;
  kind: "file" | "youtube";
  file?: { url: string; bytes?: number; originalName?: string };
  youtube?: { url: string; videoId?: string };
  createdAt?: string;
  upvoters?: string[];
  downvoters?: string[];
  ownerUserId?: string;
  ownerDisplayName?: string;
  upCount?: number;
  downCount?: number;
};

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
      return "#ef4444";
    case "DOCX":
      return "#2563eb";
    case "VIDEO":
      return "#059669";
    case "DRIVE":
      return "#22c55e";
    case "ZIP":
      return "#f59e0b";
    case "TEXT":
      return "#7c3aed";
    default:
      return "#6b7280";
  }
}

export default function FolderGridClient({ items: initialItems }: { readonly items: ResourceItem[] }) {
  const { userId } = useAuth();
  const [items, setItems] = useState(() => initialItems.map(i => ({ ...i })));
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  const sortItems = useCallback((arr: ResourceItem[]) => {
    return [...arr].sort((a, b) => {
      const upA = a.upvoters?.length ?? 0;
      const upB = b.upvoters?.length ?? 0;
      if (upB !== upA) return upB - upA;
      const downA = a.downvoters?.length ?? 0;
      const downB = b.downvoters?.length ?? 0;
      const scoreA = upA - downA;
      const scoreB = upB - downB;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  }, []);

  const onVoted = useCallback((id: string, data: { up: number; down: number; userVote: "up" | "down" | null }) => {
    setItems(prev => {
      const next = prev.map(it => it._id === id ? { ...it, upCount: data.up, downCount: data.down, upvoters: new Array(data.up).fill("u"), downvoters: new Array(data.down).fill("d") } : it);
      return sortItems(next);
    });
  }, [sortItems]);

  // Listen for optimistic create events from modals
  useEffect(() => {
    function onCreated(e: Event) {
      const detail = (e as CustomEvent).detail as { item: ResourceItem } | undefined;
      if (!detail?.item) return;
      setItems(prev => {
        if (prev.some(it => it._id === detail.item._id)) return prev; // dedupe
        if (deletedIdsRef.current.has(detail.item._id)) return prev; // ignore if recently deleted
        return sortItems([detail.item, ...prev]);
      });
    }
    function onDeleted(e: Event) {
      const detail = (e as CustomEvent).detail as { id: string } | undefined;
      if (!detail?.id) return;
      setItems(prev => prev.filter(it => it._id === detail.id ? false : true));
      deletedIdsRef.current.add(detail.id);
      // optional: purge IDs after some time
      setTimeout(() => deletedIdsRef.current.delete(detail.id), 5 * 60 * 1000);
    }
    window.addEventListener('resource:created', onCreated as EventListener);
    window.addEventListener('resource:deleted', onDeleted as EventListener);
    return () => {
      window.removeEventListener('resource:created', onCreated as EventListener);
      window.removeEventListener('resource:deleted', onDeleted as EventListener);
    };
  }, [sortItems]);

  const handleDelete = useCallback(async (id: string) => {
    // capture item for rollback
    let removed: ResourceItem | undefined;
    setItems(prev => {
      const found = prev.find(it => it._id === id);
      removed = found ? { ...found } : undefined;
      return prev.filter(it => it._id !== id);
    });
    try {
      setDeletingId(id);
      let res = await fetch(`/api/public-resources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.status === 405) {
        // Fallback 1: collection route with query param
        res = await fetch(`/api/public-resources?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      }
      if (res.status === 405) {
        // Fallback 2: collection route with JSON body
        res = await fetch(`/api/public-resources`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      }
      if (!res.ok) {
        let msg = `Delete failed (${res.status})`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const j = await res.json();
            if (j?.error) msg = `${j.error}${j.reason ? `: ${j.reason}` : ''}`;
          } else {
            const t = await res.text();
            if (t) msg = `${msg}: ${t}`;
          }
        } catch {}
        throw new Error(msg);
      }
      toast.success('Deleted');
      try { window.dispatchEvent(new CustomEvent('resource:deleted', { detail: { id } })); } catch {}
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
      // rollback on failure
      if (removed) {
        setItems(prev => {
          const next = [removed as ResourceItem, ...prev];
          return sortItems(next);
        });
      }
    } finally {
      setDeletingId(null);
    }
  }, [sortItems]);

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
      {items.map((r) => {
        const urlForType = r.kind === 'youtube' ? (r.youtube?.url || '') : (r.file?.url || '');
        const type = r.kind === 'youtube' ? 'VIDEO' : getFileType(urlForType);
        const color = colorForType(type);
        const created = r.createdAt ? new Date(r.createdAt) : undefined;
        const dateStr = created ? created.toLocaleDateString() : undefined;
        const up = typeof r.upCount === 'number' ? r.upCount : (r.upvoters?.length || 0);
        const down = typeof r.downCount === 'number' ? r.downCount : (r.downvoters?.length || 0);
        const initialUserVote: "up" | "down" | null = userId ? (r.upvoters?.includes(userId) ? 'up' : (r.downvoters?.includes(userId) ? 'down' : null)) : null;
        return (
          <div key={r._id} className="group relative rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition hover:shadow-md min-h-[190px]">
            {/* Owner actions: top-right trash icon with confirm popover */}
            {userId && r.ownerUserId === userId && (
              <div className="absolute right-3 top-3 z-10">
                <button
                  aria-label="Delete resource"
                  onClick={() => setConfirmingId(prev => (prev === r._id ? null : r._id))}
                  className="opacity-0 group-hover:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
                {confirmingId === r._id && (
                  <div className="mt-2 w-40 rounded-md border border-gray-200 bg-white p-3 text-sm shadow-lg">
                    <div className="mb-2 text-gray-700">Delete this item?</div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={deletingId === r._id}
                        className="inline-flex h-7 items-center justify-center rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { if (deletingId !== r._id) { setConfirmingId(null); handleDelete(r._id); } }}
                        disabled={deletingId === r._id}
                        className="inline-flex h-7 items-center justify-center rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        {deletingId === r._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-gray-900">{r.title}</div>
                {r.description ? (
                  <div className="mt-2 line-clamp-2 text-sm text-gray-600">{r.description}</div>
                ) : null}
              </div>
              <span
                className="ml-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {type === 'VIDEO' ? <FaYoutube className="h-4 w-4 opacity-90" /> : type === 'PDF' ? <FaFilePdf className="h-4 w-4 opacity-90" /> : type === 'DOCX' ? <FaFileWord className="h-4 w-4 opacity-90" /> : type === 'ZIP' ? <FaFileArchive className="h-4 w-4 opacity-90" /> : type === 'TEXT' ? <FaFileAlt className="h-4 w-4 opacity-90" /> : <FaLink className="h-4 w-4 opacity-90" />}
                {type === 'VIDEO' ? 'YOUTUBE' : type === 'DRIVE' ? 'DRIVE' : type}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-[12px] text-gray-500">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  {dateStr && <span className="whitespace-nowrap">{dateStr}</span>}
                </div>
                {r.ownerDisplayName && (
                  <div className="text-gray-600">by {r.ownerDisplayName}</div>
                )}
              </div>
            </div>
            {/* Footer row: votes left, actions right */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center">
                <VoteButtons
                  resourceId={r._id}
                  initialUp={up}
                  initialDown={down}
                  initialUserVote={initialUserVote}
                  onVoted={(data: { up: number; down: number; userVote: "up" | "down" | null }) => onVoted(r._id, data)}
                />
              </div>
              <div className="flex items-center justify-end whitespace-nowrap gap-2 sm:gap-2.5">
                {r.kind === 'youtube' ? (
                  <a
                    href={r.youtube?.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="hidden xs:inline">Watch</span>
                    <span className="xs:hidden inline">Watch</span>
                  </a>
                ) : (
                  <a
                    href={`/api/view?url=${encodeURIComponent(r.file?.url || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span>View</span>
                  </a>
                )}
                {r.kind === 'file' && type !== 'DRIVE' && (
                  <a
                    href={`/api/download?url=${encodeURIComponent(r.file?.url || '')}&filename=${encodeURIComponent(r.file?.originalName || 'file')}`}
                    download
                    className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3.5 text-sm font-medium text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <span className="hidden sm:inline">Download</span>
                    <span className="sm:hidden inline">DL</span>
                  </a>
                )}
                {(r.kind === 'youtube' || type === 'DRIVE') && (
                  <CopyLinkButton url={r.kind === 'youtube' ? (r.youtube?.url || '') : (r.file?.url || '')} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
