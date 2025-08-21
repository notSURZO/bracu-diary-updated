"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  _id: string;
  courseCode: string;
  title: string;
  visibility: 'private' | 'connections' | 'public';
  ownerUserId: string;
  updatedAt: string;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export default function DirectoryCard({ _id, courseCode, title, visibility, ownerUserId, updatedAt }: Readonly<Props>) {
  const { user } = useUser();
  const router = useRouter();
  const [currentVisibility, setCurrentVisibility] = useState(visibility);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = user?.id === ownerUserId;
  const isPrivate = visibility !== 'public';

  const badgeStyles: Record<typeof visibility, string> = {
    private: 'border-purple-200 bg-purple-50 text-purple-700',
    connections: 'border-sky-200 bg-sky-50 text-sky-700',
    public: 'border-green-200 bg-green-50 text-green-700',
  };

  const badgeText: Record<typeof visibility, string> = {
    private: 'Private',
    connections: 'Connections',
    public: 'Public',
  };

  async function handleVisibilityChange(newVisibility: 'private' | 'connections') {
    if (!isOwner || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/private-resource-directories/${_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: newVisibility }),
        }
      );
      if (!res.ok) throw new Error('Failed to update visibility');
      setCurrentVisibility(newVisibility);
      // Optionally, refresh data to ensure consistency
      router.refresh();
    } catch (error) {
      console.error(error);
      // Revert optimistic update on failure
      setCurrentVisibility(visibility);
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <div className="group flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 ease-in-out hover:shadow-lg hover:border-blue-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-100 text-center text-xs font-semibold leading-tight text-blue-700"
            title={courseCode}
          >
            <span className="px-1 truncate">{courseCode}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-gray-900" title={title}>
              {title}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeStyles[currentVisibility]}`}>
                {badgeText[currentVisibility]}
              </span>

              {isOwner && isPrivate && (
                <div className="relative">
                  <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-200 ${currentVisibility === 'connections' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleVisibilityChange(currentVisibility === 'private' ? 'connections' : 'private')}
                      aria-label={`Set visibility to ${currentVisibility === 'private' ? 'connections' : 'private'}`}
                      className={`relative inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 disabled:opacity-70 ${currentVisibility === 'connections' ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </div>
                  {isSubmitting && <div className="absolute -inset-1.5 animate-pulse rounded-full bg-blue-400/30" />} 
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500" title={new Date(updatedAt).toLocaleString()}>
          Updated {timeAgo(updatedAt)}
        </p>
        <Link
          href={`/${isPrivate ? 'private' : 'public'}-resources/folders/${_id}`}
          aria-label={`View resources for ${title}`}
          className="inline-flex items-center justify-center h-9 rounded-md border border-transparent bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View
        </Link>
      </div>
    </div>
  );
}
