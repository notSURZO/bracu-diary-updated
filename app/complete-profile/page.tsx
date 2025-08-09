"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CompleteProfile() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    student_ID: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded || !user) return;
    if (!form.name.trim() || !form.username.trim() || !form.student_ID.trim()) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          name: form.name.trim(),
          username: form.username.trim(),
          email: user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress,
          student_ID: form.student_ID.trim(),
          picture_url: user.imageUrl || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save profile");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Complete Your Profile</h2>
        <p className="mb-6 text-gray-600">Please enter the following details to finish setting up your account.</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input name="username" value={form.username} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
          <input name="student_ID" value={form.student_ID} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl">
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </form>
    </div>
  );
} 