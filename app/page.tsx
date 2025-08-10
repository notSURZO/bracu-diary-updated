import Image from "next/image";
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

export default async function Home() {
  const user = await currentUser();

  // If user is signed in, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="min-h-screen grid lg:grid-cols-2 items-center">
        {/* Left Content - Centered */}
        <div className="flex flex-col items-center justify-center px-6 lg:px-16 py-12 lg:py-0">
          {/* Logo and Title */}
          <div className="flex items-center mb-8 space-x-4">
            <Image
              src="/BRACU DIARY.svg"
              alt="BRACU Diary Logo Text"
              width={160}
              height={60}
              className="object-contain"
              priority
            />
            <Image
              src="/logo.svg"
              alt="BRACU Diary Logo Icon"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <span className="text-blue-600 font-medium text-lg mb-8">Your Academic Oasis</span>

          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-8 leading-tight text-center max-w-3xl">
            Transform Your
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Academic Journey</span>
          </h2>

          <p className="text-lg lg:text-xl text-gray-600 mb-16 leading-relaxed text-center max-w-2xl">
            Experience the future of university life with our intuitive platform designed to help BRAC University students excel in their academic pursuits.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl w-full">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-3">Smart Course Management</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Organize courses with intelligent tracking and deadline management</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-3">Connect & Collaborate</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Build meaningful connections and share resources with peers</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-3">AI-Powered Insights</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Get personalized recommendations and intelligent assistance</p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-3">Track Progress</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Monitor achievements and celebrate your milestones</p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex items-center justify-center px-6 lg:px-16 py-12 lg:py-0">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 p-8 w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome Back</h2>
              <p className="text-gray-600 text-sm leading-relaxed">Sign in to continue your academic journey</p>
            </div>

            <div className="space-y-4">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                  Sign In
                </button>
              </SignInButton>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">or</span>
                </div>
              </div>

              <Link href="/signup">
                <button className="w-full px-6 py-3.5 border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg font-semibold text-base transition-all duration-300 transform hover:scale-[1.02]">
                  Create Account
                </button>
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-8 text-center">
              New to BracU Diary?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 cursor-pointer font-semibold transition-colors">
                Get started for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}