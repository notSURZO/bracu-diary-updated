"use client";
import { useEffect, useRef, useState } from "react";
import UploadPublicResourceForm from "@/app/components/resources/UploadPublicResourceForm";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";

interface Props {
  triggerLabel?: string;
  courseCode: string;
  defaultCourseName?: string;
  directoryId?: string;
  isPrivate?: boolean;
}

export default function UploadModal({ triggerLabel = "Upload", courseCode, defaultCourseName, directoryId, isPrivate = false }: Props) {
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
        className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {triggerLabel}
      </button>
      <Modal isOpen={open} onOpenChange={setOpen} backdrop="opaque">
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader id="upload-modal-title">Upload a Resource</ModalHeader>
              <ModalBody>
                <UploadPublicResourceForm
                  courseCode={courseCode}
                  defaultCourseName={defaultCourseName}
                  directoryId={directoryId}
                  isPrivate={isPrivate}
                  onSuccess={() => setOpen(false)}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
