"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateDirectoryModal({ isPrivate = false }: { isPrivate?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseCode || !title) return;
    try {
      setSubmitting(true);
      const endpoint = isPrivate ? "/api/private-resource-directories" : "/api/resource-directories";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode, title }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
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
