"use client";

import Link from "next/link";

interface Props {
  _id: string;
  title: string;
  subdirectoryType?: "theory" | "lab";
  variant: "public" | "private";
}

export default function SubfolderTile({ _id, title, subdirectoryType, variant }: Readonly<Props>) {
  const href = `/${variant}-resources/folders/${_id}`;

  return (
    <Link
      href={href}
      className="group block h-full rounded-lg p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:-translate-y-0.5 transition"
      aria-label={`Open subfolder ${title}`}
    >
      {/* Icon */}
      <div className="select-none">
        <div className="relative mx-auto flex h-44 w-full max-w-[300px] items-center justify-center">
          <svg viewBox="0 0 200 140" className="h-40 w-auto" aria-hidden="true">
            <defs>
              <linearGradient id="sf_folderFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6EC0FF" />
                <stop offset="55%" stopColor="#3FA9F5" />
                <stop offset="100%" stopColor="#1E88E5" />
              </linearGradient>
              <linearGradient id="sf_tabFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BEE3FF" />
                <stop offset="100%" stopColor="#8EC8FF" />
              </linearGradient>
            </defs>
            <path d="M16 46c0-8.837 7.163-16 16-16h36c4.418 0 8.79 1.948 11.8 5.3l6.4 7.2A16 16 0 0 0 101.6 46H168c8.837 0 16 7.163 16 16v46c0 8.837-7.163 16-16 16H32c-8.837 0-16-7.163-16-16V46z" fill="url(#sf_folderFill)" />
            <path d="M48 34c0-4.418 3.582-8 8-8h32c3.2 0 6.26 1.53 8.16 4.12l5.04 6.88c1.5 2.05 3.89 3.28 6.42 3.28H168c4.418 0 8 3.582 8 8v10H48V34z" fill="url(#sf_tabFill)" />
          </svg>
        </div>
      </div>

      {/* Caption */}
      <div className="mt-3 text-center">
        <div className="mt-1 min-h-[2.6em] line-clamp-2 text-[1.05rem] font-semibold leading-snug text-gray-900 group-hover:text-gray-950" title={title}>
          {title}
        </div>
      </div>
    </Link>
  );
}
