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
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        
        <main className="flex-1 p-8">
          <Schedule />
        </main>

        
      </div>
    );
  } else {
    // Redirect to the sign-in page if the user is not logged in
    redirect('/sign-in');
  }
}
