'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaArrowLeft, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaUsers, FaTag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Image from 'next/image';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  clubName: string;
  tags: string[];
  imageUrl: string;
  imagePath: string;
  imageBucket: string;
  createdAt: string;
  updatedAt: string;
}

export default function ViewEventPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { isSignedIn, user } = useUser();
  const eventId = params.eventId as string;

  useEffect(() => {
    const fetchEventAndCheckOwnership = async () => {
      if (!isSignedIn || !user || !eventId) return;

      try {
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${eventId}`);
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          if (eventData.success && eventData.event) {
            setEvent(eventData.event);
          } else {
            toast.error('Event not found');
            router.push('/events');
            return;
          }
        } else {
          const errorData = await eventResponse.json();
          toast.error(errorData.message || 'Event not found');
          router.push('/events');
          return;
        }

        // Check if user is admin and owns this event
        const adminResponse = await fetch('/api/admin/check-status');
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          if (adminData.isAdmin) {
            // We need to check if the event belongs to the user's club
            // This will be handled by the API when we try to edit/delete
            setIsOwner(adminData.isAdmin);
          }
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventAndCheckOwnership();
  }, [isSignedIn, user, eventId, router]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM dd, yyyy');
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

  const handleDelete = async () => {
    if (!event || !isOwner) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Event deleted successfully');
        router.push('/events/admin-dashboard');
      } else {
        toast.error(data.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view events</h1>
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
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
          <Link 
            href="/events" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(event.date) >= new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              href={isOwner ? "/events/admin-dashboard" : "/events"}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to {isOwner ? 'Admin Dashboard' : 'Events'}
            </Link>
            
            {isOwner && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/events/edit/${eventId}`}
                  className="inline-flex items-center bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  <FaEdit className="w-4 h-4 mr-2" />
                  Edit Event
                </Link>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  <FaTrash className="w-4 h-4 mr-2" />
                  Delete Event
                </button>
              </div>
            )}
          </div>

          {/* Event Details Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Event Image */}
            {event.imageUrl && (
              <div className="relative h-64 w-full">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // Hide the image if it fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="p-8">
              {/* Event Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      isUpcoming 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isUpcoming ? 'Upcoming' : 'Past Event'}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 mb-4">
                    <FaUsers className="w-4 h-4 mr-2" />
                    <span className="font-medium">Organized by {event.clubName}</span>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About this Event</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>

              {/* Event Details Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
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
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-gray-700">
                    <FaMapMarkerAlt className="w-5 h-5 mr-3 text-red-600" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <FaTag className="w-4 h-4 mr-2" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Actions */}
              {isUpcoming && !isOwner && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">Interested in this event?</p>
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                      Register for Event
                    </button>
                  </div>
                </div>
              )}

              {/* Event Metadata */}
              <div className="border-t border-gray-200 pt-6 mt-8">
                <div className="text-sm text-gray-500">
                  <p>Created: {format(new Date(event.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}</p>
                  {event.updatedAt !== event.createdAt && (
                    <p>Last updated: {format(new Date(event.updatedAt), 'MMM dd, yyyy \'at\' h:mm a')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
