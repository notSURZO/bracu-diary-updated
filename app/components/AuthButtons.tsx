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

  // Sync image when user changes their profile picture
  useEffect(() => {
    if (isSignedIn && user && dbUser) {
      const syncImage = async () => {
        try {
          const response = await fetch('/api/users/update-image', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            setDbUser(prev => prev ? { ...prev, picture_url: data.picture_url } : null);
          }
        } catch (error) {
          console.error('Error syncing image:', error);
        }
      };

      // Check if Clerk image is different from MongoDB image
      if (user.imageUrl !== dbUser.picture_url) {
        syncImage();
      }
    }
  }, [user?.imageUrl, dbUser?.picture_url, isSignedIn]);

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
        <span className="text text-gray-600">
          Welcome, {dbUser ? dbUser.name.split(' ')[0] : (loading ? '...' : 'User')}!
        </span>
        <UserButton 
          
          appearance={{
            elements: {
              avatarBox: "w-10 h-10"
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