'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-toastify';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  student_ID: string;
  picture_url: string;
  connectionRequests: string[];
  connections: string[];
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const { user, isLoaded } = useUser();
  const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || '';

  useEffect(() => {
    console.log('Clerk user:', user);
    if (!query || !isLoaded || !currentUserEmail) {
      setResults([]);
      setError(null);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&excludeEmail=${encodeURIComponent(currentUserEmail)}`
        );
        const data = await response.json();

        if (response.ok) {
          const formattedData = data.map((user: any) => ({
            ...user,
            id: user.id,
            connectionRequests: user.connectionRequests || [],
            connections: user.connections || [],
          }));
          console.log('Search results:', formattedData);
          setResults(formattedData);
        } else {
          console.error('Search error:', data.error);
          setError(data.error || 'Failed to fetch search results');
          toast.error(data.error || 'Failed to fetch search results');
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setError('An error occurred while searching');
        toast.error('An error occurred while searching');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query, currentUserEmail, isLoaded]);

  const handleConnect = async (targetUserId: string) => {
    setIsConnecting(targetUserId);
    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, currentUserEmail }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        setResults((prevResults) =>
          prevResults.map((user) =>
            user.id === targetUserId
              ? { ...user, connectionRequests: [...user.connectionRequests, currentUserEmail] }
              : user
          )
        );
      } else if (response.status === 409) {
        toast.info(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error sending connect request:', error);
      toast.error('Failed to send connect request');
    } finally {
      setIsConnecting(null);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const renderConnectButton = (user: User) => {
    if (user.connections.includes(currentUserEmail)) {
      return (
        <span className="ml-4 p-1 text-gray-500 text-sm">
          Already connected
        </span>
      );
    }
    if (user.connectionRequests.includes(currentUserEmail)) {
      return (
        <span className="ml-4 p-1 text-blue-500 text-sm">
          Request Sent
        </span>
      );
    }
    return (
      <button
        onClick={() => handleConnect(user.id)}
        className="ml-4 p-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
        disabled={user.email.toLowerCase() === currentUserEmail || isConnecting === user.id}
      >
        {isConnecting === user.id ? 'Connecting...' : 'Connect'}
      </button>
    );
  };

  return (
    <div className="search-container relative max-w-lg">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search for people..."
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 w-full p-2 border rounded"
      />
      {isLoading && <div className="search-results p-2 text-gray-500 max-w-lg">Loading...</div>}
      {error && <div className="search-results p-2 text-red-500 max-w-lg">{error}</div>}
      {results.length === 0 && query && !isLoading && !error && (
        <div className="search-results p-2 text-gray-500 max-w-lg">No results found</div>
      )}
      {results.length > 0 && !isLoading && (
        <ul className="search-results absolute w-full max-w-lg bg-white border rounded shadow-lg mt-1 z-10">
          {results.map((user) => (
            <li key={user.id} className="p-3 hover:bg-gray-100 flex justify-between items-center">
              <Link
                href={`/profile/${user.username || user.email}`}
                className="flex items-center"
                onClick={clearSearch}
              >
                {user.picture_url ? (
                  <Image
                    src={user.picture_url}
                    alt={`${user.name}'s profile picture`}
                    width={40}
                    height={40}
                    className="rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                    <span className="text-gray-500">{user.name?.[0] || '?'}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">{user.name}</span>
                  <span className="ml-2 text-gray-500">(@{user.username || user.email})</span>
                  <p className="text-sm text-gray-500">ID: {user.student_ID}</p>
                </div>
              </Link>
              {renderConnectButton(user)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}