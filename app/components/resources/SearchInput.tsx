"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@nextui-org/react";

interface Props {
  readonly placeholder?: string;
}

export default function SearchInput({ placeholder }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(searchParams.get("q") || "");
  const [isFocused, setIsFocused] = useState(false);

  // Keep input in sync with URL when not focused to avoid wiping typing
  useEffect(() => {
    if (isFocused) return;
    const q = searchParams.get("q") || "";
    setValue(q);
    // Broadcast to listeners so grids update when URL changes externally
    try { window.dispatchEvent(new CustomEvent('resource-search:q', { detail: { q } })); } catch {}
  }, [searchParams, isFocused]);

  const updateQuery = useCallback(
    (next: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      // Use replace for live updates to avoid polluting browser history
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  // Debounced live search: broadcast to listeners without routing (avoids remounts)
  useEffect(() => {
    const trimmed = value.trim();
    const current = searchParams.get("q") || "";
    // No-op if value matches current URL and we're not focused
    if (!isFocused && trimmed === current) return;
    const id = setTimeout(() => {
      try { window.dispatchEvent(new CustomEvent('resource-search:q', { detail: { q: trimmed } })); } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [value, searchParams, isFocused]);

  return (
    <div className="w-full max-w-xl">
      <Input
        aria-label="Search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateQuery(value.trim());
        }}
        onBlur={() => { setIsFocused(false); updateQuery(value.trim()); }}
        radius="md"
        size="sm"
        classNames={{
          inputWrapper: "h-10 shadow-sm border border-gray-200 bg-white data-[focus=true]:border-blue-300",
          input: "text-[15px]",
        }}
        placeholder={placeholder || "Search..."}
        startContent={(
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
          </svg>
        )}
        endContent={value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setValue(""); updateQuery(""); }}
            className="text-gray-400 hover:text-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.293-5.293a1 1 0 001.414 0L10 11.414l.879.879a1 1 0 001.414-1.414L11.414 10l.879-.879a1 1 0 10-1.414-1.414L10 8.586l-.879-.879a1 1 0 10-1.414 1.414L8.586 10l-.879.879a1 1 0 000 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : null}
      />
    </div>
  );
}
