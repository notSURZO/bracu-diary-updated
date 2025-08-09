'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string;
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
          setResults(data);
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

  return (
    <div className="search-container relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for people..."
        className="focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isLoading && <div className="search-results p-2 text-gray-500">Loading...</div>}
      {results.length > 0 && !isLoading && (
        <ul className="search-results">
          {results.map((user) => (
            <li key={user.id} className="p-3 hover:bg-gray-100">
              <Link href={`/profile/${user.username}`}>
                <div className="flex items-center">
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}