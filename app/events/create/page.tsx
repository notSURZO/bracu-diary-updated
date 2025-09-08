'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaCalendarPlus, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';
import { useMemo } from 'react';

interface FormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  tags?: string; // comma-separated in UI
  imageUrl?: string;
  imagePath?: string;
  imageBucket?: string;
}

export default function CreateEventPage() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    tags: '',
    imageUrl: '',
    imagePath: '',
    imageBucket: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [recentlyVerifiedClubId, setRecentlyVerifiedClubId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Debounced success toaster to avoid duplicate toasts
  const toastSuccess = useMemo(
    () => debounce((msg: string) => toast.success(msg), 300, { leading: true, trailing: false }),
    []
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, user } = useUser();

  // Check admin status on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Check if user just verified as admin via URL parameter
        const adminParam = searchParams.get('admin');
        const clubIdParam = searchParams.get('clubId');
        const clubNameParam = searchParams.get('clubName');
        
        console.log('URL Parameters:', { adminParam, clubIdParam, clubNameParam });
        
        if (adminParam === 'true' && clubIdParam && clubNameParam) {
          // User just verified - grant immediate access
          console.log('Setting admin status to true via URL parameters');
          setIsAdmin(true);
          setIsCheckingAdmin(false);
          // Store the club ID for form submission
          setRecentlyVerifiedClubId(clubIdParam);
          // Only show one success message, not multiple
          toast.success(`Welcome! You are now verified as admin for ${decodeURIComponent(clubNameParam)}`);
          return;
        }

        // Otherwise, check admin status from database
        console.log('Checking admin status from database...');
        const response = await fetch('/api/admin/check-status?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          console.log('Database admin check result:', data);
          setIsAdmin(data.isAdmin || false);
          setIsCheckingAdmin(false);
        } else {
          console.error('Admin status check failed:', response.status);
          setIsCheckingAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsCheckingAdmin(false);
      }
    };

    if (isSignedIn && user) {
      checkAdminStatus();
    }
  }, [isSignedIn, user, searchParams]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to create events</h1>
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

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Checking Admin Status</h1>
          <p className="text-gray-600">Please wait while we verify your admin privileges...</p>
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
              You need to be verified as a club admin to create events.
            </p>
            <div className="space-y-3">
              <Link 
                href="/events/admin-verify"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Verify Admin Status
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    try {
      setImageUploading(true);
      setImagePreview(URL.createObjectURL(file));
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload/event-image', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Upload failed');
      }
      setFormData(prev => ({ ...prev, imageUrl: data.url, imagePath: data.path, imageBucket: data.bucket }));
      toastSuccess('Image uploaded');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim() || !formData.date || !formData.time || !formData.location.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (imageUploading) {
      toast.warn('Please wait until the image finishes uploading');
      return;
    }

    // If a file was selected (preview exists) but no uploaded URL yet
    if (imagePreview && !formData.imageUrl) {
      toast.error('Image not uploaded yet. Please re-select or try again.');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Event date cannot be in the past');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare headers for recently verified admins
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // If user was recently verified, add special headers
      if (recentlyVerifiedClubId) {
        headers['x-recently-verified-admin'] = 'true';
        headers['x-admin-club-id'] = recentlyVerifiedClubId;
      }

      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          imageUrl: formData.imageUrl,
          imagePath: formData.imagePath,
          imageBucket: formData.imageBucket,
          tags: (formData.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toastSuccess('Event created successfully!');
        
        // Redirect to events page after 2 seconds
        setTimeout(() => {
          router.push('/events');
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Event creation error:', error);
      toast.error('An error occurred while creating the event');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <FaCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Created!</h1>
            <p className="text-gray-600 mb-6">
              Your event has been successfully created and is now live.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to events page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
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
                <FaCalendarPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Create New Event</h1>
              <p className="text-gray-600">
                Fill in the details below to create a new event for your club
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter event title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
              </div>

              {/* Event Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your event..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  disabled={isLoading}
                />
              </div>

              {/* Date and Time Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Event Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isLoading}
                  />
                </div>

                {/* Event Time */}
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Event Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter event location (e.g., Room 301, Auditorium)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
              </div>

              {/* Event Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g., AI, Debate, Hackathon"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
              </div>

              {/* Event Image Upload (Supabase) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white"
                  disabled={isLoading || imageUploading}
                />
                <p className="text-xs text-gray-500 mt-1">We store this image in Supabase Storage.</p>
                {(imagePreview || formData.imageUrl) && (
                  <div className="mt-3 rounded-lg overflow-hidden border w-full max-w-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview || formData.imageUrl!} alt="Event preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || imageUploading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading || imageUploading ? 'Processing...' : 'Create Event'}
              </button>
            </form>

            {/* Info Section */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Event Guidelines</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Events must be scheduled for future dates</li>
                <li>• Provide clear and accurate event information</li>
                <li>• Include specific location details</li>
                <li>• Events will be visible to all students once created</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
