'use client';

import { useState, useEffect, useCallback, memo } from 'react';
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
  isConnected?: boolean;
  hasSentRequest?: boolean;
}

// BRAC University color themes
const themes: { [key: string]: string } = {
  'brac-blue': 'from-brac-blue to-brac-blue-dark',
  'brac-gold': 'from-brac-gold to-brac-gold-dark',
  'brac-green': 'from-green-600 to-green-800',
  'brac-purple': 'from-purple-600 to-purple-800',
  'brac-red': 'from-red-600 to-red-800',
  'brac-teal': 'from-teal-600 to-teal-800',
};

const themeBgs: { [key: string]: string } = {
  'brac-blue': 'bg-brac-blue-light text-brac-navy',
  'brac-gold': 'bg-brac-gold-light text-brac-navy',
  'brac-green': 'bg-green-100 text-green-800',
  'brac-purple': 'bg-purple-100 text-purple-800',
  'brac-red': 'bg-red-100 text-red-800',
  'brac-teal': 'bg-teal-100 text-teal-800',
};

const UserProfilePage = memo(function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [hasSentRequest, setHasSentRequest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
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

        // Set connection status from profile data
        if (userId) {
          setIsConnected(profileData.isConnected || false);
          setHasSentRequest(profileData.hasSentRequest || false);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfileData();
  }, [params, userId]);

  const handleConnect = useCallback(async () => {
    if (!profile || !userId) return;

    // Optimistic update
    setHasSentRequest(true);
    setIsActionLoading(true);

    try {
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
        toast.success('Connection request sent successfully!');
      } else {
        // Revert on failure
        setHasSentRequest(false);
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to send connection request');
      }
    } catch (error) {
      // Revert on failure
      setHasSentRequest(false);
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    } finally {
      setIsActionLoading(false);
    }
  }, [profile, userId]);

  const handleCancelRequest = useCallback(async () => {
    if (!profile || !userId) return;

    // Optimistic update
    setHasSentRequest(false);
    setIsActionLoading(true);

    try {
      const response = await fetch('/api/cancel-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: profile._id,
        }),
      });

      if (response.ok) {
        toast.success('Connection request canceled!');
      } else {
        // Revert on failure
        setHasSentRequest(true);
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to cancel connection request');
      }
    } catch (error) {
      // Revert on failure
      setHasSentRequest(true);
      console.error('Error canceling connection request:', error);
      toast.error('Failed to cancel connection request');
    } finally {
      setIsActionLoading(false);
    }
  }, [profile, userId]);

  const handleDisconnect = useCallback(async () => {
    if (!profile || !userId) return;

    // Optimistic update
    setIsConnected(false);
    setHasSentRequest(false);
    setShowDisconnectDialog(false);
    setIsLoading(true);

    try {
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
        toast.success('Disconnected successfully!');
      } else {
        // Revert on failure
        setIsConnected(true);
        setHasSentRequest(false);
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to disconnect');
      }
    } catch (error) {
      // Revert on failure
      setIsConnected(true);
      setHasSentRequest(false);
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  }, [profile, userId]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brac-blue"></div>
          <p className="mt-4 text-brac-navy">Loading profile...</p>
        </div>
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
      <a href={finalHref} target="_blank" rel="noopener noreferrer" aria-label={label} className="opacity-80 hover:opacity-100 transition-opacity text-brac-navy hover:text-brac-blue">
        <Icon size={20} />
      </a>
    );
  };

  const currentThemeClass = themes[profile.theme_color || 'brac-blue'];
  const currentThemeBgClass = themeBgs[profile.theme_color || 'brac-blue'];

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8 relative">
          <div className={`h-40 bg-gradient-to-r ${currentThemeClass} relative`}>
            <div className="absolute top-6 right-6 flex gap-2 z-20">
              {userId && (
                <div className="ml-4">
                  {isConnected ? (
                    <button
                      onClick={() => setShowDisconnectDialog(true)}
                      disabled={isLoading}
                      className="bg-brac-gold hover:bg-brac-gold-dark text-brac-navy px-4 py-2 rounded-md font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Connected'}
                    </button>
                  ) : hasSentRequest ? (
                    <button
                      onClick={handleCancelRequest}
                      disabled={isLoading}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Request sent'}
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      disabled={isLoading}
                      className="bg-brac-blue hover:bg-brac-blue-dark text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Connect'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Profile Picture Container - Fixed Alignment */}
          <div className="flex justify-center -mt-20 relative z-10">
            <div className="relative h-32 w-32 rounded-full border-4 border-white shadow-md bg-white">
              <Image
                src={profile.picture_url}
                alt="Profile Picture"
                fill
                className="object-cover rounded-full"
                priority
              />
            </div>
          </div>
          
          <div className="pt-20 pb-8 px-6 sm:px-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-brac-navy">{profile.name}</h1>
            <p className="font-medium text-brac-blue mt-1">@{profile.username}</p>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-brac-navy">
              <div className="flex items-center bg-brac-blue-light px-3 py-1 rounded-full">
                <UserSquare size={14} className="mr-1" />
                <span>{profile.student_ID}</span>
              </div>
              <div className="flex items-center bg-brac-blue-light px-3 py-1 rounded-full">
                <Building size={14} className="mr-1" />
                <span>{profile.department || 'N/A'}</span>
              </div>
              <div className="flex items-center bg-brac-blue-light px-3 py-1 rounded-full">
                <Users size={14} className="mr-1" />
                <span>{profile.connections?.length || 0} Connections</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-brac-navy mb-4 flex items-center">
                <UserSquare size={20} className="mr-2" />
                About
              </h3>
              <p className="text-brac-navy/80">{profile.bio || "No bio information provided."}</p>
            </div>

            {/* Details Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-brac-navy mb-4 flex items-center">
                <UserSquare size={20} className="mr-2" />
                Personal Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Date of Birth</p>
                    <p className="text-brac-navy">{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Droplet size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Blood Group</p>
                    <p className="text-brac-navy">{profile.bloodGroup || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Phone</p>
                    <p className="text-brac-navy">{profile.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Home size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Address</p>
                    <p className="text-brac-navy">{profile.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Education Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-brac-navy mb-4 flex items-center">
                <GraduationCap size={20} className="mr-2" />
                Education
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <School size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">School</p>
                    <p className="text-brac-navy">{profile.education?.school || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <GraduationCap size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">College/University</p>
                    <p className="text-brac-navy">{profile.education?.college || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* University Details Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-brac-navy mb-4 flex items-center">
                <Building size={20} className="mr-2" />
                University Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Email</p>
                    <p className="text-brac-navy">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <UserSquare size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Student ID</p>
                    <p className="text-brac-navy">{profile.student_ID}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Building size={18} className="text-brac-blue mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brac-navy/70">Department</p>
                    <p className="text-brac-navy">{profile.department || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-brac-navy mb-4 flex items-center">
                <FaGlobe size={18} className="mr-2" />
                Social Links
              </h3>
              <div className="grid grid-cols-4 gap-4">
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
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      {showDisconnectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-brac-navy mb-4">Confirm Disconnect</h3>
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
});

export default UserProfilePage;