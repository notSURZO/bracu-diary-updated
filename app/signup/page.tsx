'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentId: string;
}

export default function CustomSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: signup form, 2: verification
  const [code, setCode] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (formData.firstName.trim().length < 2) return 'First name must be at least 2 characters';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (formData.lastName.trim().length < 2) return 'Last name must be at least 2 characters';
    if (!formData.username.trim()) return 'Username is required';
    if (formData.username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) return 'Username can only contain letters, numbers, and underscores';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.studentId.trim()) return 'Student ID is required';
    if (formData.studentId.length < 6) return 'Student ID must be at least 6 characters';
    if (!/^\d+$/.test(formData.studentId)) return 'Student ID must contain only numbers';
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const checkResponse = await fetch('/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          studentId: formData.studentId.trim(),
          email: formData.email.trim()
        })
      });
      if (!checkResponse.ok) {
        const checkData = await checkResponse.json();
        throw new Error(checkData.error || 'Validation failed');
      }
      await signUp.create({
        emailAddress: formData.email.trim(),
        password: formData.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep(2);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.errors && error.errors.length > 0) {
        const clerkError = error.errors[0];
        setError(clerkError.message || 'Signup failed. Please try again.');
      } else {
        setError(error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !code.trim()) {
      setError('Please enter the verification code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (completeSignUp.status === 'complete') {
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: completeSignUp.createdUserId,
            name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            username: formData.username.trim(),
            email: formData.email.trim(),
            student_ID: formData.studentId.trim(),
            picture_url: completeSignUp.createdUser?.imageUrl || ''
          })
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save user data');
        }
        await setActive({ session: completeSignUp.createdSessionId });
        router.push('/dashboard');
      } else {
        throw new Error('Email verification incomplete');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      if (error.errors && error.errors.length > 0) {
        const clerkError = error.errors[0];
        setError(clerkError.message || 'Verification failed. Please try again.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
            <p className="text-gray-600">We've sent a verification code to {formData.email}</p>
          </div>
          <form onSubmit={handleVerification} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
              <input type="text" id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter verification code" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-2xl tracking-widest" disabled={loading} required maxLength={6} />
            </div>
            {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>)}
            <button type="submit" disabled={loading || !code.trim()} className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none">
              {loading ? (<div className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Verifying...</div>) : ('Verify & Complete Registration')}
            </button>
          </form>
          <button onClick={() => setStep(1)} className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">← Back to signup form</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="min-h-screen grid lg:grid-cols-2 items-center">
        {/* Left Content - Centered */}
        <div className="flex flex-col items-center justify-center px-6 lg:px-12 py-12 lg:py-0">
          {/* Logo and Title */}
          <div className="flex items-center mb-6 space-x-4">
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
          <span className="text-blue-600 font-medium text-base mb-6">Your Academic Oasis</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6 leading-tight text-center max-w-2xl">
            Transform Your
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Academic Journey</span>
          </h2>
          <p className="text-lg text-gray-600 mb-12 leading-relaxed text-center max-w-xl">
            Experience the future of university life with our intuitive platform designed to help BRAC University students excel in their academic pursuits.
          </p>
          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Smart Course Management</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Organize courses with intelligent tracking and deadline management</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Connect & Collaborate</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Build meaningful connections and share resources with peers</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">AI-Powered Insights</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Get personalized recommendations and intelligent assistance</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/20 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Track Progress</h3>
              <p className="text-xs text-gray-600 leading-relaxed">Monitor achievements and celebrate your milestones</p>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex items-center justify-center px-6 lg:px-16 py-12 lg:py-0">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Create Account</h2>
              <p className="text-gray-600 text-sm leading-relaxed">Enter your details to get started</p>
            </div>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required minLength={2} maxLength={50} />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required minLength={2} maxLength={50} />
                </div>
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input type="text" id="username" name="username" value={formData.username} onChange={handleInputChange} placeholder="Choose a unique username" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="your.email@g.bracu.ac.bd" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required />
              </div>
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">Student ID *</label>
                <input type="text" id="studentId" name="studentId" value={formData.studentId} onChange={handleInputChange} placeholder="Enter your BRAC University Student ID" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required minLength={6} maxLength={20} pattern="\d+" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Create a strong password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required minLength={8} />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm your password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" required minLength={8} />
              </div>
              {/* CAPTCHA Widget - Required for Clerk bot protection */}
              <div id="clerk-captcha" className="empty:hidden"></div>
              {error && (<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>)}
              <button type="submit" disabled={loading} className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none">{loading ? (<div className="flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Creating Account...</div>) : ('Create Account')}</button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500 font-medium">or</span></div>
            </div>
            <p className="text-sm text-gray-500 text-center">Already have an account?{' '}<Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
} 