'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import JitsiRoom from '../JitsiRoom';

function sanitizeRoomId(id: string): string {
  // allow letters, numbers, dash, underscore; trim length
  return (id || 'study-room').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'study-room';
}

export default function StudyRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = useMemo(() => sanitizeRoomId(params?.roomId as string), [params?.roomId]);

  if (!roomId) {
    router.replace('/study-rooms');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Link href="/study-rooms" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            Back to Study Rooms
          </Link>
          <div className="text-sm text-gray-600">Room: <span className="font-semibold">{roomId}</span></div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <JitsiRoom roomName={`BRACU-DIARY-${roomId}`} />
        </div>
      </div>
    </div>
  );
}

