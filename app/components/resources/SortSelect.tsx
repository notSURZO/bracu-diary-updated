"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Select, SelectItem } from "@nextui-org/react";

const options: Array<{ value: string; label: string }> = [
  // Empty value is the default; we want Course Code A–Z by default
  { value: "", label: "Course Code A–Z" },
  { value: "code_desc", label: "Course Code Z–A" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
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
    <div className="min-w-[200px]">
      <Select
        aria-label="Sort folders"
        selectedKeys={new Set([current])}
        onSelectionChange={(keys) => {
          const val = Array.from(keys as Set<string>)[0] || "";
          onChange(val);
        }}
        size="sm"
        radius="lg"
        popoverProps={{ className: "z-[70]" }}
        classNames={{
          trigger:
            "h-10 pr-12 rounded-xl border border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm hover:shadow transition-colors hover:border-gray-300 data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-blue-500",
          value: "truncate text-[0.95rem] text-gray-900",
          selectorIcon: "right-3 text-gray-600",
          popoverContent:
            "rounded-xl bg-white border border-gray-200 shadow-xl",
          listbox: "bg-white",
        }}
      >
        {options.map((opt) => (
          <SelectItem key={opt.value || ""} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
