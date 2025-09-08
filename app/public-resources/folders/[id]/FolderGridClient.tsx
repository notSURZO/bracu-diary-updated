"use client";

import VoteButtons from "@/app/components/resources/VoteButtons";
import CopyLinkButton from "@/app/components/resources/CopyLinkButton";
import { FaYoutube, FaLink, FaFileAlt, FaFileArchive, FaFilePdf, FaFileWord, FaExternalLinkAlt, FaDownload } from "react-icons/fa";
import { SiGoogledrive } from "react-icons/si";
import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/nextjs";

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
  directoryId?: string;
};

// Using library icon for Google Drive

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
// Using official brand icons

export default function FolderGridClient({ items: initialItems, directoryId }: { readonly items: ResourceItem[]; readonly directoryId: string }) {
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

  const sortItems = useCallback((arr: ResourceItem[]) => {
    // Sort strictly by upvotes descending; tie-breaker: newest date
    return [...arr].sort((a, b) => {
      const upA = typeof a.upCount === 'number' ? a.upCount : (a.upvoters?.length ?? 0);
      const upB = typeof b.upCount === 'number' ? b.upCount : (b.upvoters?.length ?? 0);
      if (upB !== upA) return upB - upA;
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

  // Ensure initial list is sorted on mount
  useEffect(() => {
    setItems(prev => sortItems(prev));
  }, [sortItems]);

  // Listen for optimistic create events from modals
  useEffect(() => {
    function onCreated(e: Event) {
      const detail = (e as CustomEvent).detail as { item: ResourceItem } | undefined;
      if (!detail?.item) return;
      
      // Check if this resource belongs to the current directory
      if (detail.item.directoryId !== directoryId) return;
      
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
    window.addEventListener('resource:deleted', onDeleted);
    
    return () => {
      window.removeEventListener('resource:created', onCreated);
      window.removeEventListener('resource:deleted', onDeleted);
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

  // Keep local query in sync with URL changes (e.g., on blur/Enter or back/forward)
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Listen to live typing events from SearchInput for instant filtering without routing
  useEffect(() => {
    function onQ(e: Event) {
      const q = (e as CustomEvent).detail?.q as string | undefined;
      if (typeof q === 'string') setQuery(q);
    }
    window.addEventListener('resource-search:q', onQ as EventListener);
    return () => window.removeEventListener('resource-search:q', onQ as EventListener);
  }, []);

  // Live updates: reflect created/deleted public resources instantly
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { item: ResourceItem } | undefined;
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
      setItems(prev => prev.filter(it => it._id !== detail.id));
      deletedIdsRef.current.add(detail.id);
      setTimeout(() => deletedIdsRef.current.delete(detail.id), 5 * 60 * 1000);
    };
    window.addEventListener('resource:created', handleCreated as EventListener);
    window.addEventListener('resource:deleted', handleDeleted as EventListener);
    return () => {
      window.removeEventListener('resource:created', handleCreated as EventListener);
      window.removeEventListener('resource:deleted', handleDeleted as EventListener);
    };
  }, [sortItems]);

  // Client-side prefix search based on current query for instant filtering
  const q = (query || '').trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  // Apply search filter
  const searchFiltered = tokens.length ? items.filter((it) => {
    const title = (it.title || '').toLowerCase();
    const desc = (it.description || '').toLowerCase();
    const fname = (it.file?.originalName || '').toLowerCase();
    // prefix match: any field startsWith each token (AND across tokens)
    return tokens.every(t => title.startsWith(t) || desc.startsWith(t) || fname.startsWith(t));
  }) : items;

  // Apply type filter
  const visible = searchFiltered.filter((it) => {
    if (typeFilter === 'ALL') return true;
    const urlForType = it.kind === 'youtube' ? (it.youtube?.url || '') : (it.file?.url || '');
    const t = it.kind === 'youtube' ? 'VIDEO' : getFileType(urlForType);
    switch (typeFilter) {
      case 'DOCS': return t === 'DOCX';
      case 'TEXT': return t === 'TEXT';
      case 'VIDEO': return t === 'VIDEO';
      case 'DRIVE': return t === 'DRIVE';
      case 'PDF': return t === 'PDF';
      default: return true;
    }
  });

  // Stable date formatting (UTC YYYY-MM-DD)
  const toUTC = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  // Show empty state if no resources at all (not just filtered out)
  if (items.length === 0) {
    return (
      <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
        No resources yet. Be the first to upload!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 pt-4 overflow-x-auto">
        <div className="inline-flex flex-nowrap gap-2 rounded-lg bg-gray-50 p-1">
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
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Votes</th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visible.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                {typeFilter === 'ALL' 
                  ? 'No resources found' 
                  : `No ${typeFilter === 'DOCS' ? 'documents' : typeFilter === 'TEXT' ? 'text files' : typeFilter === 'VIDEO' ? 'videos' : typeFilter === 'DRIVE' ? 'drive links' : typeFilter === 'PDF' ? 'PDFs' : 'items'} found`
                }
              </td>
            </tr>
          ) : (
            visible.map((r) => {
            const urlForType = r.kind === 'youtube' ? (r.youtube?.url || '') : (r.file?.url || '');
            const type = r.kind === 'youtube' ? 'VIDEO' : getFileType(urlForType);
            const dateStr = toUTC(r.createdAt);
            const up = typeof r.upCount === 'number' ? r.upCount : (r.upvoters?.length || 0);
            const down = typeof r.downCount === 'number' ? r.downCount : (r.downvoters?.length || 0);
            const initialUserVote: "up" | "down" | null = userId ? (r.upvoters?.includes(userId) ? 'up' : (r.downvoters?.includes(userId) ? 'down' : null)) : null;

            const iconEl = () => {
              switch (type) {
                case 'PDF': return <FaFilePdf className="h-full w-full text-red-600" />;
                case 'DOCX': return <FaFileWord className="h-full w-full text-blue-600" />;
                case 'TEXT': return <FaFileAlt className="h-full w-full text-purple-600" />;
                case 'ZIP': return <FaFileArchive className="h-full w-full text-amber-500" />;
                case 'DRIVE': return <SiGoogledrive className="h-full w-full text-green-600" />;
                case 'VIDEO': return <FaYoutube className="h-full w-full text-red-600" />;
                default: return <FaLink className="h-full w-full text-gray-500" />;
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
                    <span>{r.ownerDisplayName || (r.ownerUserId === userId
                      ? (user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You')
                      : 'Unknown')}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{dateStr}</td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <VoteButtons
                    resourceId={r._id}
                    initialUp={up}
                    initialDown={down}
                    initialUserVote={initialUserVote}
                    onVoted={(data: { up: number; down: number; userVote: "up" | "down" | null }) => onVoted(r._id, data)}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    {/* Slot 1: View (always) */}
                    <div className="w-[120px] flex justify-center">
                      <a
                        href={urlForType}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        title="View"
                      >
                        <FaExternalLinkAlt className="h-3.5 w-3.5" />
                        <span>View</span>
                      </a>
                    </div>

                    {/* Slot 2: Copy link (video/drive) OR Download (docs/text). Otherwise placeholder for alignment */}
                    {type === 'VIDEO' || type === 'DRIVE' ? (
                      <div className="w-[120px] flex justify-center">
                        <CopyLinkButton url={urlForType} />
                      </div>
                    ) : (type === 'PDF' || type === 'DOCX' || type === 'TEXT') ? (
                      <div className="w-[120px] flex justify-center">
                        <a
                          href={urlForType}
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
                    <div className="w-[160px] flex justify-center">
                      {userId && r.ownerUserId === userId && confirmingId !== r._id && (
                        <button onClick={() => setConfirmingId(prev => (prev === r._id ? null : r._id))} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100" title="Delete resource">
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                      {confirmingId === r._id && (
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => { if (deletingId !== r._id) { setConfirmingId(null); handleDelete(r._id); } }} disabled={deletingId === r._id} className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">{deletingId === r._id ? 'Deleting…' : 'Confirm'}</button>
                          <button onClick={() => setConfirmingId(null)} disabled={deletingId === r._id} className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
}
