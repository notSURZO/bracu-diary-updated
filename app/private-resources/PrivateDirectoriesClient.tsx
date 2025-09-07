"use client";

import FolderTile from "@/app/components/resources/FolderTile";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type PrivateDirectory = {
  _id: string;
  courseCode: string;
  title: string;
  visibility: 'private' | 'connections' | 'public';
  ownerUserId: string;
  updatedAt: string; // or Date
};

export default function PrivateDirectoriesClient({ items }: { readonly items: PrivateDirectory[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(() => searchParams.get("q") || "");
  const [list, setList] = useState<PrivateDirectory[]>(() => items.map(i => ({ ...i })));

  // Sync with URL (blur/Enter or history nav)
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Live updates from SearchInput while typing (no routing)
  useEffect(() => {
    function onQ(e: Event) {
      const q = (e as CustomEvent).detail?.q as string | undefined;
      if (typeof q === "string") setQuery(q);
    }
    window.addEventListener("resource-search:q", onQ as EventListener);
    return () => window.removeEventListener("resource-search:q", onQ as EventListener);
  }, []);

  // Get current sort parameter
  const currentSort = searchParams.get("sort") || "code_asc";

  const visible = useMemo(() => {
    const q = (query || "").toLowerCase().trim().replace(/\s+/g, " ");
    const tokens = q ? q.split(" ").filter(Boolean) : [];
    
    let filtered = list;
    if (tokens.length > 0) {
      const norm = (s: string) => (s || "").toLowerCase();
      const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

      filtered = list.filter((d) => {
        const code = norm(d.courseCode);
        const title = norm(d.title);
        const titleWords = words(d.title);

        return tokens.every((t) => {
          if (code.startsWith(t)) return true;
          if (titleWords.some((w) => w.startsWith(t))) return true;
          if (t.length >= 3 && (title.includes(t) || code.includes(t))) return true;
          return false;
        });
      });
    }

    // Apply instant client-side sorting
    return [...filtered].sort((a, b) => {
      switch (currentSort) {
        case 'code_desc':
          return b.courseCode.localeCompare(a.courseCode);
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'newest':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'code_asc':
        default:
          return a.courseCode.localeCompare(b.courseCode);
      }
    });
  }, [list, query, currentSort]);

  // Live update: when a private resource is created in a directory, bump that directory's updatedAt
  useEffect(() => {
    const onCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { item?: { directoryId?: string } } | undefined;
      const dirId = detail?.item?.directoryId;
      if (!dirId) return;
      setList(prev => prev.map(d => d._id === dirId ? { ...d, updatedAt: new Date().toISOString() } : d));
    };
    window.addEventListener('private-resource:created', onCreated as EventListener);
    return () => window.removeEventListener('private-resource:created', onCreated as EventListener);
  }, []);

  // Optimistic: when a private directory is created, prepend it to the list immediately
  useEffect(() => {
    const onDirCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { item?: PrivateDirectory } | undefined;
      const item = detail?.item;
      if (!item) return;
      setList(prev => {
        // Avoid duplicates by id
        if (prev.some(d => d._id === item._id)) return prev;
        return [item, ...prev];
      });
    };
    window.addEventListener('private-directory:created', onDirCreated as EventListener);
    return () => window.removeEventListener('private-directory:created', onDirCreated as EventListener);
  }, []);

  if (visible.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No folders found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search terms or create a new folder.</p>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 inline-block">
            💡 Tip: Search by course code (e.g., "CSE220") or course name
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {visible.length} {visible.length === 1 ? 'Folder' : 'Folders'} Available
            </h2>
            <p className="text-sm text-gray-600">Click any folder to view resources</p>
          </div>
        </div>
        {query && (
          <div className="text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
            Filtered by: "{query}"
          </div>
        )}
      </div>

      {/* Grid - keeping original folder tile structure */}
      <div className="grid gap-5 sm:gap-6 justify-start justify-items-center [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {visible.map((d) => (
          <FolderTile
            key={d._id}
            _id={d._id}
            courseCode={d.courseCode}
            title={d.title}
            updatedAt={d.updatedAt}
            variant="private"
          />
        ))}
      </div>
    </div>
  );
}
