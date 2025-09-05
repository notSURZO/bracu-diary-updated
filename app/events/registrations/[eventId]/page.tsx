'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaArrowLeft, FaUsers, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser, FaEnvelope, FaIdCard } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Image from 'next/image';

interface Registration {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    student_ID: string;
    picture_url: string;
  };
  registeredAt: string;
  status: string;
}

interface Event {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

export default function EventRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { isSignedIn, user } = useUser();
  const eventId = params.eventId as string;

  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!isSignedIn || !user || !eventId) return;

      try {
        // Check admin status first
        const adminResponse = await fetch('/api/admin/check-status');
        if (!adminResponse.ok) {
          toast.error('Access denied. Admin privileges required.');
          router.push('/events');
          return;
        }

        const adminData = await adminResponse.json();
        if (!adminData.isAdmin) {
          toast.error('Access denied. Admin privileges required.');
          router.push('/events');
          return;
        }

        // Fetch registrations
        const registrationsResponse = await fetch(`/api/events/${eventId}/registrations`);
        if (registrationsResponse.ok) {
          const registrationsData = await registrationsResponse.json();
          if (registrationsData.success) {
            setRegistrations(registrationsData.registrations);
            setEvent(registrationsData.event);
            setIsOwner(true);
          } else {
            toast.error(registrationsData.message || 'Failed to fetch registrations');
            router.push('/events/admin-dashboard');
          }
        } else {
          const errorData = await registrationsResponse.json();
          toast.error(errorData.message || 'Failed to fetch registrations');
          router.push('/events/admin-dashboard');
        }
      } catch (error) {
        console.error('Error fetching registrations:', error);
        toast.error('Failed to load registrations');
        router.push('/events/admin-dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistrations();
  }, [isSignedIn, user, eventId, router]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const formatRegistrationDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy \'at\' h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view registrations</h1>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registrations...</p>
        </div>
      </div>
    );
  }

  if (!isOwner || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to view registrations for this event.</p>
          <Link 
            href="/events/admin-dashboard" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/events/admin-dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Dashboard
            </Link>
          </div>

          {/* Event Info Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <FaUsers className="w-4 h-4 mr-2" />
                  <span className="font-medium">{registrations.length} Registered Users</span>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center text-gray-700">
                <FaCalendarAlt className="w-5 h-5 mr-3 text-blue-600" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-gray-600">{formatDate(event.date)}</p>
                </div>
              </div>
              
              <div className="flex items-center text-gray-700">
                <FaClock className="w-5 h-5 mr-3 text-green-600" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-gray-600">{formatTime(event.time)}</p>
                </div>
              </div>

              <div className="flex items-center text-gray-700">
                <FaMapMarkerAlt className="w-5 h-5 mr-3 text-red-600" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Registrations List */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Registered Users</h2>
            </div>
            
            {registrations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FaUsers className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations yet</h3>
                <p className="text-gray-600">Users haven't registered for this event yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {registrations.map((registration) => (
                  <div key={registration._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* User Avatar */}
                        <div className="relative">
                          {registration.user.picture_url ? (
                            <Image
                              src={registration.user.picture_url}
                              alt={registration.user.name}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <FaUser className="w-6 h-6 text-blue-600" />
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{registration.user.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <FaEnvelope className="w-3 h-3 mr-1" />
                              {registration.user.email}
                            </span>
                            <span className="flex items-center">
                              <FaIdCard className="w-3 h-3 mr-1" />
                              {registration.user.student_ID}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Registration Date */}
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Registered</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatRegistrationDate(registration.registeredAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
