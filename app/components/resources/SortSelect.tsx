"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Select, SelectItem } from "@nextui-org/react";

const options: Array<{ value: string; label: string }> = [
  { value: "code_asc", label: "Course Code A–Z" },
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

  const current = searchParams.get("sort") || "code_asc";

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
            "h-11 pr-12 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300 data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-blue-500 data-[focus-visible=true]:ring-offset-1",
          value: "truncate text-[0.95rem] text-gray-900 font-medium",
          selectorIcon: "right-3 text-gray-600",
          popoverContent:
            "rounded-lg bg-white border border-gray-200 shadow-xl",
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
