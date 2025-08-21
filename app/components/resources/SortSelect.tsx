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
    <div className="min-w-[180px]">
      <Select
        aria-label="Sort folders"
        selectedKeys={new Set([current])}
        onSelectionChange={(keys) => {
          const val = Array.from(keys as Set<string>)[0] || "";
          onChange(val);
        }}
        size="sm"
        radius="md"
        popoverProps={{ className: "z-[70]" }}
        classNames={{
          trigger: "h-10 shadow-sm border border-gray-300 bg-white pr-12",
          popoverContent: "bg-white border border-gray-200 shadow-lg",
          listbox: "bg-white",
          selectorIcon: "right-4 text-gray-600",
          value: "truncate",
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
