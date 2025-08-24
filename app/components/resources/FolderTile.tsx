"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  _id: string;
  courseCode: string;
  title: string;
  updatedAt: string;
  variant: "public" | "private";
}

// Compute on client after mount to avoid hydration mismatch from Date.now()
function useTimeAgo(dateString: string) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    const date = new Date(dateString);
    const compute = () => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return `${Math.floor(interval)} years ago`;
      interval = seconds / 2592000;
      if (interval > 1) return `${Math.floor(interval)} months ago`;
      interval = seconds / 86400;
      if (interval > 1) return `${Math.floor(interval)} days ago`;
      interval = seconds / 3600;
      if (interval > 1) return `${Math.floor(interval)} hours ago`;
      interval = seconds / 60;
      if (interval > 1) return `${Math.floor(interval)} minutes ago`;
      return `${Math.max(0, Math.floor(seconds))} seconds ago`;
    };
    setText(compute());
    const id = setInterval(() => setText(compute()), 60 * 1000);
    return () => clearInterval(id);
  }, [dateString]);
  return text;
}

export default function FolderTile({ _id, courseCode, title, updatedAt, variant }: Readonly<Props>) {
  const href = `/${variant}-resources/folders/${_id}`;
  const rel = useTimeAgo(updatedAt);
  const isoTitle = new Date(updatedAt).toISOString();
  return (
    <Link
      href={href}
      className="group block h-full rounded-lg p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`Open folder ${title}`}
    >
      {/* Folder illustration (SVG) */}
      <div className="select-none">
        {/* Fixed-height icon area to keep all tiles equal */}
        <div className="relative mx-auto flex h-40 w-full max-w-[260px] items-center justify-center transition-transform group-hover:-translate-y-0.5">
          <svg viewBox="0 0 200 140" className="h-36 w-auto" aria-hidden="true">
            <defs>
              <linearGradient id="folderFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6EC0FF" />
                <stop offset="55%" stopColor="#3FA9F5" />
                <stop offset="100%" stopColor="#1E88E5" />
              </linearGradient>
              <linearGradient id="tabFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BEE3FF" />
                <stop offset="100%" stopColor="#8EC8FF" />
              </linearGradient>
              <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
              <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset dx="0" dy="1" />
                <feGaussianBlur stdDeviation="2" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood floodColor="#0B4A83" floodOpacity="0.18" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
              </filter>
              <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feOffset dx="0" dy="1" />
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0.2  0 0 0 0 0.45  0 0 0 0.35 0" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Folder body */}
            <path
              d="M16 46c0-8.837 7.163-16 16-16h36c4.418 0 8.79 1.948 11.8 5.3l6.4 7.2A16 16 0 0 0 101.6 46H168c8.837 0 16 7.163 16 16v46c0 8.837-7.163 16-16 16H32c-8.837 0-16-7.163-16-16V46z"
              fill="url(#folderFill)"
              stroke="#0B67B3"
              strokeOpacity="0.22"
              filter="url(#innerShadow)"
            />

            {/* Tab */}
            <path
              d="M48 34c0-4.418 3.582-8 8-8h32c3.2 0 6.26 1.53 8.16 4.12l5.04 6.88c1.5 2.05 3.89 3.28 6.42 3.28H168c4.418 0 8 3.582 8 8v10H48V34z"
              fill="url(#tabFill)"
              stroke="#0B67B3"
              strokeOpacity="0.18"
            />

            {/* Gloss highlight */}
            <path d="M24 54h152c0 0-2 10-10 14s-44 10-66 10-54-4-66-9S24 54 24 54z" fill="url(#gloss)" />

            {/* Baseline lines */}
            <g stroke="#1A73E8" strokeOpacity="0.35">
              <line x1="40" y1="110" x2="160" y2="110" />
              <line x1="40" y1="116" x2="160" y2="116" />
              <line x1="40" y1="122" x2="160" y2="122" />
            </g>
          </svg>
        </div>
      </div>

      {/* Caption with neutral code pill above title */}
      <div className="mt-3 text-center">
        <div className="mx-auto inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-[13px] font-mono font-bold uppercase tracking-wider text-gray-900">
          {courseCode}
        </div>
        {/* Reserve two lines of height to prevent jumping */}
        <div className="mt-1 min-h-[2.6em] line-clamp-2 text-[0.95rem] font-semibold leading-snug text-gray-900 group-hover:text-gray-950" title={title}>
          {title}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-500" title={isoTitle} suppressHydrationWarning>
          {rel ? `Updated ${rel}` : "\u00A0"}
        </div>
      </div>
    </Link>
  );
}
