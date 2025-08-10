'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DbUser {
  clerkId: string;
  name: string;
  username: string;
  email: string;
  student_ID: string;
  picture_url: string;
  createdAt: string;
  updatedAt: string;
}

export default function AuthButtons() {
  const { isSignedIn, user } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchUserData();
    }
  }, [isSignedIn, user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      
      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData);
      } else {
        console.error('Error fetching user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isSignedIn) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">
          Welcome, {dbUser ? dbUser.name.split(' ')[0] : (loading ? '...' : 'User')}!
        </span>
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <SignInButton mode="modal">
        <button className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
} 