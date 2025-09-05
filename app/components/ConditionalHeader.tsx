'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import SearchBar from './SearchBar';
import Image from 'next/image';
import AuthButtons from './AuthButtons';
import Sidebar from './Sidebar';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { debounce } from "lodash";
import { format } from 'date-fns';

interface ConnectionRequest {
  email: string;
  name: string;
  username: string;
  student_ID: string;
  picture_url: string;
}

interface Deadline {
  id: string;
  title: string;
  details: string;
  submissionLink?: string;
  lastDate: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  section: string;
  type: 'theory' | 'lab';
  category?: 'Quiz' | 'Assignment' | 'Mid' | 'Final';
  createdBy: string;
  createdByName: string;
  createdByStudentId: string;
  createdAt: string;
  completed: boolean;
}

type MatchType = 'firstWord' | 'secondWord' | 'username';

interface Connection {
  id: string;
  name: string;
  username: string;
  email: string;
  picture_url: string;
  matchType?: MatchType;
}

const DisconnectConfirmationToast = ({
  friendName,
  onConfirm,
  onCancel,
}: {
  friendName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-md">
    <p className="text-gray-800 font-medium mb-2">Are you sure you want to disconnect from {friendName}?</p>
    <div className="flex space-x-2">
      <button
        onClick={onConfirm}
        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
);

export default function ConditionalHeader() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [isConnectionsDropdownOpen, setIsConnectionsDropdownOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [studyInvites, setStudyInvites] = useState<Array<{ _id: string; roomSlug: string; hostName: string; createdAt: string }>>([]);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionsDropdownRef = useRef<HTMLDivElement>(null);
  const connectionsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isRagbotPage = pathname === '/ragbot';

  const isConnectionsIconHighlighted = isConnectionsDropdownOpen;
  const isNotificationsIconHighlighted = isNotificationsDropdownOpen || (studyInvites.length > 0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Debounced search handler
  const handleSearchChange = debounce((value: string) => {
    setConnectionSearchQuery(value);
  }, 300);

  // Click-outside handler for connections dropdown
  useEffect(() => {
    const handleClickOutsideConnections = (event: MouseEvent) => {
      if (
        connectionsDropdownRef.current &&
        !connectionsDropdownRef.current.contains(event.target as Node) &&
        connectionsButtonRef.current &&
        !connectionsButtonRef.current.contains(event.target as Node)
      ) {
        setIsConnectionsDropdownOpen(false);
        setError(null);
        setShowRequests(false);
        setShowConnections(false);
        setConnectionSearchQuery('');
      }
    };
    if (isConnectionsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideConnections);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideConnections);
    };
  }, [isConnectionsDropdownOpen]);

  // Click-outside handler for notifications dropdown
  useEffect(() => {
    const handleClickOutsideNotifications = (event: MouseEvent) => {
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(event.target as Node) &&
        notificationsButtonRef.current &&
        !notificationsButtonRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsDropdownOpen(false);
        setError(null);
      }
    };
    if (isNotificationsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideNotifications);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideNotifications);
    };
  }, [isNotificationsDropdownOpen]);

  // Filter connections
  useEffect(() => {
    if (connectionSearchQuery.trim() === '') {
      setFilteredConnections(connections);
      return;
    }

    const lowerQuery = connectionSearchQuery.toLowerCase();
    const filtered = connections
      .map((connection) => {
        const nameWords = connection.name.split(' ');
        const firstWord = nameWords[0]?.toLowerCase() || '';
        const secondWord = nameWords[1]?.toLowerCase() || '';
        const username = connection.username.toLowerCase();

        let matchType: MatchType | null = null;
        if (firstWord.startsWith(lowerQuery)) {
          matchType = 'firstWord';
        } else if (secondWord.startsWith(lowerQuery)) {
          matchType = 'secondWord';
        } else if (username.startsWith(lowerQuery)) {
          matchType = 'username';
        }

        return matchType ? { ...connection, matchType } : null;
      })
      .filter((connection): connection is Connection & { matchType: MatchType } => connection !== null)
      .sort((a, b) => {
        const matchOrder: Record<MatchType, number> = { firstWord: 1, secondWord: 2, username: 3 };
        if (a.matchType !== b.matchType) {
          return matchOrder[a.matchType] - matchOrder[b.matchType];
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);

    setFilteredConnections(filtered);
  }, [connectionSearchQuery, connections]);

  const fetchConnectionRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/get-connection-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data.connectionRequests || []);
      } else {
        console.error('Error fetching connection requests:', data.error);
        setError(data.error || 'Failed to fetch connection requests');
        toast.error(data.error || 'Failed to fetch connection requests');
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
      setError('An error occurred while fetching connection requests');
      toast.error('An error occurred while fetching connection requests');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/my-connections', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setConnections(data || []);
        setFilteredConnections(data || []);
      } else {
        console.error('Error fetching connections:', data.error);
        setError(data.error || 'Failed to fetch connections');
        toast.error(data.error || 'Failed to fetch connections');
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('An error occurred while fetching connections');
      toast.error('An error occurred while fetching connections');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [deadlinesRes, invitesRes] = await Promise.all([
        fetch('/api/get-user-deadlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id }),
        }),
        fetch('/api/study-sessions/invites')
      ]);

      const deadlinesData = await deadlinesRes.json();
      const invitesData = await invitesRes.json();
      if (deadlinesRes.ok) setDeadlines(deadlinesData.deadlines || []);
      if (invitesRes.ok) setStudyInvites((invitesData.invites || []).map((i: any) => ({ _id: String(i._id), roomSlug: i.roomSlug, hostName: i.hostName, createdAt: i.createdAt })));
      if (!deadlinesRes.ok && !invitesRes.ok) {
        const errMsg = deadlinesData.error || invitesData.error || 'Failed to fetch notifications';
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      setError('An error occurred while fetching deadlines');
      toast.error('An error occurred while fetching deadlines');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const debouncedFetchNotifications = useMemo(() => debounce(fetchNotifications, 600), [fetchNotifications]);

  useEffect(() => {
    return () => debouncedFetchNotifications.cancel();
  }, [debouncedFetchNotifications]);

  const handleConnectionsToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileNavOpen(false);
    setIsNotificationsDropdownOpen(false);
    setIsConnectionsDropdownOpen((prev) => {
      const newState = !prev;
      if (!newState) {
        setError(null);
        setShowRequests(false);
        setShowConnections(false);
        setConnectionSearchQuery('');
      } else {
        fetchConnectionRequests(); // Fetch requests on every icon click
      }
      return newState;
    });
  };

  const handleNotificationsToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileNavOpen(false);
    setIsConnectionsDropdownOpen(false);
    setIsNotificationsDropdownOpen((prev) => {
      const newState = !prev;
      if (!newState) {
        setError(null);
      } else {
        debouncedFetchNotifications(); // Debounced fetch to avoid rapid repeats
      }
      return newState;
    });
  };

  // Background poll for study invites (lightweight)
  useEffect(() => {
    let timer: any;
    const poll = async () => {
      try {
        const res = await fetch('/api/study-sessions/invites');
        if (res.ok) {
          const data = await res.json();
          setStudyInvites((data.invites || []).map((i: any) => ({ _id: String(i._id), roomSlug: i.roomSlug, hostName: i.hostName, createdAt: i.createdAt })));
        }
      } catch {}
    };
    if (isSignedIn) {
      poll();
      timer = setInterval(poll, 15000);
    }
    return () => timer && clearInterval(timer);
  }, [isSignedIn]);

  const handleShowRequests = () => {
    setShowRequests(true);
    setShowConnections(false);
    setConnectionSearchQuery('');
    if (user) {
      fetchConnectionRequests();
    }
  };

  const handleShowConnections = () => {
    setShowConnections(true);
    setShowRequests(false);
    setConnectionSearchQuery('');
    if (user) {
      fetchConnections();
    }
  };

  const handleAcceptRequest = async (email: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/accept-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, requesterEmail: email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchConnectionRequests();
      } else {
        console.error('Error accepting connection request:', data.error);
        toast.error(data.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      toast.error('Failed to accept connection request');
    }
  };

  const handleRejectRequest = async (email: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/reject-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, requesterEmail: email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchConnectionRequests();
      } else {
        console.error('Error rejecting connection request:', data.error);
        toast.error(data.error || 'Failed to reject connection request');
      }
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      toast.error('Failed to reject connection request');
    }
  };

  const handleDisconnect = (friendEmail: string, friendName: string) => {
    if (!user) return;

    const toastId = toast(
      <DisconnectConfirmationToast
        friendName={friendName}
        onConfirm={async () => {
          try {
            const response = await fetch('/api/disconnect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, friendEmail }),
            });
            const data = await response.json();
            if (response.ok) {
              toast.success(data.message);
              fetchConnections();
            } else {
              console.error('Error disconnecting:', data.error);
              toast.error(data.error || 'Failed to disconnect');
            }
          } catch (error) {
            console.error('Error disconnecting:', error);
            toast.error('Failed to disconnect');
          } finally {
            toast.dismiss(toastId);
          }
        }}
        onCancel={() => toast.dismiss(toastId)}
      />,
      { autoClose: false, closeOnClick: false, draggable: false }
    );
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString || typeof dateString !== 'string') {
      return { date: 'Unknown', time: 'Unknown' };
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { date: 'Unknown', time: 'Unknown' };
    }
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'hh:mm a')
    };
  };

  if (!isLoaded) {
    return <div className="fixed top-0 left-0 right-0 p-4 bg-white shadow-sm">Loading...</div>;
  }

  if (!isSignedIn || !user) {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* First row: Logo */}
          <div className="flex justify-center p-3 border-b border-gray-200">
            <Link href="/" className="pointer-events-auto">
              <Image
                src="/bracu-diary-logo.svg"
                alt="BRACU Diary Logo"
                width={200}
                height={60}
                className="object-contain h-8 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Second row: Menu button and icons */}
          <div className="flex items-center justify-between p-3">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
              </svg>
            </button>

            <div className="flex items-center space-x-2">
              {/* Bot Icon */}
              <button
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                  isRagbotPage ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
                } cursor-pointer`}
                style={{ width: '40px', height: '40px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/ragbot');
                }}
              >
                <Image
                  src="/bot-icon.svg"
                  alt="Ragbot"
                  width={24}
                  height={24}
                  className="hover:opacity-80 transition"
                />
              </button>

              {/* Connection Requests Icon */}
              <button
                ref={connectionsButtonRef}
                onClick={handleConnectionsToggleDropdown}
                className={`relative cursor-pointer p-2 rounded-full transition-colors flex items-center justify-center ${
                  isConnectionsDropdownOpen ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
                }`}
                style={{ width: '40px', height: '40px' }}
              >
                <Image
                  src="/connect-requests.svg"
                  alt="Connection Requests"
                  width={24}
                  height={24}
                  className="hover:opacity-80 transition"
                />
              </button>

              {/* Notifications Icon */}
              <button
                ref={notificationsButtonRef}
                onClick={handleNotificationsToggleDropdown}
                className={`relative cursor-pointer p-2 rounded-full transition-colors flex items-center justify-center ${
                  isNotificationsDropdownOpen ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
                }`}
                style={{ width: '40px', height: '40px' }}
              >
                <Image
                  src="/bell-icon.svg"
                  alt="Notifications"
                  width={24}
                  height={24}
                  className="hover:opacity-80 transition"
                />
              </button>
            </div>

            <AuthButtons />
          </div>

          {/* Third row: Search bar */}
          <div className="p-3 border-t border-gray-200">
            <SearchBar />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
              </svg>
            </button>
            <Link href="/" className="pointer-events-auto">
              <Image
                src="/bracu-diary-logo.svg"
                alt="BRACU Diary Logo"
                width={200}
                height={60}
                className="object-contain h-8 sm:h-15 w-auto"
                priority
              />
            </Link>
            <div className="max-w-[480px] w-full">
              <SearchBar />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="relative flex items-center space-x-2">
              {/* Bot Icon */}
              <button
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                  isRagbotPage ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
                } cursor-pointer`}
                style={{ width: '40px', height: '40px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/ragbot');
                }}
              >
                <Image
                  src="/bot-icon.svg"
                  alt="Ragbot"
                  width={24}
                  height={24}
                  className="hover:opacity-80 transition"
                />
              </button>

              {/* Connection Requests Icon */}
              <button
                ref={connectionsButtonRef}
                onClick={handleConnectionsToggleDropdown}
                className={`relative cursor-pointer p-2 rounded-full transition-colors flex items-center justify-center ${
                  isConnectionsDropdownOpen ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
                }`}
                style={{ width: '40px', height: '40px' }}
              >
                <Image
                  src="/connect-requests.svg"
                  alt="Connection Requests"
                  width={24}
                  height={24}
                  className="hover:opacity-80 transition"
                />
              </button>

              {/* Notifications Icon */}
              <button
                ref={notificationsButtonRef}
                onClick={handleNotificationsToggleDropdown}
                className={`relative cursor-pointer p-2 rounded-full transition-colors flex items-center justify-center ${
                  isNotificationsDropdownOpen ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
                }`}
                style={{ width: '40px', height: '40px' }}
              >
                <Image
                  src="/bell-icon.svg"
                  alt="Notifications"
                  width={24}
                  height={24}
                  className="hover:opacity-80 transition"
                />
              </button>
            </div>
            
            <AuthButtons />
          </div>
        </div>

        {/* Dropdown menus (same for both mobile and desktop) */}
        {isConnectionsDropdownOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="sm:hidden fixed inset-0 bg-black/30 z-50"
              onClick={() => setIsConnectionsDropdownOpen(false)}
            />
            <div
              ref={connectionsDropdownRef}
              className={`fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-3 w-auto sm:w-96 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl p-0 ${
                showConnections ? 'max-h-[80vh]' : 'max-h-[70vh]'
              } overflow-y-auto z-[60] sm:z-50`}
            >
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Connections</h2>
              <button
                onClick={() => setIsConnectionsDropdownOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>
            {!showRequests && !showConnections ? (
              <ul className="divide-y divide-gray-100">
                <li
                  className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={handleShowConnections}
                >
                  <p className="font-medium text-gray-800">All Connections</p>
                </li>
                <li
                  className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={handleShowRequests}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">Connection Requests</p>
                  </div>
                </li>
              </ul>
            ) : showConnections ? (
              <>
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="🔍 Search connections..."
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowConnections(false);
                    setShowRequests(false);
                    setConnectionSearchQuery('');
                  }}
                  className="p-3 text-sm text-blue-600 hover:underline"
                >
                  Back to options
                </button>
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">{error}</div>
                ) : filteredConnections.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {connectionSearchQuery ? 'No connections match your search.' : 'No connections yet.'}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filteredConnections.map((connection) => (
                      <li
                        key={connection.email}
                        className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <Link
                          href={`/profile/${connection.username}`}
                          className="flex items-center space-x-3"
                          onClick={() => {
                            setIsConnectionsDropdownOpen(false);
                            setConnectionSearchQuery('');
                          }}
                        >
                          {connection.picture_url ? (
                            <Image
                              src={connection.picture_url}
                              alt={`${connection.name}'s profile picture`}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-500 text-base">{connection.name?.[0] || '?'}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{connection.name}</p>
                            <p className="text-sm text-gray-500">@{connection.username || connection.email}</p>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleDisconnect(connection.email, connection.name)}
                          className="px-3 py-1 bg-red-200 text-red-700 rounded-md text-sm hover:bg-red-300 transition-colors"
                        >
                          Disconnect
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : showRequests ? (
              <>
                <button
                  onClick={() => {
                    setShowRequests(false);
                    setShowConnections(false);
                    setConnectionSearchQuery('');
                  }}
                  className="p-3 text-sm text-blue-600 hover:underline"
                >
                  Back to options
                </button>
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">{error}</div>
                ) : requests.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No pending connection requests.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {requests.map((request) => (
                      <li
                        key={request.email}
                        className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          {request.picture_url ? (
                            <Image
                              src={request.picture_url}
                              alt={`${request.name}'s profile picture`}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-500 text-base">{request.name?.[0] || '?'}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{request.name}</p>
                            <p className="text-sm text-gray-500">@{request.username || request.email}</p>
                            <p className="text-sm text-gray-400">ID: {request.student_ID}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request.email)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.email)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
            </div>
          </>
        )}
        {isNotificationsDropdownOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="sm:hidden fixed inset-0 bg-black/30 z-50"
              onClick={() => setIsNotificationsDropdownOpen(false)}
            />
            <div
              ref={notificationsDropdownRef}
              className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-3 w-auto sm:w-96 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl p-0 max-h-[70vh] overflow-y-auto z-[60] sm:z-50"
            >
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
              <button
                onClick={() => setIsNotificationsDropdownOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
            </div>
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : deadlines.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No upcoming deadlines.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {deadlines.map((deadline) => {
                  const { date, time } = formatDateTime(deadline.lastDate);
                  return (
                    <li
                      key={deadline.id}
                      className={`p-3 hover:bg-gray-50 transition-colors flex justify-between items-center ${
                        deadline.completed ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      <Link
                        href={`/manage-deadlines/${deadline.courseId}`}
                        className="flex flex-col space-y-1 w-full"
                        onClick={() => {
                          setIsNotificationsDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-800">{deadline.title}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deadline.type === 'theory' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {deadline.type === 'theory' ? 'Theory' : 'Lab'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{deadline.courseCode} - {deadline.courseName} (Section {deadline.section})</p>
                        <p className="text-sm text-gray-500">Due: {date} at {time}</p>
                      </Link>
                      {deadline.completed && (
                        <span className="text-sm text-green-600 font-medium">Completed</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            </div>
          </>
        )}
      </header>
      
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
