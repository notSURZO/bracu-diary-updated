"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, RadioGroup, Radio } from "@nextui-org/react";
import { toast } from "react-toastify";

export default function CreateDirectoryModal({ isPrivate = false }: { readonly isPrivate?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<'private' | 'connections' | 'public'>(isPrivate ? 'private' : 'public');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [courseValid, setCourseValid] = useState<boolean | null>(null);
  const [hasLab, setHasLab] = useState(false);
  const [showLabPrompt, setShowLabPrompt] = useState(false);
  const [createBothFolders, setCreateBothFolders] = useState(false);

  async function validateCourse() {
    if (!courseCode) return;
    
    try {
      setValidating(true);
      setError(null);
      
      // Validate course exists in Course collection (public resources namespace)
      const course = await fetch('/api/resource-directories/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode })
      });
      
      const data = await course.json();
      
      if (!data.valid) {
        setError(
          data.message ||
            'Course not found. Please input a valid course code and try again.'
        );
        setCourseValid(false);
        return;
      }
      
      // Auto-fill canonical course name from server
      setTitle(data.courseName || '');
      setCourseValid(true);
      setHasLab(data.hasLab);
      
      if (data.hasLab) {
        setShowLabPrompt(true);
      } else {
        // No lab, proceed directly
        await createDirectories(false);
      }
      
    } catch (err) {
      setError('Failed to validate course. Please input a valid course code and try again.');
      setCourseValid(false);
    } finally {
      setValidating(false);
    }
  }

  async function createDirectories(includeLab: boolean) {
    try {
      setSubmitting(true);
      setError(null);
      
      const endpoint = isPrivate ? "/api/private-resource-directories" : "/api/resource-directories";
      const payload = {
        courseCode,
        title,
        visibility: isPrivate ? visibility : 'public',
        createTheoryLab: includeLab
      };
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
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
      
      const result = await res.json();
      
      if (result.createdTheoryLab) {
        toast.success('Course folder created with Theory and Lab subfolders');
      } else {
        toast.success('Course folder created successfully');
      }
      
      resetForm();
      setOpen(false);
      router.refresh();
      
    } catch (err) {
      setError('Failed to create directories');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCourseCode("");
    setTitle("");
    setCourseValid(null);
    setHasLab(false);
    setShowLabPrompt(false);
    setCreateBothFolders(false);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseCode) return;
    
    if (courseValid === null) {
      await validateCourse();
    } else if (courseValid && showLabPrompt) {
      await createDirectories(createBothFolders);
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
      <Modal
        isOpen={open}
        onOpenChange={(v) => {
          setOpen(v);
          // ensure visibility stays public on public resources
          if (!isPrivate) setVisibility('public');
        }}
        hideCloseButton={false}
        backdrop="opaque"
        size="md"
        placement="center"
      >
        <ModalContent className="bg-white">
          {(onClose) => (
            <form onSubmit={onSubmit} className="contents">
              <ModalHeader className="flex flex-col gap-1">Create Folder</ModalHeader>
              <ModalBody className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
                )}
                
                {courseValid === true && (
                  <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                    ✓ Course validated successfully {hasLab ? '(has lab sections)' : '(theory only)'}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="dir-course-code" className="text-sm font-medium text-gray-700">Course Code</label>
                    <input
                      id="dir-course-code"
                      type="text"
                      placeholder="e.g., CSE220"
                      value={courseCode}
                      onChange={(e) => {
                        setCourseCode(e.target.value.toUpperCase());
                        setCourseValid(null);
                        setTitle("");
                      }}
                      required
                      disabled={courseValid === true}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="dir-title" className="text-sm font-medium text-gray-700">Course Name</label>
                    <input
                      id="dir-title"
                      type="text"
                      placeholder="Will be auto-filled after validation"
                      value={title}
                      readOnly
                      disabled
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {isPrivate && !showLabPrompt && (
                  <RadioGroup
                    label="Visibility"
                    orientation="horizontal"
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as any)}
                  >
                    <Radio value="private">Private</Radio>
                    <Radio value="connections">Connections</Radio>
                  </RadioGroup>
                )}
                
                {showLabPrompt && (
                  <div className="space-y-3">
                    <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                      This course has lab sections. Would you like to create separate Theory and Lab folders?
                    </div>
                    <RadioGroup
                      value={createBothFolders ? "both" : "single"}
                      onValueChange={(v) => setCreateBothFolders(v === "both")}
                    >
                      <Radio value="single">Create single folder (upload all resources together)</Radio>
                      <Radio value="both">Create Theory and Lab folders separately</Radio>
                    </RadioGroup>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    resetForm();
                    onClose();
                  }} 
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                
                {courseValid === true && showLabPrompt && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowLabPrompt(false);
                      setCourseValid(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Back
                  </button>
                )}
                
                <button 
                  type="submit" 
                  disabled={submitting || validating} 
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {validating ? "Validating..." : submitting ? "Creating..." : courseValid === null ? "Validate Course" : showLabPrompt ? "Create Folders" : "Create"}
                </button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
