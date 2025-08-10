'use client';

import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen pt-16">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Dashboard Content */}
        <main className="p-8 bg-gray-50 flex-1">
          {/* Empty dashboard - ready for future content */}
        </main>
      </div>
    </div>
  );
}