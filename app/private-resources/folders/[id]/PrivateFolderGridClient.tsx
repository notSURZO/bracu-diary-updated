"use client";

import CopyLinkButton from "@/app/components/resources/CopyLinkButton";
import { FaYoutube, FaFilePdf, FaFileWord, FaFileAlt, FaLink, FaFileArchive } from "react-icons/fa";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/nextjs";

export type PrivateResourceItem = {
  _id: string;
  title: string;
  description?: string;
  kind: "file" | "youtube";
  file?: { url: string; bytes?: number; originalName?: string };
  youtube?: { url: string; videoId?: string };
  createdAt?: string;
  ownerUserId?: string;
  ownerDisplayName?: string;
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

export default function PrivateFolderGridClient({ items: initialItems }: { readonly items: PrivateResourceItem[] }) {
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const [items, setItems] = useState(() => initialItems.map(i => ({ ...i })));
  const [query, setQuery] = useState<string>(() => (searchParams.get('q') || ''));
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  const sortItems = useCallback((arr: PrivateResourceItem[]) => {
    return [...arr].sort((a, b) => {
      // Sort by creation date (newest first) for private resources
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  }, []);

  // Listen for optimistic create events from modals
  useEffect(() => {
    function onCreated(e: Event) {
      const detail = (e as CustomEvent).detail as { item: PrivateResourceItem } | undefined;
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
      deletedIdsRef.current.add(detail.id);
      setItems(prev => prev.filter(it => it._id !== detail.id));
    }
    window.addEventListener('private-resource:created', onCreated);
    window.addEventListener('private-resource:deleted', onDeleted);
    return () => {
      window.removeEventListener('private-resource:created', onCreated);
      window.removeEventListener('private-resource:deleted', onDeleted);
    };
  }, [sortItems]);

  const handleDelete = useCallback(async (id: string) => {
    // capture item for rollback
    let removed: PrivateResourceItem | undefined;
    setItems(prev => {
      const found = prev.find(it => it._id === id);
      removed = found ? { ...found } : undefined;
      return prev.filter(it => it._id !== id);
    });
    try {
      setDeletingId(id);
      let res = await fetch(`/api/private-resources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.status === 405) {
        // Fallback 1: collection route with query param
        res = await fetch(`/api/private-resources?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      }
      if (res.status === 405) {
        // Fallback 2: collection route with JSON body
        res = await fetch(`/api/private-resources`, {
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
      try { window.dispatchEvent(new CustomEvent('private-resource:deleted', { detail: { id } })); } catch {}
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
      // rollback on failure
      if (removed) {
        const r = removed; // capture for proper narrowing within closure
        setItems(prev => {
          const exists = prev.find(it => it._id === id);
          if (exists) return prev;
          return sortItems([r, ...prev]);
        });
      }
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }, [sortItems]);

  const formatBytes = (b?: number) => {
    if (!b || b <= 0) return undefined;
    const units = ["B", "KB", "MB", "GB"]; let i = 0; let n = b;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
  };

  const formatDate = (d?: string) => {
    if (!d) return undefined;
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return undefined;
    }
  };

  // Keep local query synced with URL changes (on blur/Enter or history nav)
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Listen to debounced live typing without routing
  useEffect(() => {
    function onQ(e: Event) {
      const q = (e as CustomEvent).detail?.q as string | undefined;
      if (typeof q === 'string') setQuery(q);
    }
    window.addEventListener('resource-search:q', onQ as EventListener);
    return () => window.removeEventListener('resource-search:q', onQ as EventListener);
  }, []);

  // Advanced, lightweight scoring similar to professional sites
  const visible = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    if (tokens.length === 0) return items;

    const editDistance = (a: string, b: string) => {
      const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) dp[i][0] = i;
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[a.length][b.length];
    };

    const scoreItem = (it: PrivateResourceItem) => {
      const title = (it.title || '').toLowerCase();
      const desc = (it.description || '').toLowerCase();
      const fname = (it.file?.originalName || '').toLowerCase();
      let matchedAll = true;
      let score = 0;
      for (const t of tokens) {
        let tokenMatched = false;
        const fields: Array<[string, number]> = [
          [title, 5],
          [fname, 3],
          [desc, 1],
        ];
        for (const [field, weight] of fields) {
          if (!field) continue;
          if (field.startsWith(t)) { score += 40 * weight; tokenMatched = true; break; }
          if (field.includes(t)) { score += 20 * weight; tokenMatched = true; break; }
          if (t.length >= 3) {
            // light fuzzy: check minimal edit distance within sliding windows
            const window = Math.min(Math.max(t.length + 2, 3), Math.max(field.length, 3));
            let best = Number.MAX_SAFE_INTEGER;
            for (let i = 0; i + t.length <= field.length && i < 80; i++) {
              const seg = field.slice(i, i + t.length);
              best = Math.min(best, editDistance(seg, t));
              if (best === 0) break;
            }
            if (best <= (t.length <= 4 ? 1 : 2)) { score += 8 * weight; tokenMatched = true; break; }
          }
        }
        if (!tokenMatched) { matchedAll = false; break; }
      }
      return { matchedAll, score };
    };

    const ranked = items.map(it => ({ it, res: scoreItem(it) }))
      .filter(x => x.res.matchedAll)
      .sort((a, b) => {
        if (b.res.score !== a.res.score) return b.res.score - a.res.score;
        const tA = a.it.createdAt ? new Date(a.it.createdAt).getTime() : 0;
        const tB = b.it.createdAt ? new Date(b.it.createdAt).getTime() : 0;
        return tB - tA;
      })
      .map(x => x.it);
    return ranked;
  }, [items, query]);

  return (
    <div className="space-y-4">
      {visible.map((r) => {
        const url = r.kind === "youtube" ? r.youtube?.url : r.file?.url;
        if (!url) return null;

        const type = getFileType(url);
        const color = colorForType(type);
        const dateStr = formatDate(r.createdAt);
        const sizeStr = r.file?.bytes ? formatBytes(r.file.bytes) : undefined;
        const isOwner = userId && r.ownerUserId === userId;

        return (
          <div key={r._id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
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
                {sizeStr && <div className="text-gray-500">{sizeStr}</div>}
              </div>
              <div className="flex items-center gap-2">
                <CopyLinkButton url={url} />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  {type === 'VIDEO' ? 'Watch' : 'Download'}
                </a>
                {isOwner && (
                  <div className="relative">
                    {confirmingId === r._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(r._id)}
                          disabled={deletingId === r._id}
                          className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === r._id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          disabled={deletingId === r._id}
                          className="inline-flex items-center rounded-md bg-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-400 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(r._id)}
                        disabled={deletingId === r._id}
                        className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        title="Delete resource"
                      >
                        <FiTrash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
