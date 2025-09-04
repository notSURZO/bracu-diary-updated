'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { 
  FaCalendarCheck, 
  FaUsers, 
  FaShieldAlt, 
  FaPlus, 
  FaEye, 
  FaArrowRight,
  FaRocket,
  FaGlobe,
  FaStar
} from 'react-icons/fa';

export default function EventsPage() {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        <div className="text-center z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
            <FaCalendarCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to BRACU Events</h1>
          <p className="text-blue-200 mb-8 max-w-md mx-auto">Sign in to discover and manage amazing events at BRAC University</p>
          <Link 
            href="/sign-in" 
            className="inline-flex items-center gap-2 bg-white text-blue-900 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <FaArrowRight className="w-4 h-4" />
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <FaCalendarCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Events Hub
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Discover, create, and manage amazing events at BRAC University. 
              Connect with your community and make every moment count.
            </p>
          </div>

          {/* Enhanced Action Cards */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Club Admin Card */}
            <div className="group relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col">
                <div className="text-center flex-1 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <FaUsers className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Club Administrator</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Take control of your club's events. Create, manage, and track registrations 
                      with our powerful admin tools.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Link 
                      href="/events/admin-verify"
                      className="group/btn inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <FaShieldAlt className="w-5 h-5" />
                      Verify Admin Status
                      <FaArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                    
                    <Link 
                      href="/events/admin-dashboard"
                      className="group/btn inline-flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <FaRocket className="w-5 h-5" />
                      Admin Dashboard
                      <FaArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* View Events Card */}
            <div className="group relative h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col">
                <div className="text-center flex-1 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <FaGlobe className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Explore Events</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Discover exciting events happening across campus. From workshops to social gatherings, 
                      find your next adventure.
                    </p>
                  </div>
                  
                  <Link 
                    href="/events/view"
                    className="group/btn inline-flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <FaEye className="w-5 h-5" />
                    Browse All Events
                    <FaArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced How it Works Section */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h3>
              <p className="text-gray-600 text-lg">Simple steps to get started with our event platform</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FaShieldAlt className="w-8 h-8 text-white" />
                </div>
                <div className="bg-white/50 rounded-2xl p-6 border border-white/30">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">1. Admin Verification</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Club administrators verify their identity using secure university credentials 
                    to ensure proper event management.
                  </p>
                </div>
              </div>
              
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FaPlus className="w-8 h-8 text-white" />
                </div>
                <div className="bg-white/50 rounded-2xl p-6 border border-white/30">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">2. Create Events</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Once verified, admins can create, customize, and manage events with 
                    our intuitive dashboard and tools.
                  </p>
                </div>
              </div>
              
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FaStar className="w-8 h-8 text-white" />
                </div>
                <div className="bg-white/50 rounded-2xl p-6 border border-white/30">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">3. Public Access</h4>
                  <p className="text-gray-600 leading-relaxed">
                    All students can discover, register for, and participate in events, 
                    fostering a vibrant campus community.
                  </p>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
