"use client";

import FolderTile from "@/app/components/resources/FolderTile";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type ConnectionDirectory = {
  _id: string;
  courseCode: string;
  title: string;
  updatedAt: string; // or Date
};

function sortItems(items: ConnectionDirectory[], sort: string): ConnectionDirectory[] {
  const by = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  switch (sort) {
    case "code_desc":
      return [...items].sort((a, b) => by(b.courseCode, a.courseCode));
    case "title_asc":
      return [...items].sort((a, b) => by(a.title.toLowerCase(), b.title.toLowerCase()));
    case "title_desc":
      return [...items].sort((a, b) => by(b.title.toLowerCase(), a.title.toLowerCase()));
    case "newest":
      return [...items].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    case "oldest":
      return [...items].sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt));
    default:
      // default: course code A–Z
      return [...items].sort((a, b) => by(a.courseCode, b.courseCode));
  }
}

export default function ConnectionDirectoriesClient({ items }: { readonly items: ConnectionDirectory[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(() => searchParams.get("q") || "");

  // Keep in sync with URL param on nav
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Live updates while typing
  useEffect(() => {
    function onQ(e: Event) {
      const q = (e as CustomEvent).detail?.q as string | undefined;
      if (typeof q === "string") setQuery(q);
    }
    window.addEventListener("resource-search:q", onQ as EventListener);
    return () => window.removeEventListener("resource-search:q", onQ as EventListener);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase().trim().replace(/\s+/g, " ");
    const tokens = q ? q.split(" ").filter(Boolean) : [];
    if (tokens.length === 0) return items;

    const norm = (s: string) => (s || "").toLowerCase();
    const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

    return items.filter((d) => {
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
  }, [items, query]);

  const sorted = useMemo(() => {
    const sort = searchParams.get("sort") || "";
    return sortItems(filtered, sort);
  }, [filtered, searchParams]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
        No folders found. Try a different search.
      </div>
    );
  }

  return (
    <div className="grid gap-5 justify-start justify-items-start [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      {sorted.map((d) => (
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
