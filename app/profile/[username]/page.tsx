'use client';

import { useState, useEffect } from 'react';
import { notFound } from "next/navigation";
import Image from 'next/image';
import { FaLinkedin, FaTwitter, FaGithub, FaGlobe, FaFacebook, FaInstagram, FaSnapchat, FaYoutube } from 'react-icons/fa';
import { Mail, UserSquare, Building, Calendar, Droplet, Phone, Home, School, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'react-toastify';

interface ISocialMedia {
  linkedin?: string; github?: string; facebook?: string; instagram?: string;
  snapchat?: string; twitter?: string; website?: string; youtube?: string;
}
interface IEducation { school?: string; college?: string; }
interface IProfile {
  _id: string;
  name: string; username: string; email: string; student_ID: string;
  bio: string; address: string; department: string; phone: string;
  picture_url: string; dateOfBirth?: string;
  bloodGroup?: string; socialMedia?: ISocialMedia; education?: IEducation;
  connections?: string[];
  theme_color?: string;
}

const themes: { [key: string]: string } = {
  blue: 'from-blue-500 to-indigo-600',
  purple: 'from-purple-500 to-violet-600',
  green: 'from-green-500 to-emerald-600',
  pink: 'from-pink-500 to-rose-600',
  orange: 'from-orange-500 to-amber-600',
};

const themeBgs: { [key: string]: string } = {
  blue: 'bg-blue-50 text-blue-800',
  purple: 'bg-purple-50 text-purple-800',
  green: 'bg-green-50 text-green-800',
  pink: 'bg-pink-50 text-pink-800',
  orange: 'bg-orange-50 text-orange-800',
};

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState<boolean>(false);
  const { userId } = useAuth();

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const { username } = await params;
        
        // Fetch profile data from API
        const profileResponse = await fetch(`/api/profile/${username}`);
        if (!profileResponse.ok) {
          if (profileResponse.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch profile data');
        }
        
        const profileData: IProfile = await profileResponse.json();
        setProfile(profileData);

        // Check if current user is connected to this profile
        if (userId) {
          const connectionsResponse = await fetch('/api/my-connections');
          if (connectionsResponse.ok) {
            const connections = await connectionsResponse.json();
            const isConnected = connections.some((conn: any) => conn.email === profileData.email);
            setIsConnected(isConnected);
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileData();
  }, [params, userId]);

  const handleConnect = async () => {
    if (!profile || !userId) return;

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: profile._id,
        }),
      });

      if (response.ok) {
        setIsConnected(true);
        alert('Connection request sent successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Failed to send connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!profile || !userId) return;

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friendEmail: profile.email
        }),
      });

      if (response.ok) {
        setIsConnected(false);
        setShowDisconnectDialog(false);
        toast.success('Disconnected successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!profile) {
    return notFound();
  }

  const SocialLink = ({ href, icon: Icon, label }: { href?: string; icon: React.ElementType; label: string }) => {
    if (!href) return null;
    let finalHref = href;
    if (label.toLowerCase() === 'instagram') finalHref = `https://instagram.com/${href}`;
    if (label.toLowerCase() === 'snapchat') finalHref = `https://snapchat.com/add/${href}`;

    return (
      <a href={finalHref} target="_blank" rel="noopener noreferrer" aria-label={label} className="opacity-70 hover:opacity-100 transition-opacity">
        <Icon size={24} />
      </a>
    );
  };

  const currentThemeClass = themes[profile.theme_color || 'blue'];
  const currentThemeBgClass = themeBgs[profile.theme_color || 'blue'];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="relative bg-white rounded-2xl shadow-lg">
        <div className={`h-40 bg-gradient-to-r ${currentThemeClass} rounded-t-2xl`}></div>

        <div className="absolute top-40 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative h-40 w-40 sm:h-48 sm:w-48 rounded-full border-4 border-white shadow-md">
            <Image
              src={profile.picture_url}
              alt="Avatar"
              fill
              className="object-cover rounded-full"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-28 pb-8 px-6 sm:px-8">
          <div className="w-full md:w-1/3 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{profile.name}</h1>
            <p className="font-semibold text-gray-600 mt-1">@{profile.username}</p>
            <div className="text-base font-semibold text-gray-600 mt-3 space-x-3">
              <span>{profile.student_ID}</span>
              <span className="font-light text-gray-400">•</span>
              <span>{profile.department || 'N/A'}</span>
            </div>
          </div>

          <div className="w-full md:w-1/3 text-center md:text-right mt-4 md:mt-0">
            <div className="flex items-center justify-center md:justify-end gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={16} />
                <span>{profile.connections?.length || 0} Connections</span>
              </div>
              {userId && (
                <div className="ml-4">
                  {isConnected ? (
                    <button
                      onClick={() => setShowDisconnectDialog(true)}
                      disabled={isLoading}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Connected'}
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={isLoading}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Send Request'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className={`p-6 rounded-2xl shadow-lg ${currentThemeBgClass}`}>
              <h3 className="font-bold text-lg mb-3">About</h3>
              <p className="text-sm opacity-80">{profile.bio || "No bio information provided."}</p>
            </div>
            <div className={`p-6 rounded-2xl shadow-lg ${currentThemeBgClass}`}>
              <h3 className="font-bold text-lg mb-4">On The Web</h3>
              <div className="flex flex-wrap gap-5">
                <SocialLink href={profile.socialMedia?.website} icon={FaGlobe} label="Website" />
                <SocialLink href={profile.socialMedia?.linkedin} icon={FaLinkedin} label="LinkedIn" />
                <SocialLink href={profile.socialMedia?.github} icon={FaGithub} label="GitHub" />
                <SocialLink href={profile.socialMedia?.youtube} icon={FaYoutube} label="YouTube" />
                <SocialLink href={profile.socialMedia?.twitter} icon={FaTwitter} label="Twitter" />
                <SocialLink href={profile.socialMedia?.facebook} icon={FaFacebook} label="Facebook" />
                <SocialLink href={profile.socialMedia?.instagram} icon={FaInstagram} label="Instagram" />
                <SocialLink href={profile.socialMedia?.snapchat} icon={FaSnapchat} label="Snapchat" />
              </div>
            </div>
            <div className={`p-6 rounded-2xl shadow-lg ${currentThemeBgClass}`}>
              <h3 className="font-bold text-lg mb-4">University Details</h3>
              <div className="space-y-4 text-sm sm:text-base">
                <div className="flex items-center gap-4"><Mail className="flex-shrink-0"/><span className="font-semibold w-24">Email:</span> <span className="opacity-80">{profile.email}</span></div>
                <div className="flex items-center gap-4"><UserSquare className="flex-shrink-0"/><span className="font-semibold w-24">Student ID:</span> <span className="opacity-80">{profile.student_ID}</span></div>
                <div className="flex items-center gap-4"><Building className="flex-shrink-0"/><span className="font-semibold w-24">Department:</span> <span className="opacity-80">{profile.department || 'N/A'}</span></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className={`p-6 rounded-2xl shadow-lg flex-1 ${currentThemeBgClass}`}>
              <h3 className="font-bold text-lg mb-4">Details</h3>
              <div className="space-y-4 text-sm sm:text-base">
                <div className="flex items-center gap-4"><Calendar className="flex-shrink-0"/><span className="font-semibold w-24">Born:</span> <span className="opacity-80">{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
                <div className="flex items-center gap-4"><Droplet className="flex-shrink-0"/><span className="font-semibold w-24">Blood Group:</span> <span className="opacity-80">{profile.bloodGroup || 'N/A'}</span></div>
                <div className="flex items-center gap-4"><Phone className="flex-shrink-0"/><span className="font-semibold w-24">Phone:</span> <span className="opacity-80">{profile.phone || 'N/A'}</span></div>
                <div className="flex items-center gap-4"><Home className="flex-shrink-0"/><span className="font-semibold w-24">Address:</span> <span className="opacity-80">{profile.address || 'N/A'}</span></div>
              </div>
            </div>
            <div className={`p-6 rounded-2xl shadow-lg flex-1 ${currentThemeBgClass}`}>
              <h3 className="font-bold text-lg mb-4">Education</h3>
              <div className="space-y-4 text-sm sm:text-base">
                <div className="flex items-center gap-4"><School className="flex-shrink-0"/><span className="font-semibold w-24">School:</span> <span className="opacity-80">{profile.education?.school || 'N/A'}</span></div>
                <div className="flex items-center gap-4"><GraduationCap className="flex-shrink-0"/><span className="font-semibold w-24">College:</span> <span className="opacity-80">{profile.education?.college || 'N/A'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      {showDisconnectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Disconnect</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to disconnect from {profile.name}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDisconnectDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}