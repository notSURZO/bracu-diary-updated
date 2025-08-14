"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Info, Phone, Home, Loader2, Edit, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Define a type for the user profile to ensure type safety
interface IProfile {
  name: string;
  username: string;
  email: string;
  student_ID: string;
  bio: string;
  address: string;
  department: string;
  phone: string;
  picture_url: string;
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<IProfile>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();

  // Function to fetch the user profile from the API
  const fetchProfile = async () => {
    setInitialLoading(true);
    setError("");
    try {
      const email = clerkUser?.primaryEmailAddress?.emailAddress;
      if (!email) {
        throw new Error("User email not found.");
      }
      
      const res = await fetch(`/api/profile/user?email=${encodeURIComponent(email)}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch profile");
      }
      
      const data = await res.json();
      
      if (data.user) {
        setProfile(data.user);
        setForm(data.user);
      }
    } catch (e: any) {
      console.error("Error fetching profile:", e);
      setError(e.message);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchProfile();
    } else if (isLoaded && !clerkUser) {
      setInitialLoading(false);
    }
  }, [isLoaded, clerkUser]);

  // Handle changes to the form inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submission for profile updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerkUser) {
      setError("User not authenticated");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          ...form,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      const data = await res.json();
      
      if (data.user) {
        setSuccess("Profile updated successfully!");
        setEditMode(false);
        setProfile(data.user);
      }
    } catch (e: any) {
      console.error("Error updating profile:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="flex items-center space-x-2 text-indigo-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <div className="text-2xl font-bold">Loading your profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="text-xl font-semibold text-red-600 bg-white p-6 rounded-lg shadow-md">
          {error || "Profile not found. Please try again."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="p-6">
        <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="relative">
            {/* Background Header */}
            <div className="h-48 md:h-64 bg-gradient-to-r from-blue-600 to-indigo-500"></div>
            {/* Avatar Section, now outside the header div to create the overlap */}
            <div className="absolute -bottom-24 md:-bottom-28 left-1/2 transform -translate-x-1/2">
              <img
                src={profile.picture_url || "https://placehold.co/224x224/e5e7eb/4b5563?text=Avatar"}
                alt="Avatar"
                className="w-48 h-48 md:w-56 md:h-56 rounded-full border-8 border-white shadow-lg object-cover"
              />
            </div>
          </div>

          <div className="mt-24 md:mt-32 p-8"> {/* Adjusted padding at the top */}
            <div className="flex justify-center md:justify-between items-start mb-6 text-center md:text-left flex-wrap">
              <div className="w-full md:w-auto">
                <h1 className="text-4xl font-extrabold text-gray-900">{profile.name || "User Name"}</h1>
                <p className="text-gray-600 mt-1 text-lg">@{profile.username || "username"}</p>
              </div>
              <div className="mt-4 md:mt-0">
                {!editMode && (
                  <button
                    className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-md flex items-center space-x-2"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit size={18} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4" role="alert">
                <p>{success}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
                <p>{error}</p>
              </div>
            )}

            {editMode ? (
              <div className="mt-8 space-y-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="name"
                      value={form.name || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="username"
                      value={form.username || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="email"
                      value={form.email || ''}
                      onChange={handleChange}
                      required
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Student ID</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="student_ID"
                      value={form.student_ID || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="bio"
                      value={form.bio || ''}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="address"
                      value={form.address || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="department"
                      value={form.department || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                    <input
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition duration-200"
                      name="phone"
                      value={form.phone || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4 mt-4">
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                      <span>{loading ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      type="button"
                      className="bg-gray-300 text-gray-700 px-8 py-3 rounded-xl hover:bg-gray-400 transition duration-300 transform hover:scale-105"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                <div className="flex items-start gap-4">
                  <Info className="text-3xl text-indigo-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">About</h2>
                    <p className="text-gray-600 mt-2">{profile.bio || "Add a bio here"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Phone className="text-3xl text-indigo-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 text-gray-600">
                      <div>
                        <p className="font-medium">Email</p>
                        <p>{profile.email || "user@example.com"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Phone</p>
                        <p>{profile.phone || "123-456-7890"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="font-medium">Address</p>
                        <p>{profile.address || "City, Country"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-gray-100 p-6 rounded-2xl shadow-inner">
                  <GraduationCap className="text-3xl text-indigo-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">University Details</h2>
                    <div className="mt-3 flex flex-col md:flex-row gap-4 text-gray-700">
                      <div>
                        <p className="font-medium">Student ID: <span className="text-lg">{profile.student_ID || "N/A"}</span></p>
                      </div>
                      <div>
                        <p className="font-medium">Department: <span className="text-lg">{profile.department || "N/A"}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
