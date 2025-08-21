"use client";
import { useEffect, useRef, useState } from "react";
import UploadPublicResourceForm from "@/app/components/resources/UploadPublicResourceForm";

interface Props {
  triggerLabel?: string;
  courseCode: string;
  defaultCourseName?: string;
  directoryId?: string;
}

export default function UploadModal({ triggerLabel = "Upload", courseCode, defaultCourseName, directoryId }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus trap and ESC handling
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusFirst = () => {
      const first = dialog.querySelector<HTMLElement>(focusableSelectors);
      first?.focus();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelectors)).filter(el => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // Initial focus
    setTimeout(focusFirst, 0);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Return focus to trigger on close
  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div ref={dialogRef} className="w-full max-w-2xl rounded-lg bg-white shadow-xl outline-none">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 id="upload-modal-title" className="text-base font-semibold text-gray-900">Upload a Resource</h3>
                <button
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <UploadPublicResourceForm
                  courseCode={courseCode}
                  defaultCourseName={defaultCourseName}
                  directoryId={directoryId}
                  onSuccess={() => setOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
