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
      className="inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
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
