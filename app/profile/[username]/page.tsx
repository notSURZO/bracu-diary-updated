import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { notFound } from "next/navigation";


export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  await connectToDatabase();

  // Find user by username
  const userDoc = await User.findOne({ username });

  // If user not found, return 404
  if (!userDoc) {
    notFound();
  }

  const name = userDoc.name || "Unknown";
  const usernameDisplay = userDoc.username || "Not set";
  const email = userDoc.email || "Not set";
  const bio = userDoc.bio || "";
  const studentId = userDoc.student_ID || "";
  const pictureUrl = userDoc.picture_url || "/logo.svg";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">



      {/* Profile Content */}
      <div className="flex-1 flex justify-center items-center">
        <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gradient-to-br from-blue-300 via-purple-200 to-pink-200 p-8 flex flex-col items-center">
          <img
            src={pictureUrl}
            alt="Avatar"
            className="w-28 h-28 rounded-full border-4 border-white shadow-lg mb-4 bg-white object-cover"
          />
          <h2 className="text-3xl font-bold text-blue-700 mb-1">{name}</h2>
          <span className="text-sm text-purple-600 mb-2">@{usernameDisplay}</span>
          <span className="text-base text-gray-700 mb-2">{email}</span>
          <span className="text-base text-pink-700 mb-2">Student ID: {studentId}</span>
          <div className="w-full mt-4 p-4 rounded-xl bg-white bg-opacity-70 shadow-inner">
            <h3 className="text-lg font-semibold text-blue-600 mb-2">Bio</h3>
            <p className="text-gray-800">{bio || "No bio added yet."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
