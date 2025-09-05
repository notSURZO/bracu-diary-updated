'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaArrowLeft, FaSave, FaUpload, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

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

export default function EditEventPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const { isSignedIn, user } = useUser();
  const eventId = params.eventId as string;

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const fetchEventAndCheckOwnership = async () => {
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

        // Fetch event details
        const eventResponse = await fetch(`/api/events/${eventId}`);
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          if (eventData.success && eventData.event) {
            const eventDetails = eventData.event;
            setEvent(eventDetails);
            
            // Populate form with existing data
            setFormData({
              title: eventDetails.title || '',
              description: eventDetails.description || '',
              date: eventDetails.date ? format(new Date(eventDetails.date), 'yyyy-MM-dd') : '',
              time: eventDetails.time || '',
              location: eventDetails.location || '',
              tags: eventDetails.tags ? eventDetails.tags.join(', ') : '',
              imageUrl: eventDetails.imageUrl || '',
              imagePath: eventDetails.imagePath || '',
              imageBucket: eventDetails.imageBucket || ''
            });
            
            setIsOwner(true); // If we can fetch the event, we own it
          } else {
            toast.error('Event not found or access denied');
            router.push('/events/admin-dashboard');
            return;
          }
        } else {
          const errorData = await eventResponse.json();
          toast.error(errorData.message || 'Event not found or access denied');
          router.push('/events/admin-dashboard');
          return;
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
        router.push('/events/admin-dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventAndCheckOwnership();
  }, [isSignedIn, user, eventId, router]);

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
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '', imagePath: '', imageBucket: '' }));
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim() || !formData.date || !formData.time || !formData.location.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if image is still uploading
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
    const eventDate = new Date(formData.date);
    const now = new Date();
    if (eventDate < now) {
      toast.error('Event date cannot be in the past');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          date: formData.date,
          time: formData.time,
          location: formData.location.trim(),
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          imageUrl: formData.imageUrl,
          imagePath: formData.imagePath,
          imageBucket: formData.imageBucket
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Event updated successfully!');
        router.push(`/events/view/${eventId}`);
      } else {
        toast.error(data.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Event update error:', error);
      toast.error('An error occurred while updating the event');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to edit events</h1>
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

  if (!isOwner || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to edit this event.</p>
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              href={`/events/view/${eventId}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Link>
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Event</h1>
              <p className="text-gray-600">Update your event details below</p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter event title"
                  required
                />
              </div>

              {/* Event Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                  placeholder="Describe your event in detail"
                  required
                />
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Event Time *
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter event location"
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter tags separated by commas (e.g., workshop, technology, networking)"
                />
                <p className="text-sm text-gray-500 mt-1">Separate multiple tags with commas</p>
              </div>

              {/* Event Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white"
                  disabled={isSaving || imageUploading}
                />
                <p className="text-xs text-gray-500 mt-1">We store this image in Supabase Storage.</p>
                
                {/* Image Preview */}
                {(imagePreview || formData.imageUrl) && (
                  <div className="mt-3 rounded-lg overflow-hidden border w-full max-w-md">
                    <div className="relative">
                      <img
                        src={imagePreview || formData.imageUrl}
                        alt="Event preview"
                        className="w-full h-48 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={isSaving || imageUploading}
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Upload Status */}
                {imageUploading && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-blue-700 text-sm">Uploading image...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <Link
                  href={`/events/view/${eventId}`}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSaving || imageUploading}
                  className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSaving || imageUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {imageUploading ? 'Uploading...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
