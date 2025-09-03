"use client";

import FolderTile from "@/app/components/resources/FolderTile";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type PublicDirectory = {
  _id: string;
  courseCode: string;
  title: string;
  updatedAt: string; // or Date
};

export default function PublicDirectoriesClient({ items }: { readonly items: PublicDirectory[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(() => searchParams.get("q") || "");
  const [list, setList] = useState<PublicDirectory[]>(() => items.map(i => ({ ...i })));

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

  const visible = useMemo(() => {
    const q = (query || "").toLowerCase().trim().replace(/\s+/g, " ");
    const tokens = q ? q.split(" ").filter(Boolean) : [];
    if (tokens.length === 0) return list;

    const norm = (s: string) => (s || "").toLowerCase();
    const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

    return list.filter((d) => {
      const code = norm(d.courseCode);
      const title = norm(d.title);
      const titleWords = words(d.title);

      return tokens.every((t) => {
        // Prefix match on course code
        if (code.startsWith(t)) return true;
        // Prefix match on any title word (e.g., "programming l" => Programming Language)
        if (titleWords.some((w) => w.startsWith(t))) return true;
        // Substring fallback for longer fragments
        if (t.length >= 3 && (title.includes(t) || code.includes(t))) return true;
        return false;
      });
    });
  }, [list, query]);

  // Live update: when a resource is created in a directory, bump that directory's updatedAt to now
  useEffect(() => {
    const onCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { item?: { directoryId?: string } } | undefined;
      const dirId = detail?.item?.directoryId;
      if (!dirId) return;
      setList(prev => prev.map(d => d._id === dirId ? { ...d, updatedAt: new Date().toISOString() } : d));
    };
    window.addEventListener('resource:created', onCreated as EventListener);
    return () => window.removeEventListener('resource:created', onCreated as EventListener);
  }, []);

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
        No folders found. Try a different search or create one.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:gap-6 justify-start justify-items-center [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
      {visible.map((d) => (
        <FolderTile
          key={d._id}
          _id={d._id}
          courseCode={d.courseCode}
          title={d.title}
          updatedAt={d.updatedAt}
          variant="public"
        />)
      )}
    </div>
  );
}
