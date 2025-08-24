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
        if (code.startsWith(t)) return true;
        if (titleWords.some((w) => w.startsWith(t))) return true;
        if (t.length >= 3 && (title.includes(t) || code.includes(t))) return true;
        return false;
      });
    });
  }, [list, query]);

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
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
        No folders found. Try a different search or create one.
      </div>
    );
  }

  return (
    <div className="grid gap-6 justify-start justify-items-center [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
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
  );
}
