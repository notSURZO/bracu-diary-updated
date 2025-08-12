"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Sidebar from "../components/Sidebar";

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const email = clerkUser.primaryEmailAddress?.emailAddress || "";
        const res = await fetch("/api/profile/user?email=" + encodeURIComponent(email));
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data.user);
        setForm({
          name: data.user?.name || "",
          username: data.user?.username || "",
          email: data.user?.email || "",
          student_ID: data.user?.student_ID || "",
          bio: data.user?.bio || "",
          address: data.user?.address || "",
          department: data.user?.department || "",
          phone: data.user?.phone || "",
        });
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [isLoaded, clerkUser]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
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
      if (!res.ok) throw new Error("Failed to update profile");
      setSuccess("Profile updated successfully!");
      setEditMode(false);
      // Refresh profile
      const data = await res.json();
      setProfile(data.user);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (!isLoaded || loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-500">{error}</div>;
  }

  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center">Profile not found.</div>;
  }

   
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Sidebar */}
      
      <Sidebar/>
      {/* Profile Content */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gradient-to-br from-blue-300 via-purple-200 to-pink-200 p-8 flex flex-col items-center">
          <img
            src={profile.picture_url || "/logo.svg"}
            alt="Avatar"
            className="w-28 h-28 rounded-full border-4 border-white shadow-lg mb-4 bg-white object-cover"
          />
          {editMode ? (
            <form className="w-full flex flex-col gap-3" onSubmit={handleSubmit}>
              <label className="font-semibold">Name
                <input className="w-full p-2 rounded border mt-1" name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label className="font-semibold">Username
                <input className="w-full p-2 rounded border mt-1" name="username" value={form.username} onChange={handleChange} required />
              </label>
              <label className="font-semibold">Email
                <input className="w-full p-2 rounded border mt-1" name="email" value={form.email} onChange={handleChange} required type="email" />
              </label>
              <label className="font-semibold">Student ID
                <input className="w-full p-2 rounded border mt-1" name="student_ID" value={form.student_ID} onChange={handleChange} required />
              </label>
              <label className="font-semibold">Bio
                <textarea className="w-full p-2 rounded border mt-1" name="bio" value={form.bio} onChange={handleChange} />
              </label>
              <label className="font-semibold">Address
                <input className="w-full p-2 rounded border mt-1" name="address" value={form.address} onChange={handleChange} />
              </label>
              <label className="font-semibold">Department
                <input className="w-full p-2 rounded border mt-1" name="department" value={form.department} onChange={handleChange} />
              </label>
              <label className="font-semibold">Phone Number
                <input className="w-full p-2 rounded border mt-1" name="phone" value={form.phone} onChange={handleChange} />
              </label>
              <div className="flex gap-2 mt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
              {success && <div className="text-green-600 mt-2">{success}</div>}
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </form>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-blue-700 mb-1">{profile.name}</h2>
              <span className="text-sm text-purple-600 mb-2">@{profile.username}</span>
              <span className="text-base text-gray-700 mb-2">{profile.email}</span>
              <span className="text-base text-pink-700 mb-2">Student ID: {profile.student_ID}</span>
              <div className="w-full mt-4 p-4 rounded-xl bg-white bg-opacity-70 shadow-inner mb-2">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Bio</h3>
                <p className="text-gray-800">{profile.bio || "No bio added yet."}</p>
              </div>
              <div className="w-full mt-2 p-4 rounded-xl bg-white bg-opacity-70 shadow-inner mb-2">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Address</h3>
                <p className="text-gray-800">{profile.address || "No address added yet."}</p>
              </div>
              <div className="w-full mt-2 p-4 rounded-xl bg-white bg-opacity-70 shadow-inner mb-2">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Phone Number</h3>
                <p className="text-gray-800">{profile.phone || "No phone number added yet."}</p>
              </div>
              <div className="w-full mt-2 p-4 rounded-xl bg-white bg-opacity-70 shadow-inner">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Department</h3>
                <p className="text-gray-800">{profile.department || "No department added yet."}</p>
              </div>
              <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => setEditMode(true)}>Edit Profile</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}