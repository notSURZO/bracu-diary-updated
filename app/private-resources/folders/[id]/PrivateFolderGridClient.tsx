"use client";

import CopyLinkButton from "@/app/components/resources/CopyLinkButton";
import { FaYoutube, FaLink, FaExternalLinkAlt, FaDownload, FaFileAlt, FaFileArchive, FaFilePdf, FaFileWord } from "react-icons/fa";
import { SiGoogledrive } from "react-icons/si";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/nextjs";

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

// Using library icon for Google Drive links

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

export default function PrivateFolderGridClient({ items: initialItems }: { readonly items: PrivateResourceItem[] }) {
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const { user } = useUser();
  const [items, setItems] = useState(() => initialItems.map(i => ({ ...i })));
  const [query, setQuery] = useState<string>(() => (searchParams.get('q') || ''));
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  type TypeFilter = 'ALL'|'DOCS'|'TEXT'|'VIDEO'|'DRIVE'|'PDF';
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

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

  // Fetch uploader avatars for display
  useEffect(() => {
    const ids = Array.from(new Set((items || []).map(i => i.ownerUserId).filter(Boolean))) as string[];
    if (!ids.length) return;
    (async () => {
      try {
        const res = await fetch('/api/users/by-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const u of data?.users || []) {
          if (u?.id) map[u.id] = u.picture_url || '';
        }
        setAvatarMap(map);
      } catch {}
    })();
  }, [items]);

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
      // Stable UTC date to avoid SSR/CSR locale mismatch
      return new Date(d).toISOString().slice(0, 10);
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

  // Live updates: reflect created/deleted private resources instantly
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { item: PrivateResourceItem } | undefined;
      if (!detail?.item) return;
      setItems(prev => {
        if (prev.some(it => it._id === detail.item._id)) return prev; // dedupe
        if (deletedIdsRef.current.has(detail.item._id)) return prev; // ignore if recently deleted
        return sortItems([detail.item, ...prev]);
      });
    };
    const handleDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string } | undefined;
      if (!detail?.id) return;
      deletedIdsRef.current.add(detail.id);
      setItems(prev => prev.filter(it => it._id !== detail.id));
    };
    window.addEventListener('private-resource:created', handleCreated as EventListener);
    window.addEventListener('private-resource:deleted', handleDeleted as EventListener);
    return () => {
      window.removeEventListener('private-resource:created', handleCreated as EventListener);
      window.removeEventListener('private-resource:deleted', handleDeleted as EventListener);
    };
  }, [sortItems]);

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

  // Apply type filter on the search-visible list
  const finalVisible = visible.filter((it) => {
    if (typeFilter === 'ALL') return true;
    const url = it.kind === 'youtube' ? (it.youtube?.url || '') : (it.file?.url || '');
    const t = it.kind === 'youtube' ? 'VIDEO' : getFileType(url);
    switch (typeFilter) {
      case 'DOCS': return t === 'DOCX';
      case 'TEXT': return t === 'TEXT';
      case 'VIDEO': return t === 'VIDEO';
      case 'DRIVE': return t === 'DRIVE';
      case 'PDF': return t === 'PDF';
      default: return true;
    }
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 pt-4">
        <div className="inline-flex flex-wrap gap-2 rounded-lg bg-gray-50 p-1">
          {([
            { key: 'ALL', label: 'View all' },
            { key: 'DOCS', label: 'Documents' },
            { key: 'TEXT', label: 'Text files' },
            { key: 'VIDEO', label: 'Videos' },
            { key: 'DRIVE', label: 'Drive links' },
            { key: 'PDF', label: 'PDFs' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${typeFilter === tab.key ? 'bg-white border-gray-300 text-gray-900 shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-800'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50/80">
          <tr>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Resource Name</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Uploaded By</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Date Uploaded</th>
            {/* Votes removed for private resources */}
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {finalVisible.map((r) => {
            const url = r.kind === "youtube" ? r.youtube?.url : r.file?.url;
            if (!url) return null;
            const type = getFileType(url);
            const dateStr = formatDate(r.createdAt) || "";
            const isOwner = !!userId && r.ownerUserId === userId;

            const iconEl = () => {
              switch (type) {
                case "PDF":
                  return <FaFilePdf className="h-full w-full text-red-600" aria-hidden />;
                case "DOCX":
                  return <FaFileWord className="h-full w-full text-blue-600" aria-hidden />;
                case "TEXT":
                  return <FaFileAlt className="h-full w-full text-purple-600" aria-hidden />;
                case "ZIP":
                  return <FaFileArchive className="h-full w-full text-amber-500" aria-hidden />;
                case "DRIVE":
                  return <SiGoogledrive className="h-full w-full text-green-600" aria-hidden />;
                case "VIDEO":
                  return <FaYoutube className="h-full w-full text-red-600" aria-hidden />;
                default:
                  return <FaLink className="h-full w-full text-gray-500" aria-hidden />;
              }
            };

            return (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-3 min-w-0">
                    <div className="shrink-0 w-6 h-6 p-0.5 flex items-center justify-center">{iconEl()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900" title={r.title}>{r.title}</div>
                      {r.file?.originalName && (
                        <div className="truncate text-xs text-gray-500" title={r.file.originalName}>{r.file.originalName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {r.ownerUserId && avatarMap[r.ownerUserId] ? (
                      <Image src={avatarMap[r.ownerUserId]} alt="uploader avatar" width={24} height={24} className="rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">{(r.ownerDisplayName || user?.fullName || 'U')?.[0] || 'U'}</div>
                    )}
                    <span>{r.ownerDisplayName || (r.ownerUserId === userId ? (user?.fullName || "You") : "Unknown")}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{dateStr}</td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    {/* Slot 1: View (always) */}
                    <div className="w-[120px] flex justify-center">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        title="View"
                      >
                        <FaExternalLinkAlt className="h-3.5 w-3.5" />
                        <span>View</span>
                      </a>
                    </div>

                    {/* Slot 2: Copy link (VIDEO/DRIVE) or Download (file types), else placeholder */}
                    {(type === 'VIDEO' || type === 'DRIVE') ? (
                      <div className="w-[120px] flex justify-center">
                        <CopyLinkButton url={url} />
                      </div>
                    ) : (type === 'PDF' || type === 'DOCX' || type === 'TEXT') ? (
                      <div className="w-[120px] flex justify-center">
                        <a
                          href={url}
                          download
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          title="Download"
                        >
                          <FaDownload className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    ) : (
                      <div className="w-[120px]" aria-hidden="true" />
                    )}

                    {/* Slot 3: Delete / Confirm-Cancel */}
                    <div className="w-[96px] flex justify-center">
                      {isOwner && confirmingId !== r._id && (
                        <button
                          onClick={() => setConfirmingId(r._id)}
                          className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                          title="Delete resource"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                      {isOwner && confirmingId === r._id && (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => { if (deletingId !== r._id) { handleDelete(r._id); } }}
                            disabled={deletingId === r._id}
                            className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === r._id ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={deletingId === r._id}
                            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
