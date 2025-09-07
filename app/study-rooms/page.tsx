'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function randomSlug() {
  const s = Math.random().toString(36).slice(2, 8);
  return `study-${s}`;
}

export default function StudyRoomsHome() {
  const [room, setRoom] = useState('');
  const [invites, setInvites] = useState<Array<{ _id: string; roomSlug: string; hostName: string; createdAt: string }>>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [friends, setFriends] = useState<Array<{ id: string; name: string; username: string; email: string; picture_url?: string }>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const join = (e?: React.FormEvent) => {
    e?.preventDefault();
    const slug = (room || '').trim();
    if (!slug) return;
    router.push(`/study-rooms/${encodeURIComponent(slug)}`);
  };

  const createInstant = () => {
    router.push(`/study-rooms/${randomSlug()}`);
  };

  const openInviteModal = async () => {
    setInviteOpen(true);
    if (friends.length === 0) {
      setFriendsLoading(true);
      try {
        const res = await fetch('/api/my-connections', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (res.ok) setFriends(data || []);
      } finally {
        setFriendsLoading(false);
      }
    }
  };

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      f.name?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q)
    );
  }, [friendQuery, friends]);

  const toggleSelect = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredFriends.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredFriends.map(f => f.email)));
    }
  };

  const sendSelectedInvites = async () => {
    try {
      setSendingInvites(true);
      const invitees = Array.from(selectedEmails);
      const res = await fetch('/api/study-sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitees })
      });
      const data = await res.json();
      if (res.ok) {
        window.open(data.meetUrl, '_blank', 'noopener,noreferrer');
        setBanner({ type: 'success', text: `Invites sent to ${invitees.length} friend${invitees.length === 1 ? '' : 's'}. Room: ${data.roomSlug}` });
        await loadInvites();
        // Auto-close modal shortly after success so user sees banner
        setTimeout(() => {
          setInviteOpen(false);
          setSelectedEmails(new Set());
          setBanner(null);
        }, 2000);
      } else {
        setBanner({ type: 'error', text: data.message || 'Failed to start study session' });
      }
    } catch (e) {
      setBanner({ type: 'error', text: 'Error starting session' });
    } finally {
      setSendingInvites(false);
    }
  };

  const loadInvites = async () => {
    try {
      setLoadingInvites(true);
      const res = await fetch('/api/study-sessions/invites');
      const data = await res.json();
      if (res.ok) {
        setInvites((data.invites || []).map((i: any) => ({ _id: String(i._id), roomSlug: i.roomSlug, hostName: i.hostName, createdAt: i.createdAt })));
      }
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    loadInvites();
    const t = setInterval(loadInvites, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Group Study</h1>
                <p className="text-gray-600 mt-1">Join or create a free study room powered by Jitsi.</p>
              </div>
            </div>

            <form onSubmit={join} className="mt-6 space-y-4">
              <div>
                <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
                <div className="flex gap-3">
                  <input
                    id="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g., CSE220-Section-1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button type="submit" className="whitespace-nowrap bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-700">Join</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  <span className="opacity-80">Suggestions:</span>
                  {['CSE220-Section-1', 'MAT216-Study-Group', 'PHY103-Rev-Session'].map(s => (
                    <button type="button" key={s} onClick={() => setRoom(s)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">{s}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={openInviteModal} className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12a3 3 0 10-3-3 3 3 0 003 3zm-6 0a3 3 0 10-3-3 3 3 0 003 3zm0 2a5.985 5.985 0 00-4.9 2.6 1 1 0 00.2 1.4A9.931 9.931 0 0012 21a9.931 9.931 0 007.7-3 1 1 0 00.2-1.4A5.985 5.985 0 0015 14a7.936 7.936 0 00-6 0z"/></svg>
                  Start With Friends
                </button>
                <button type="button" onClick={createInstant} className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-black">Create Instant Room</button>
              </div>
            </form>

            <div className="mt-6 text-xs text-gray-500">By using this feature, you agree to Jitsi's fair-use policy on the public instance.</div>

            {/* Active Invites from connections */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Active Invites</h2>
                <button
                  onClick={loadInvites}
                  disabled={loadingInvites}
                  className={`inline-flex items-center gap-2 text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 ${loadingInvites ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {loadingInvites && (
                    <svg className="h-4 w-4 animate-spin text-gray-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  )}
                  {loadingInvites ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
              {loadingInvites ? (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {[1,2,3].map((k) => (
                    <li key={k} className="p-4 flex items-center justify-between animate-pulse">
                      <div className="w-2/3 h-4 bg-gray-200 rounded" />
                      <div className="flex gap-2">
                        <div className="h-8 w-16 bg-gray-200 rounded" />
                        <div className="h-8 w-20 bg-gray-200 rounded" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : invites.length === 0 ? (
                <div className="text-gray-500 text-sm">No active invites from your connections.</div>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {invites.map((inv) => (
                    <li key={inv._id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Group study started by {inv.hostName}</p>
                        <p className="text-xs text-gray-500">Room: {inv.roomSlug}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://meet.jit.si/BRACU-DIARY-${encodeURIComponent(inv.roomSlug)}#config.prejoinPageEnabled=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        >
                          Join
                        </a>
                        <button
                          onClick={async () => {
                            try {
                              await fetch('/api/study-sessions/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId: inv._id }) });
                              setInvites(prev => prev.filter(i => i._id !== inv._id));
                            } catch {}
                          }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <Link href="/events" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                Back to Events
              </Link>
            </div>
          </div>

          {/* Side Card: Tips / Illustration */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Make The Most Of Group Study</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">1</span>
                  Share your agenda and goals at the start.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700">2</span>
                  Use short timeboxes (25–40 mins) and breaks.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700">3</span>
                  Keep cameras on for quick whiteboarding when needed.
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <div className="w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-indigo-100 via-fuchsia-100 to-emerald-100 flex items-center justify-center">
                <div className="text-center px-6">
                  <p className="text-sm text-gray-600">Your friends will appear in the invite picker. Select just who you need.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Friends Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInviteOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Invite Friends</h3>
                <button onClick={() => setInviteOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
              </div>
              <div className="p-5">
                {banner && (
                  <div className={`mb-3 p-3 rounded-lg border ${banner.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-start gap-2">
                      {banner.type === 'success' ? (
                        <svg className="h-5 w-5 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17l-3.88-3.88L4 13.41 9 18.41 20.59 6.83 19.17 5.41z"/></svg>
                      ) : (
                        <svg className="h-5 w-5 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path d="M1 21h22L12 2 1 21z"/></svg>
                      )}
                      <div className="flex-1 text-sm">{banner.text}</div>
                      <button onClick={() => setBanner(null)} className="text-current/70 hover:text-current">&times;</button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    type="text"
                    placeholder="Search friends by name, username, email"
                    value={friendQuery}
                    onChange={(e) => setFriendQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="whitespace-nowrap px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    {selectedEmails.size === filteredFriends.length && filteredFriends.length > 0 ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div className="mt-4 max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
                  {friendsLoading ? (
                    <div className="p-6 text-center text-gray-500">Loading friends...</div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No friends found.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {filteredFriends.map((f) => (
                        <li key={f.email} className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{f.name || f.username || f.email}</p>
                            <p className="text-xs text-gray-500 truncate">{f.username ? `@${f.username}` : f.email}</p>
                          </div>
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedEmails.has(f.email)}
                              onChange={() => toggleSelect(f.email)}
                            />
                            <span className="text-sm text-gray-700">Invite</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedEmails.size} selected
                </p>
                <div className="flex gap-3">
                  <button onClick={() => { setInviteOpen(false); setBanner(null); }} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={sendSelectedInvites}
                    disabled={selectedEmails.size === 0 || sendingInvites}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white ${selectedEmails.size === 0 || sendingInvites ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {sendingInvites && (
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    )}
                    {sendingInvites ? 'Sending...' : 'Send Invites & Open Room'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
