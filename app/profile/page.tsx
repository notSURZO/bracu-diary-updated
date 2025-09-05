"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, Edit, Phone, Home, GraduationCap, Users, Calendar, Droplet, School, Save, X, Mail, Building, UserSquare, Palette } from 'lucide-react';
import { FaLinkedin, FaTwitter, FaGithub, FaGlobe, FaFacebook, FaInstagram, FaSnapchat, FaYoutube } from 'react-icons/fa';
import _ from 'lodash';
import Image from 'next/image';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ISocialMedia {
  linkedin?: string; github?: string; facebook?: string; instagram?: string;
  snapchat?: string; twitter?: string; website?: string; youtube?: string;
}
interface IEducation { school?: string; college?: string; }
interface IProfile {
  name: string; username: string; email: string; student_ID: string;
  bio: string; address: string; department: string; phone: string;
  picture_url: string; dateOfBirth?: string;
  bloodGroup?: string; socialMedia?: ISocialMedia; education?: IEducation;
  connections?: string[];
  theme_color?: string;
}

// BRAC University color themes
const themes: { [key: string]: string } = {
  'brac-blue': 'from-brac-blue to-brac-blue-dark',
  'brac-gold': 'from-brac-gold to-brac-gold-dark',
};

const themeBgs: { [key: string]: string } = {
  'brac-blue': 'bg-brac-blue-light text-brac-navy',
  'brac-gold': 'bg-brac-gold-light text-brac-navy',
};

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<IProfile>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchProfile = async () => {
    setInitialLoading(true);
    try {
      const email = clerkUser?.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error("User email not found.");
      
      const res = await fetch(`/api/profile/user?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch profile");
      }
      
      const data = await res.json();
      if (data.user) {
        const userProfile = {
          ...data.user,
          dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '',
        };
        setProfile(userProfile);
        setForm(userProfile);
      }
    } catch (e: any) {
      toast.error(e.message);
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prevForm => _.set({ ...prevForm }, name, value));
  };

  const saveTheme = async (newTheme: string) => {
    if (!clerkUser) return;
    try {
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: clerkUser.id, theme_color: newTheme }),
      });
    } catch (error) {
      toast.error("Failed to save theme choice.");
    }
  };

  const handleThemeChange = () => {
    const currentTheme = form.theme_color || 'brac-blue';
    const nextTheme = currentTheme === 'brac-blue' ? 'brac-gold' : 'brac-blue';
    
    setForm(prev => ({ ...prev, theme_color: nextTheme }));
    if (profile) {
       setProfile(prev => ({ ...prev!, theme_color: nextTheme }));
    }
    
    saveTheme(nextTheme);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clerkUser) {
      toast.error("User not authenticated");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: clerkUser.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      if (data.user) {
        toast.success("Profile updated successfully!");
        setEditMode(false);
        const userProfile = {
          ...data.user,
          dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '',
        };
        setProfile(userProfile);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (initialLoading) {
    return (
      <div className="flex w-full h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-brac-blue" />
          <p className="mt-4 text-brac-navy">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="flex w-full h-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-brac-navy p-8 rounded-lg shadow-sm bg-white border border-gray-200">
          Profile not found.
        </div>
      </div>
    );
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
  
  const activeTheme = editMode ? form.theme_color : profile.theme_color;
  const currentThemeClass = themes[activeTheme || 'brac-blue'];
  const currentThemeBgClass = themeBgs[activeTheme || 'brac-blue'];

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
      <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8 relative">
            <div className={`h-40 bg-gradient-to-r ${currentThemeClass} relative`}>
              <div className="absolute top-6 right-6 flex gap-2 z-20">
                  {editMode && (
                    <button 
                      onClick={handleThemeChange} 
                      className="flex items-center gap-2 bg-white/20 text-white p-2 rounded-md hover:bg-white/30 transition shadow-sm font-medium backdrop-blur-sm"
                    >
                        <Palette size={16} />
                        <span>Change Theme</span>
                    </button>
                  )}
                  {!editMode ? (
                  <button 
                    onClick={() => setEditMode(true)} 
                    className="flex items-center gap-2 bg-white text-brac-navy px-4 py-2 rounded-md hover:bg-gray-100 transition shadow-sm font-medium"
                  >
                      <Edit size={16} /> <span>Edit Profile</span>
                  </button>
                  ) : (
                  <div className="flex gap-2">
                      <button 
                        onClick={handleSubmit} 
                        disabled={loading} 
                        className="flex items-center gap-2 bg-brac-gold text-brac-navy px-4 py-2 rounded-md hover:bg-brac-gold-dark transition shadow-sm font-medium"
                      >
                          {loading ? <Loader2 className="animate-spin"/> : <Save size={16} />} <span>Save</span>
                      </button>
                      <button 
                        onClick={() => setEditMode(false)} 
                        className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition font-medium"
                      >
                          <X size={16} /> <span>Cancel</span>
                      </button>
                  </div>
                  )}
              </div>
            </div>
            
            {/* Profile Picture Container - Fixed Alignment */}
            <div className="flex justify-center -mt-20 relative z-10">
              <div className="relative h-40 w-40 rounded-full border-4 border-white shadow-md bg-white">
                <Image
                  src={profile.picture_url}
                  alt="Profile Picture"
                  fill
                  className="object-cover rounded-full"
                  priority
                />
              </div>
            </div>
            
            <div className="pt-6 pb-8 px-6 sm:px-8 text-center">
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
          <div className="mb-8">
            {editMode ? (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-8">
                    <div className="border-b border-gray-200 pb-6">
                      <h2 className="text-xl font-semibold text-brac-navy mb-4">Personal Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Full Name</label>
                            <input name="name" value={form.name || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Username</label>
                            <input name="username" value={form.username || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Date of Birth</label>
                            <input name="dateOfBirth" value={form.dateOfBirth || ''} onChange={handleChange} type="date" className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue text-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Blood Group</label>
                            <input name="bloodGroup" value={form.bloodGroup || ''} onChange={handleChange} placeholder="e.g., O+" className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Phone Number</label>
                            <input name="phone" value={form.phone || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Address</label>
                            <input name="address" value={form.address || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 pb-6">
                      <h2 className="text-xl font-semibold text-brac-navy mb-4">University Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Email Address</label>
                            <input name="email" value={form.email || ''} onChange={handleChange} type="email" className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Student ID</label>
                            <input name="student_ID" value={form.student_ID || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-brac-navy mb-1">Department</label>
                            <input name="department" value={form.department || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 pb-6">
                      <h2 className="text-xl font-semibold text-brac-navy mb-4">About Me</h2>
                      <div>
                        <label className="block text-sm font-medium text-brac-navy mb-1">Bio</label>
                        <textarea name="bio" value={form.bio || ''} onChange={handleChange} placeholder="Tell us about yourself..." className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" rows={4}></textarea>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 pb-6">
                      <h2 className="text-xl font-semibold text-brac-navy mb-4">Education</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">School</label>
                            <input name="education.school" value={form.education?.school || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">College/University</label>
                            <input name="education.college" value={form.education?.college || ''} onChange={handleChange} className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold text-brac-navy mb-4">Social Links</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Website</label>
                            <input name="socialMedia.website" value={form.socialMedia?.website || ''} onChange={handleChange} placeholder="https://..." className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">LinkedIn</label>
                            <input name="socialMedia.linkedin" value={form.socialMedia?.linkedin || ''} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">GitHub</label>
                            <input name="socialMedia.github" value={form.socialMedia?.github || ''} onChange={handleChange} placeholder="https://github.com/..." className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">YouTube</label>
                            <input name="socialMedia.youtube" value={form.socialMedia?.youtube || ''} onChange={handleChange} placeholder="https://youtube.com/..." className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Twitter</label>
                            <input name="socialMedia.twitter" value={form.socialMedia?.twitter || ''} onChange={handleChange} placeholder="https://twitter.com/..." className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Facebook</label>
                            <input name="socialMedia.facebook" value={form.socialMedia?.facebook || ''} onChange={handleChange} placeholder="https://facebook.com/..." className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Instagram</label>
                            <input name="socialMedia.instagram" value={form.socialMedia?.instagram || ''} onChange={handleChange} placeholder="Username" className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brac-navy mb-1">Snapchat</label>
                            <input name="socialMedia.snapchat" value={form.socialMedia?.snapchat || ''} onChange={handleChange} placeholder="Username" className="p-3 border border-gray-300 rounded-md w-full bg-gray-50 focus:ring-2 focus:ring-brac-blue focus:border-brac-blue" />
                          </div>
                      </div>
                    </div>
                </form>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}