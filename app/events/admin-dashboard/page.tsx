'use client';

import { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaCalendarPlus, FaArrowLeft, FaEye, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isSignedIn, user } = useUser();

  // Check admin status and fetch events on component mount
  useEffect(() => {
    const checkAdminStatusAndFetchEvents = async () => {
      if (!isSignedIn || !user) return;

      try {
        // Check admin status
        const userResponse = await fetch('/api/admin/check-status');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setIsAdmin(userData.isAdmin || false);
          
          if (userData.isAdmin) {
            // Fetch events for this admin
            const eventsResponse = await fetch('/api/events/my-events');
            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              if (eventsData.success) {
                setEvents(eventsData.events || []);
              } else {
                console.error('Failed to fetch events:', eventsData.message);
                toast.error(eventsData.message || 'Failed to fetch events');
              }
            } else {
              const errorData = await eventsResponse.json();
              console.error('Failed to fetch events:', errorData.message);
              toast.error(errorData.message || 'Failed to fetch events');
            }
          }
        } else {
          const errorData = await userResponse.json();
          console.error('Failed to check admin status:', errorData.message);
          toast.error(errorData.message || 'Failed to check admin status');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('An error occurred while loading the dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatusAndFetchEvents();
  }, [isSignedIn, user]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to access admin dashboard</h1>
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
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You need to be verified as a club admin to access this dashboard.
            </p>
            <Link 
              href="/events/admin-verify"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Verify Admin Status
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  // Combine event date and time into a single Date for accurate comparison
  const eventDateTime = (dateString: string, timeString: string) => {
    const d = new Date(dateString);
    // Expecting HH:mm from form; default to 00:00 if missing
    const [hStr = '0', mStr = '0'] = (timeString || '00:00').split(':');
    const h = Number(hStr) || 0;
    const m = Number(mStr) || 0;
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Event deleted successfully');
        // Refresh the events list
        const eventsResponse = await fetch('/api/events/my-events');
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData.events || []);
        }
      } else {
        toast.error(data.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link 
                href="/events"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
              >
                <FaArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your club's events</p>
            </div>
            <Link 
              href="/events/create"
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaCalendarPlus className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaEye className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {events.filter(event => eventDateTime(event.date, event.time) >= new Date()).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <FaEdit className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Past Events</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {events.filter(event => eventDateTime(event.date, event.time) < new Date()).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Your Events</h2>
            </div>
            
            {events.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FaCalendarPlus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                <p className="text-gray-600 mb-6">Create your first event to get started</p>
                <Link 
                  href="/events/create"
                  className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {events.map((event) => {
                  const isUpcoming = eventDateTime(event.date, event.time) >= new Date();
                  return (
                    <div key={event._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isUpcoming 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {isUpcoming ? 'Upcoming' : 'Past'}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <span className="flex items-center">
                              <FaCalendarPlus className="w-4 h-4 mr-1" />
                              {formatDate(event.date)} at {formatTime(event.time)}
                            </span>
                            <span>📍 {event.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            href={`/events/view/${event._id}`}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Event Details"
                          >
                            <FaEye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/events/edit/${event._id}`}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Edit Event"
                          >
                            <FaEdit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDeleteEvent(event._id, event.title)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Event"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
