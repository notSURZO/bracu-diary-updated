"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const options: Array<{ value: string; label: string }> = [
  { value: "", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "code_asc", label: "Course Code A–Z" },
  { value: "code_desc", label: "Course Code Z–A" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
];

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (value) params.set("sort", value);
      else params.delete("sort");
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const current = searchParams.get("sort") || "";

  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
      <span className="sr-only">Sort folders</span>
      <select
        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-500"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort folders"
      >
        {options.map((opt) => (
          <option key={opt.value || "newest"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
