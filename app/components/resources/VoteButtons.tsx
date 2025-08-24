"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@clerk/nextjs";

type Props = {
  resourceId: string;
  initialUp?: number;
  initialDown?: number;
  initialUserVote?: "up" | "down" | null;
  onVoted?: (data: { up: number; down: number; userVote: "up" | "down" | null }) => void;
};

export default function VoteButtons({ resourceId, initialUp = 0, initialDown = 0, initialUserVote = null, onVoted }: Props) {
  const { isSignedIn } = useAuth();
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(initialUserVote);
  const [isPending, startTransition] = useTransition();

  const score = up - down;

  async function vote(action: "up" | "down") {
    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }

    // optimistic update
    const prev = { up, down, userVote };
    const next = { up, down, userVote } as { up: number; down: number; userVote: "up" | "down" | null };
    if (action === "up") {
      if (userVote === "up") {
        next.userVote = null;
        next.up = Math.max(0, up - 1);
      } else {
        next.userVote = "up";
        next.up = up + 1;
        if (userVote === "down") next.down = Math.max(0, down - 1);
      }
    } else {
      if (userVote === "down") {
        next.userVote = null;
        next.down = Math.max(0, down - 1);
      } else {
        next.userVote = "down";
        next.down = down + 1;
        if (userVote === "up") next.up = Math.max(0, up - 1);
      }
    }
    setUp(next.up);
    setDown(next.down);
    setUserVote(next.userVote);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/resources/${resourceId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: next.userVote ?? "clear" }),
        });
        if (!res.ok) throw new Error("Vote failed");
        const data = await res.json();
        setUp(data.up ?? next.up);
        setDown(data.down ?? next.down);
        setUserVote(data.userVote ?? next.userVote);
        if (onVoted) onVoted({ up: data.up ?? next.up, down: data.down ?? next.down, userVote: data.userVote ?? next.userVote });
      } catch (e) {
        // revert on error
        setUp(prev.up);
        setDown(prev.down);
        setUserVote(prev.userVote);
      }
    });
  }

  return (
    <div className="mt-1.5 flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => vote("up")}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border px-0 transition shadow-sm ${userVote === "up" ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50`}
        aria-label="Upvote"
        disabled={isPending}
        title="Upvote"
      >
        ▲
      </button>
      <div className="min-w-[2ch] text-center font-medium text-gray-800 rounded-md bg-gray-100 px-2 py-1 leading-none" aria-live="polite">{up}</div>
      <button
        type="button"
        onClick={() => vote("down")}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border px-0 transition shadow-sm ${userVote === "down" ? "border-rose-500 text-rose-600 bg-rose-50" : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50`}
        aria-label="Downvote"
        disabled={isPending}
        title="Downvote"
      >
        ▼
      </button>
      <div className="min-w-[2ch] text-center font-medium text-gray-800 rounded-md bg-gray-100 px-2 py-1 leading-none">{down}</div>
    </div>
  );
}
