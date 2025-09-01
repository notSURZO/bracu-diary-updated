'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaKey, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';

export default function AdminVerifyPage() {
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to access admin verification</h1>
          <Link 
            href="/sign-in" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!secretKey.trim()) {
      toast.error('Please enter a secret key');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secretKey: secretKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message and immediately redirect - no success page
        toast.success('Admin verification successful!');
        router.push('/events/create?admin=true&clubId=' + data.clubId + '&clubName=' + encodeURIComponent(data.clubName));
      } else {
        const errorMessage = data.message || data.error || 'Verification failed';
        toast.error(errorMessage);
        console.error('Verification failed:', data);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Back Button */}
          <Link 
            href="/events"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                <FaKey className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Verification</h1>
              <p className="text-gray-600">
                Enter your club's secret key to verify your admin status
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <input
                  type="password"
                  id="secretKey"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter your club's secret key"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify Admin Status'}
              </button>
            </form>

            {/* Info Section */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Need help?</h3>
              <p className="text-sm text-blue-800">
                Contact your university administrator to get your club's secret key. 
                This key is required to verify your admin status and create events.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
