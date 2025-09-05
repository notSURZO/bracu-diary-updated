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

const themeKeys = Object.keys(themes);

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
    const currentTheme = form.theme_color || 'blue';
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextTheme = themeKeys[nextIndex];
    
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
  
  if (initialLoading) { return (<div className="flex w-full h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>); }
  if (!profile) { return (<div className="flex w-full h-screen items-center justify-center"><div className="text-xl font-semibold text-red-600 p-8 rounded-lg shadow-lg bg-white">Profile not found.</div></div>); }
  
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
  
  const activeTheme = editMode ? form.theme_color : profile.theme_color;
  const currentThemeClass = themes[activeTheme || 'blue'];
  const currentThemeBgClass = themeBgs[activeTheme || 'blue'];

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
      <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="relative bg-white rounded-2xl shadow-lg">
            <div className={`h-40 bg-gradient-to-r ${currentThemeClass} rounded-t-2xl`}></div>
            
            <div className="absolute top-6 right-6 flex gap-2 z-20">
                {editMode && (
                  <button onClick={handleThemeChange} className="flex items-center gap-2 bg-white/20 text-white p-2 rounded-lg hover:bg-white/30 transition shadow-sm font-semibold backdrop-blur-sm">
                      <Palette size={16} />
                  </button>
                )}
                {!editMode ? (
                <button onClick={() => setEditMode(true)} className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition shadow-sm font-semibold backdrop-blur-sm">
                    <Edit size={16} /> <span>Edit Profile</span>
                </button>
                ) : (
                <div className="flex gap-2">
                    <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm">
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={16} />} <span>Save</span>
                    </button>
                    <button onClick={() => setEditMode(false)} className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                        <X size={16} /> <span>Cancel</span>
                    </button>
                </div>
                )}
            </div>

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
                    <div className="flex items-center justify-center md:justify-end gap-2 text-gray-600">
                        <Users size={16} />
                        <span>{profile.connections?.length || 0} Connections</span>
                    </div>
                </div>
            </div>
          </div>
          
          <div className="mt-6">
            {editMode ? (
                <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-8">
                    <fieldset>
                        <legend className="text-xl font-semibold mb-4 text-gray-700">Personal Information</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="name" value={form.name || ''} onChange={handleChange} placeholder="Full Name" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="username" value={form.username || ''} onChange={handleChange} placeholder="Username" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="dateOfBirth" value={form.dateOfBirth || ''} onChange={handleChange} type="date" className="p-3 border rounded-lg w-full bg-gray-50 text-gray-500" />
                            <input name="bloodGroup" value={form.bloodGroup || ''} onChange={handleChange} placeholder="Blood Group (e.g., O+)" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="phone" value={form.phone || ''} onChange={handleChange} placeholder="Phone Number" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="address" value={form.address || ''} onChange={handleChange} placeholder="Address" className="p-3 border rounded-lg w-full bg-gray-50" />
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-xl font-semibold mb-4 text-gray-700">University Information</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="email" value={form.email || ''} onChange={handleChange} placeholder="Email Address" type="email" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="student_ID" value={form.student_ID || ''} onChange={handleChange} placeholder="Student ID" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="department" value={form.department || ''} onChange={handleChange} placeholder="Department" className="p-3 border rounded-lg w-full bg-gray-50" />
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-xl font-semibold mb-4 text-gray-700">About Me</legend>
                        <textarea name="bio" value={form.bio || ''} onChange={handleChange} placeholder="Tell us about yourself..." className="w-full p-3 border rounded-lg bg-gray-50" rows={4}></textarea>
                    </fieldset>
                    <fieldset>
                        <legend className="text-xl font-semibold mb-4 text-gray-700">Education</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="education.school" value={form.education?.school || ''} onChange={handleChange} placeholder="School Name" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="education.college" value={form.education?.college || ''} onChange={handleChange} placeholder="College/University Name" className="p-3 border rounded-lg w-full bg-gray-50" />
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="text-xl font-semibold mb-4 text-gray-700">Social Links</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="socialMedia.website" value={form.socialMedia?.website || ''} onChange={handleChange} placeholder="Website URL" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.linkedin" value={form.socialMedia?.linkedin || ''} onChange={handleChange} placeholder="LinkedIn URL" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.github" value={form.socialMedia?.github || ''} onChange={handleChange} placeholder="GitHub URL" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.youtube" value={form.socialMedia?.youtube || ''} onChange={handleChange} placeholder="YouTube Channel URL" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.twitter" value={form.socialMedia?.twitter || ''} onChange={handleChange} placeholder="Twitter URL" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.facebook" value={form.socialMedia?.facebook || ''} onChange={handleChange} placeholder="Facebook URL" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.instagram" value={form.socialMedia?.instagram || ''} onChange={handleChange} placeholder="Instagram Username" className="p-3 border rounded-lg w-full bg-gray-50" />
                            <input name="socialMedia.snapchat" value={form.socialMedia?.snapchat || ''} onChange={handleChange} placeholder="Snapchat Username" className="p-3 border rounded-lg w-full bg-gray-50" />
                        </div>
                    </fieldset>
                </form>
            ) : (
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
            )}
          </div>
      </div>
    </>
  );
}