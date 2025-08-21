"use client";

import DirectoryCard from "@/app/components/resources/DirectoryCard";
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
    const q = (query || "").trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    if (tokens.length === 0) return items;
    return items.filter((d) => {
      const code = (d.courseCode || "").toLowerCase();
      const title = (d.title || "").toLowerCase();
      return tokens.every((t) => code.startsWith(t) || title.startsWith(t));
    });
  }, [items, query]);

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
        No folders found. Try a different search or create one.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visible.map((d) => (
        <DirectoryCard
          key={d._id}
          _id={d._id}
          courseCode={d.courseCode}
          title={d.title}
          visibility={d.visibility}
          ownerUserId={d.ownerUserId}
          updatedAt={d.updatedAt}
        />
      ))}
    </div>
  );
}
