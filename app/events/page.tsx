'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaCalendarCheck, FaUsers } from 'react-icons/fa';

export default function EventsPage() {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to access events</h1>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Events</h1>
            <p className="text-lg text-gray-600">Manage and discover events at BRAC University</p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Club Admin Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                  <FaUsers className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">I am a Club Admin</h2>
                <p className="text-gray-600 mb-6">
                  Create and manage events for your club. You'll need to verify your admin status first.
                </p>
                <div className="space-y-3">
                  <Link 
                    href="/events/admin-verify"
                    className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
                  >
                    Verify Admin Status
                  </Link>
                                     <Link 
                     href="/events/admin-dashboard"
                     className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors w-full"
                   >
                     Admin Dashboard
                   </Link>


                </div>
              </div>
            </div>

            {/* View Events Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <FaCalendarCheck className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">View All Events</h2>
                <p className="text-gray-600 mb-6">
                  Browse and discover all upcoming events at BRAC University.
                </p>
                <Link 
                  href="/events/view"
                  className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors w-full"
                >
                  Browse Events
                </Link>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-blue-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">How it works</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-800">
              <div>
                <h4 className="font-semibold mb-2">1. Admin Verification</h4>
                <p>Club admins need to verify their identity using a secret key provided by the university.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Create Events</h4>
                <p>Once verified, admins can create and manage events for their clubs.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Public Access</h4>
                <p>All students can view and discover events happening on campus.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
