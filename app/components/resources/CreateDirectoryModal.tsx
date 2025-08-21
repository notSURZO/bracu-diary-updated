"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, RadioGroup, Radio } from "@nextui-org/react";

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
        className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="-ml-0.5 text-base leading-none">+</span>
        <span>Create Folder</span>
      </button>
      <Modal isOpen={open} onOpenChange={setOpen} hideCloseButton={false} backdrop="opaque">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={onSubmit} className="contents">
              <ModalHeader className="flex flex-col gap-1">Create Folder</ModalHeader>
              <ModalBody>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
                )}
                <Input
                  id="dir-course-code"
                  label="Course Code"
                  placeholder="e.g., CSE220"
                  value={courseCode}
                  onValueChange={(v) => setCourseCode(v.toUpperCase())}
                  isRequired
                />
                <Input
                  id="dir-title"
                  label="Folder Title"
                  placeholder="e.g., Data Structures"
                  value={title}
                  onValueChange={setTitle}
                  isRequired
                />
                <RadioGroup
                  label="Visibility"
                  orientation="horizontal"
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as any)}
                >
                  <Radio value="private">Private</Radio>
                  <Radio value="connections">Connections</Radio>
                </RadioGroup>
              </ModalBody>
              <ModalFooter>
                <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {submitting ? "Creating..." : "Create"}
                </button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
