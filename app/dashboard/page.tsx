'use client';

import Sidebar from '../components/Sidebar';
import ProfileButton from '../components/ProfileButton';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 bg-white shadow">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-700">Dashboard</h1>
          </div>
          <ProfileButton />
        </header>

        {/* Dashboard Content */}
        <main className="p-8 bg-gray-50 flex-1">
          {/* Your dashboard content goes here */}
        </main>
      </div>
    </div>
  );
}