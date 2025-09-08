'use client';

import { useState, useEffect, useRef } from 'react';
import ResourceCard from "@/app/components/resources/ResourceCard";
import SearchInput from "@/app/components/resources/SearchInput";
import UploadPublicResourceForm from "@/app/components/resources/UploadPublicResourceForm";
import { SignedIn } from "@clerk/nextjs";

interface ResourceItem {
  _id: string;
  title: string;
  description?: string;
  file: any;
  ownerUserId: string;
  kind?: 'file' | 'youtube';
  youtube?: { url: string; videoId: string };
  createdAt?: string;
  upvoters?: string[];
  downvoters?: string[];
  ownerDisplayName?: string;
  courseCode?: string;
}

interface CourseResourceClientProps {
  readonly initialItems: ResourceItem[];
  readonly courseCode: string;
  readonly initialAvatars: (string | null)[];
}

export default function CourseResourceClient({ 
  initialItems, 
  courseCode, 
  initialAvatars 
}: CourseResourceClientProps) {
  
  const [items, setItems] = useState<ResourceItem[]>(initialItems || []);
  const [query, setQuery] = useState('');
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // Filter items based on search query
  const filtered = query.trim().toLowerCase()
    ? items.filter((it) => {
        const t = (it.title || "").toLowerCase();
        const d = (it.description || "").toLowerCase();
        return t.startsWith(query.trim().toLowerCase()) || d.startsWith(query.trim().toLowerCase());
      })
    : items;

  // Helper function to handle resource creation
  const handleResourceCreated = (e: Event) => {
    const detail = (e as CustomEvent).detail as { item: ResourceItem } | undefined;
    if (!detail?.item) return;
    
    // Check if this resource belongs to the current course
    if (detail.item.courseCode !== courseCode) return;
    
    setItems(prev => {
      if (prev.some(it => it._id === detail.item._id)) return prev; // dedupe
      if (deletedIdsRef.current.has(detail.item._id)) return prev; // ignore if recently deleted
      return [detail.item, ...prev];
    });
  };

  // Helper function to handle resource deletion
  const handleResourceDeleted = (e: Event) => {
    const detail = (e as CustomEvent).detail as { id: string } | undefined;
    if (!detail?.id) return;
    setItems(prev => prev.filter(it => it._id !== detail.id));
    deletedIdsRef.current.add(detail.id);
    // optional: purge IDs after some time
    setTimeout(() => deletedIdsRef.current.delete(detail.id), 5 * 60 * 1000);
  };

  // Listen for optimistic create events from upload forms
  useEffect(() => {
    window.addEventListener('resource:created', handleResourceCreated as EventListener);
    window.addEventListener('resource:deleted', handleResourceDeleted);
    
    return () => {
      window.removeEventListener('resource:created', handleResourceCreated);
      window.removeEventListener('resource:deleted', handleResourceDeleted);
    };
  }, [courseCode]);

  // Fetch uploader avatars for display
  useEffect(() => {
    const ids = Array.from(new Set((items || []).map(i => i.ownerUserId).filter(Boolean)));
    if (!ids.length) return;
    (async () => {
      try {
        const res = await fetch('/api/users/by-ids', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ ids }) 
        });
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const u of data?.users || []) {
          if (u?.id) map[u.id] = u.picture_url || '';
        }
        setAvatarMap(map);
      } catch {}
    })();
  }, [items]);

  // Create avatar array for ResourceCard components
  const avatars = items.map(item => avatarMap[item.ownerUserId] || null);

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{courseCode} Public Resources</h1>
        <SearchInput 
          placeholder="Search title or description" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          No resources found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r, idx) => (
            <ResourceCard 
              key={r._id} 
              title={r.title} 
              description={r.description} 
              file={r.file} 
              ownerAvatarUrl={avatars[idx]} 
            />
          ))}
        </div>
      )}
      
      <SignedIn>
        <UploadPublicResourceForm courseCode={courseCode} />
      </SignedIn>
    </div>
  );
}
