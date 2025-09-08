'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function JitsiRoom({ roomName }: { roomName: string }) {
  const { user } = useUser();
  const [popupBlocked, setPopupBlocked] = useState(false);

  const displayName = useMemo(
    () => encodeURIComponent(user?.fullName || user?.username || 'Guest'),
    [user?.fullName, user?.username]
  );

  // Build a direct meet.jit.si URL with prejoin enabled and display name
  const meetUrl = useMemo(() => {
    const base = `https://meet.jit.si/${encodeURIComponent(roomName)}`;
    const hash = `#config.prejoinPageEnabled=true&userInfo.displayName=${displayName}`;
    return `${base}${hash}`;
  }, [roomName, displayName]);

  useEffect(() => {
    // Open only once per room per tab (avoid React StrictMode double-invoke)
    try {
      const key = `jitsi-opened-${roomName}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        const w = window.open(meetUrl, '_blank', 'noopener,noreferrer');
        if (!w) setPopupBlocked(true);
      }
    } catch {
      const w = window.open(meetUrl, '_blank', 'noopener,noreferrer');
      if (!w) setPopupBlocked(true);
    }
  }, [meetUrl, roomName]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetUrl);
      alert('Meeting link copied to clipboard');
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-6rem)] bg-white">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Launching Study Room</h1>
        <p className="text-gray-600 mb-6">
          Your meeting is opening in a new tab on meet.jit.si.
        </p>

        {(popupBlocked) && (
          <div className="mb-6 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
            It looks like your browser blocked the popup. Please click the button below to open the meeting.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Open Meeting
          </a>
          <button
            onClick={copyLink}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black"
          >
            Copy Link
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500 break-all">
          Meeting URL: <a href={meetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">{meetUrl}</a>
        </div>
      </div>
    </div>
  );
}
