'use client';

import { useState, useEffect, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// In-memory cache to store friends list
const friendsCache: { [email: string]: Friend[] } = {};

interface Friend {
  id: string;
  clerkId: string;
  name: string;
  username: string;
  email: string;
  picture_url: string;
  sharedResourceCount: number;
}

function FriendsSidebar() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname() || '/';
  const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || '';
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !currentUserEmail) {
      setIsLoading(false);
      return;
    }

    const fetchFriends = async () => {
      // Use cached friends if available
      if (friendsCache[currentUserEmail]) {
        setFriends(friendsCache[currentUserEmail]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/my-connections', { credentials: 'include' });
        const data = await response.json();

        if (response.ok) {
          setFriends(data);
          friendsCache[currentUserEmail] = data; // Cache the friends list
        } else {
          setError(data.error || 'Failed to fetch friends');
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setError('An error occurred while fetching friends');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [currentUserEmail, isLoaded]);

  if (!isLoaded || !currentUserEmail) {
    return null;
  }

  return (
    <aside className="fixed right-0 top-24 h-[calc(100vh-4rem)] w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">My Friends</h2>
      {error && <p className="text-red-500">{error}</p>}
      {friends.length === 0 && !isLoading && !error && (
        <p className="text-gray-500">No friends yet</p>
      )}
      {friends.length > 0 && (
        <ul className="space-y-2">
          {friends.map((friend) => {
            const target = `/connections/${friend.clerkId}/resources`;
            const isActive = pathname.startsWith(target);
            return (
              <li key={friend.id}>
                <Link
                  href={target}
                  className={`flex items-center p-2 rounded transition-colors relative ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {friend.picture_url ? (
                    <Image
                      src={friend.picture_url}
                      alt={`${friend.name}'s profile picture`}
                      width={30}
                      height={30}
                      className="rounded-full mr-3 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                      <span className="text-gray-500">{friend.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{friend.name}</span>
                    <span
                      title={`${friend.sharedResourceCount} shared folders`}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {friend.sharedResourceCount}
                    </span>
                  </div>
                  {isActive && (
                    <span className="absolute left-0 bottom-0 w-full h-0.5 bg-blue-700"></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(FriendsSidebar);