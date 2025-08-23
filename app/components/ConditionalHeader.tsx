'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function ConditionalHeader() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isIconHighlighted = isDropdownOpen;

  // Debounced search handler
  const handleSearchChange = debounce((value: string) => {
    setConnectionSearchQuery(value);
  }, 300);

  // Click-outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setError(null);
        setShowRequests(false);
        setShowConnections(false);
        setShowNotifications(false);
        setConnectionSearchQuery('');
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Fetch connection requests, connections, and deadlines on mount
  useEffect(() => {
    if (isSignedIn && user) {
      fetchConnectionRequests();
      fetchNotifications();
    }
  }, [isSignedIn, user]);

  // Fetch connection requests, connections, or notifications based on state
  useEffect(() => {
    if (isSignedIn && user) {
      if (showRequests && !requests.length) {
        fetchConnectionRequests();
      } else if (showConnections) {
        fetchConnections();
      } else if (showNotifications && !deadlines.length) {
        fetchNotifications();
      }
    }
  }, [isSignedIn, user, showRequests, showConnections, showNotifications, requests.length, deadlines.length]);

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

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/get-user-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setDeadlines(data.deadlines || []);
      } else {
        console.error('Error fetching deadlines:', data.error);
        setError(data.error || 'Failed to fetch deadlines');
        toast.error(data.error || 'Failed to fetch deadlines');
      }
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      setError('An error occurred while fetching deadlines');
      toast.error('An error occurred while fetching deadlines');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDropdown = (e: React.MouseEvent, type: 'connections' | 'notifications') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen((prev) => {
      const newState = !prev || (prev && (type === 'notifications' ? showConnections || showRequests : showNotifications));
      if (!newState) {
        setError(null);
        setShowRequests(false);
        setShowConnections(false);
        setShowNotifications(false);
        setConnectionSearchQuery('');
      } else {
        if (type === 'connections') {
          setShowNotifications(false);
          setShowRequests(false);
          setShowConnections(false);
        } else if (type === 'notifications') {
          setShowRequests(false);
          setShowConnections(false);
          setShowNotifications(true);
          if (!deadlines.length) fetchNotifications();
        }
      }
      return newState;
    });
  };

  const handleShowRequests = () => {
    setShowRequests(true);
    setShowConnections(false);
    setShowNotifications(false);
    setConnectionSearchQuery('');
    if (user && !requests.length) {
      fetchConnectionRequests();
    }
  };

  const handleShowConnections = () => {
    setShowConnections(true);
    setShowRequests(false);
    setShowNotifications(false);
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
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/" className="pointer-events-auto">
            <Image
              src="/bracu-diary-logo.svg"
              alt="BRACU Diary Logo"
              width={270}
              height={180}
              className="object-contain"
              priority
            />
          </Link>
          <SearchBar />
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={(e) => handleToggleDropdown(e, 'connections')}
              className={`relative cursor-pointer p-1 rounded-full transition-colors ${
                isIconHighlighted && (showRequests || showConnections) ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
              }`}
            >
              <Image
                src="/connect-requests.svg"
                alt="Connection Requests"
                width={35}
                height={35}
                className="hover:opacity-80 transition"
              />
              {requests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {requests.length}
                </span>
              )}
            </button>
            <button
              ref={notificationButtonRef}
              onClick={(e) => handleToggleDropdown(e, 'notifications')}
              className={`relative cursor-pointer p-1 rounded-full transition-colors ${
                isIconHighlighted && showNotifications ? 'bg-gray-200 border border-gray-400' : 'hover:bg-gray-100'
              }`}
            >
              <Image
                src="/bell-icon.svg"
                alt="Notifications"
                width={35}
                height={35}
                className="hover:opacity-80 transition"
              />
              {deadlines.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {deadlines.length}
                </span>
              )}
            </button>
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className={`absolute top-full right-0 mt-3 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-0 ${
                  showConnections ? 'max-h-[80vh]' : 'max-h-[70vh]'
                } overflow-y-auto z-50`}
              >
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {showNotifications ? 'Notifications' : 'Connections'}
                  </h2>
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    &times;
                  </button>
                </div>
                {!showRequests && !showConnections && !showNotifications ? (
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
                      <p className="font-medium text-gray-800">Connection Requests</p>
                    </li>
                    <li
                      className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowNotifications(true);
                        setShowRequests(false);
                        setShowConnections(false);
                        if (!deadlines.length) fetchNotifications();
                      }}
                    >
                      <p className="font-medium text-gray-800">Notifications</p>
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
                        setShowNotifications(false);
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
                              className="flex items-center space-x-3 w-full"
                              onClick={() => {
                                setIsDropdownOpen(false);
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
                        setShowNotifications(false);
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
                ) : showNotifications ? (
                  <>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
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
                                  setIsDropdownOpen(false);
                                  setShowNotifications(false);
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
                  </>
                ) : null}
              </div>
            )}
          </div>
          <AuthButtons />
        </div>
      </header>
      <Sidebar />
    </>
  );
}