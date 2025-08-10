// app/components/SearchBar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string; // Changed to _id to match API response
  name: string;
  username: string;
  email: string;
  student_ID: string;
  picture_url: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Replace with your authentication logic to get the current user's username
  const currentUserUsername = 'current_user'; // Example: Replace with session?.user?.username from NextAuth

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok) {
          // Map _id to id for compatibility with existing interface
          const formattedData = data.map((user: any) => ({
            ...user,
            id: user._id,
          }));
          setResults(formattedData);
        } else {
          console.error('Search error:', data.error);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleConnect = async (targetUserId: string) => {
    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, currentUserUsername }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message); // Replace with toast notification for better UX
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error sending connect request:', error);
      alert('Failed to send connect request');
    }
  };

  return (
    <div className="search-container relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for people..."
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 w-full p-2 border rounded"
      />
      {isLoading && <div className="search-results p-2 text-gray-500">Loading...</div>}
      {results.length > 0 && !isLoading && (
        <ul className="search-results absolute w-full bg-white border rounded shadow-lg mt-1">
          {results.map((user) => (
            <li key={user.id} className="p-3 hover:bg-gray-100 flex justify-between items-center">
              <Link href={`/profile/${user.username}`} className="flex items-center">
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
                    <span className="text-gray-500">{user.name[0]}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">{user.name}</span>
                  <span className="ml-2 text-gray-500">(@{user.username})</span>
                  <p className="text-sm text-gray-500">ID: {user.student_ID}</p>
                </div>
              </Link>
              <button
                onClick={() => handleConnect(user.id)}
                className="ml-4 p-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
                disabled={user.username === currentUserUsername}
              >
                Connect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}