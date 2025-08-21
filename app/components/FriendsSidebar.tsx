'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface Friend {
  id: string;
  clerkId: string;
  name: string;
  username: string;
  email: string;
  picture_url: string;
  sharedResourceCount: number;
}

export default function FriendsSidebar() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname() || '/';
  const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || '';
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const HIDE_PREFIXES = [
    '/public-resources',
    '/manage-resources',
    '/resources',
    '/my-resources',
  ];
  const shouldHide = HIDE_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isLoaded || !currentUserEmail) {
      return;
    }

    const fetchFriends = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/my-connections');
        const data = await response.json();

        if (response.ok) {
          setFriends(data);
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

  if (!isLoaded || !currentUserEmail || shouldHide) {
    return null;
  }

  return (
    <aside className="fixed right-0 top-24 h-[calc(100vh-4rem)] w-54 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">My Friends</h2>
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {friends.length === 0 && !isLoading && !error && (
        <p className="text-gray-500">No friends yet</p>
      )}
      {friends.length > 0 && (
        <ul className="space-y-4">
          {friends.map((friend) => (
            <li key={friend.id}>
              <Link href={`/connections/${friend.clerkId}/resources`} className="flex items-center justify-between hover:bg-gray-100 p-2 rounded">
                <div className="flex items-center">
                  {friend.picture_url ? (
                    <Image
                      src={friend.picture_url}
                      alt={`${friend.name}'s profile picture`}
                      width={30}
                      height={20}
                      className="rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{friend.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <span className="font-medium">{friend.name}</span>
                </div>
                {friend.sharedResourceCount > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-1 rounded-full">
                    {friend.sharedResourceCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}