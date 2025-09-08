"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import Image from "next/image";

type Friend = {
  clerkId: string;
  id: string;
  name: string;
  username: string;
  email: string;
  picture_url?: string;
  sharedResourceCount: number;
};

export default function ConnectionsDropdown() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/my-connections", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load connections");
        }
        const data = await res.json();
        if (mounted) setFriends(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load connections");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Keep per-friend count in the list, but don't show any count on the trigger button

  return (
    <Dropdown closeOnSelect>
      <DropdownTrigger>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-700/20 bg-gradient-to-b from-blue-600 to-blue-700 px-3 sm:px-3.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:from-blue-600 hover:to-blue-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 whitespace-nowrap"
          disabled={loading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-90">
            <path d="M10 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1Z" />
          </svg>
          <span className="hidden sm:inline">View Connection Resources</span>
          <span className="sm:hidden">Connections</span>
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Connections list"
        emptyContent={error ? error : "No connections found"}
        className="bg-white shadow-lg border border-gray-200 max-h-80 overflow-y-auto rounded-md"
      >
        {friends.map((f) => (
          <DropdownItem
            key={f.clerkId}
            textValue={f.name || f.username || f.email}
            className="data-[hover=true]:bg-blue-50 data-[selectable=true]:focus:bg-blue-100"
            startContent={
              f.picture_url ? (
                <Image
                  src={f.picture_url}
                  alt={`${f.name}'s profile picture`}
                  width={36}
                  height={36}
                  className="rounded-full object-cover ring-2 ring-blue-200"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gray-200 ring-2 ring-blue-200 flex items-center justify-center text-xs font-semibold text-gray-500">
                  {(f.name || f.username || "?").toString().charAt(0)}
                </div>
              )
            }
            endContent={
              <span className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {f.sharedResourceCount}
              </span>
            }
            onPress={() => router.push(`/connections/${f.clerkId}/resources`)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">{f.name || f.username || f.email}</div>
                {f.username && (
                  <div className="truncate text-[11px] text-gray-500">@{f.username}</div>
                )}
              </div>
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
