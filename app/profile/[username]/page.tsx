import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { notFound } from "next/navigation";
import Image from 'next/image';
import { FaLinkedin, FaTwitter, FaGithub, FaGlobe, FaFacebook, FaInstagram, FaSnapchat, FaYoutube } from 'react-icons/fa';
import { Mail, UserSquare, Building, Calendar, Droplet, Phone, Home, School, GraduationCap, Users } from 'lucide-react';

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

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  await connectToDatabase();

  // Find user by username
  const userDoc = await User.findOne({ username });

  // If user not found, return 404
  if (!userDoc) {
    notFound();
  }

  const profile: IProfile = {
    name: userDoc.name || "Unknown",
    username: userDoc.username || "Not set",
    email: userDoc.email || "Not set",
    student_ID: userDoc.student_ID || "",
    bio: userDoc.bio || "",
    address: userDoc.address || "",
    department: userDoc.department || "",
    phone: userDoc.phone || "",
    picture_url: userDoc.picture_url || "/logo.svg",
    dateOfBirth: userDoc.dateOfBirth ? new Date(userDoc.dateOfBirth).toISOString().split('T')[0] : '',
    bloodGroup: userDoc.bloodGroup || "",
    socialMedia: userDoc.socialMedia || {},
    education: userDoc.education || {},
    connections: userDoc.connections || [],
    theme_color: userDoc.theme_color || "blue",
  };

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
    <div className="w-full min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
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
            <div className="flex items-center justify-center md:justify-end gap-2 text-gray-600">
              <Users size={16} />
              <span>{profile.connections?.length || 0} Connections</span>
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
    </div>
  );
}