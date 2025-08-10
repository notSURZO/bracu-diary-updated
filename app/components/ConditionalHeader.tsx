'use client';

import { useUser } from '@clerk/nextjs';
import SearchBar from './SearchBar';
import Image from 'next/image';
import AuthButtons from './AuthButtons';
import { useState } from 'react';

export default function ConditionalHeader() {
  const { isSignedIn, user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Only show header if user is signed in
  if (!isSignedIn) {
    return null;
  }

  const fetchConnectionRequests = async () => {
    setIsLoading(true);
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
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchConnectionRequests();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRequests([]);
  };

  return (
    <>
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
        <div className="flex items-center space-x-4">
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Connect Requests
          </button>
          <AuthButtons />
        </div>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pending Connection Requests</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            {isLoading ? (
              <p>Loading...</p>
            ) : requests.length === 0 ? (
              <p>No pending connection requests.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((username, index) => (
                  <li key={index} className="p-2 bg-gray-100 rounded">
                    {username}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}