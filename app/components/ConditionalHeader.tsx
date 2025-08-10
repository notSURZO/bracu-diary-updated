'use client';

import { useUser } from '@clerk/nextjs';
import SearchBar from './SearchBar';
import Image from 'next/image';
import AuthButtons from './AuthButtons';

export default function ConditionalHeader() {
  const { isSignedIn } = useUser();

  // Only show header if user is signed in
  if (!isSignedIn) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-white shadow-sm">
      <div className="flex items-center space-x-4">
        <Image
          src="/BRACU DIARY.svg"
          alt="BRACU Diary Logo"
          width={120}
          height={100}
          className="object-contain"
        />
        <Image
          src="/logo.svg"
          alt="BRACU Diary Logo"
          width={40}
          height={40}
          className="object-contain"
        />
        <SearchBar />
      </div>
      <AuthButtons />
    </header>
  );
} 