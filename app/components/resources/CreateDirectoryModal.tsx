"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateDirectoryModal({ isPrivate = false }: { readonly isPrivate?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<'private' | 'connections' | 'public'>('private');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseCode || !title) return;
    try {
      setSubmitting(true);
      setError(null);
      const endpoint = isPrivate ? "/api/private-resource-directories" : "/api/resource-directories";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ courseCode, title, visibility }),
      });
      if (!res.ok) {
        let message = "Failed to create folder";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}
        setError(message);
        return;
      }
      setOpen(false);
      setCourseCode("");
      setTitle("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span className="-ml-0.5 text-base leading-none">+</span>
        <span>Create Folder</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 text-lg font-semibold">Create Folder</div>
            <form onSubmit={onSubmit} className="grid gap-3">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
              )}
              <div>
                <label htmlFor="dir-course-code" className="mb-1 block text-xs text-gray-600">Course Code</label>
                <input
                  id="dir-course-code"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., CSE220"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label htmlFor="dir-title" className="mb-1 block text-xs text-gray-600">Folder Title</label>
                <input
                  id="dir-title"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., Data Structures"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <fieldset>
                <legend className="mb-1 block text-xs text-gray-600">Visibility</legend>
                <div className="flex rounded-md border border-gray-300 p-0.5">
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`flex-1 rounded-md px-3 py-1 text-center text-sm transition-colors ${
                      visibility === 'private'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}>
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('connections')}
                    className={`flex-1 rounded-md px-3 py-1 text-center text-sm transition-colors ${
                      visibility === 'connections'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}>
                    Connections
                  </button>
                </div>
              </fieldset>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
