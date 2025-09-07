import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import FriendsSidebar from "./components/FriendsSidebar";
import Schedule from "./components/Schedule";

export default async function Home() {
  const user = await currentUser();

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
        <main className="container mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          <Schedule />
        </main>
      </div>
    );
  } else {
    // Redirect to the sign-in page if the user is not logged in
    redirect('/sign-in');
  }
}
