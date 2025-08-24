"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface Props {
  directory: {
    _id: string;
    courseCode: string;
    title: string;
    visibility: 'private' | 'connections';
    ownerUserId: string;
  };
}

export default function PrivateFolderHeader({ directory }: Readonly<Props>) {
  const { user } = useUser();
  const router = useRouter();
  const [currentVisibility, setCurrentVisibility] = useState(directory.visibility);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === directory.ownerUserId;

  const badgeStyles: Record<typeof currentVisibility, string> = {
    private: 'border-purple-200 bg-purple-50 text-purple-700',
    connections: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  const badgeText: Record<typeof currentVisibility, string> = {
    private: 'Private',
    connections: 'Connections',
  };

  async function handleVisibilityChange(newVisibility: 'private' | 'connections') {
    if (!isOwner || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/private-resource-directories/${directory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      setCurrentVisibility(newVisibility);
      router.refresh(); // Refresh server components
    } catch (error) {
      console.error(error);
      setCurrentVisibility(directory.visibility); // Revert on error
    } finally {
      setIsSubmitting(false);
    }

  }

  async function handleDelete() {
    if (!isOwner || isDeleting) return;
    const confirmed = window.confirm('Delete this folder and its subfolders? This cannot be undone.');
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/private-resource-directories/${directory._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete folder');
      // Navigate back to private directories list and refresh
      router.replace('/private-resources');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Could not delete folder. Please try again.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="text-xs text-gray-500">{directory.courseCode}</div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 truncate">{directory.title}</h1>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${badgeStyles[currentVisibility]}`}>
            {badgeText[currentVisibility]}
          </span>
          {isOwner && (
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
          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
