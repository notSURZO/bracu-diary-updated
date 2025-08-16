import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const user = await currentUser();

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br pr-54 from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        {/* ... (existing logged-in user content) ... */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Welcome Back!</h2>
          <p className="text-gray-600">Content for logged-in users will be added here.</p>
          <p className="text-gray-600 mt-2">You are currently logged in.</p>
        </div>
      </div>
    );
  } else {
    // Redirect to the sign-in page if the user is not logged in
    redirect('/sign-in');
  }
}