"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { readonly url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      aria-label="Copy link"
    >
      {copied ? (
        <>
          <span className="hidden sm:inline">Copied</span>
          <span className="sm:hidden inline">Copied</span>
        </>
      ) : (
        <>
          <span className="hidden sm:inline">Copy link</span>
          <span className="sm:hidden inline">Copy</span>
        </>
      )}
    </button>
  );
}
