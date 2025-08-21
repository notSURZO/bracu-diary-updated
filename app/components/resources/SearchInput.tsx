"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Props {
  readonly placeholder?: string;
}

export default function SearchInput({ placeholder }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setValue(searchParams.get("q") || "");
  }, [searchParams]);

  const updateQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      // Use replace for live updates to avoid polluting browser history
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Debounced live search: update URL as user types
  useEffect(() => {
    const trimmed = value.trim();
    const current = searchParams.get("q") || "";
    // Avoid unnecessary navigations
    if (trimmed === current) return;
    const id = setTimeout(() => {
      updateQuery(trimmed);
    }, 250);
    return () => clearTimeout(id);
  }, [value, updateQuery, searchParams]);

  return (
    <div className="w-full max-w-xl relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
        </svg>
      </span>
      <input
        className="w-full h-10 rounded-md border border-gray-200 bg-white pl-10 pr-3 text-[15px] placeholder:text-gray-400 shadow-sm outline-none focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
        placeholder={placeholder || "Search..."}
        aria-label="Search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateQuery(value.trim());
        }}
        onBlur={() => updateQuery(value.trim())}
      />
    </div>
  );
}
