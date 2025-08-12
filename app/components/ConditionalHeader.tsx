// components/ConditionalHeader.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import SearchBar from './SearchBar';
import Image from 'next/image';
import AuthButtons from './AuthButtons';
import { useState } from 'react';
import Sidebar from './Sidebar';

interface ConnectionRequest {
  email: string;
  name: string;
  username: string;
  student_ID: string;
  picture_url: string;
}

export default function ConditionalHeader() {
  const { isSignedIn, user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show header and sidebar if user is signed in
  if (!isSignedIn || !user) {
    return null;
  }

  const fetchConnectionRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/get-connection-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data.connectionRequests || []);
      } else {
        console.error('Error fetching connection requests:', data.error);
        setError(data.error || 'Failed to fetch connection requests');
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
      setError('An error occurred while fetching connection requests');
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
    setError(null);
  };

  const handleAcceptRequest = async (email: string) => {
    try {
      const response = await fetch('/api/accept-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, requesterEmail: email }),
      });
      const data = await response.json();
      if (response.ok) {
        fetchConnectionRequests();
        alert(data.message); // Replace with toast notification
      } else {
        console.error('Error accepting connection request:', data.error);
        alert(data.error || 'Failed to accept connection request');
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      alert('Failed to accept connection request');
    }
  };

  const handleRejectRequest = async (email: string) => {
    try {
      const response = await fetch('/api/reject-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, requesterEmail: email }),
      });
      const data = await response.json();
      if (response.ok) {
        fetchConnectionRequests();
        alert(data.message); // Replace with toast notification
      } else {
        console.error('Error rejecting connection request:', data.error);
        alert(data.error || 'Failed to reject connection request');
      }
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      alert('Failed to reject connection request');
    }
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <Image
            src="/bracu-diary-logo.svg"
            alt="BRACU Diary Logo"
            width={270}
            height={180}
            className="object-contain"
          />
          <SearchBar />
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={handleOpenModal} className="relative">
            <Image
              src="/connect-requests.svg"
              alt="Connection Requests"
              width={35}
              height={35}
              className="hover:opacity-80 transition"
            />
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <AuthButtons />
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar />

      {/* Connection Requests Modal */}
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
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : requests.length === 0 ? (
              <p>No pending connection requests.</p>
            ) : (
              <ul className="space-y-4">
                {requests.map((request) => (
                  <li
                    key={request.email}
                    className="p-3 bg-gray-100 rounded flex items-center justify-between"
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
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500">{request.name?.[0] || '?'}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{request.name}</p>
                        <p className="text-sm text-gray-500">@{request.username || request.email}</p>
                        <p className="text-sm text-gray-500">ID: {request.student_ID}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(request.email)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.email)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
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