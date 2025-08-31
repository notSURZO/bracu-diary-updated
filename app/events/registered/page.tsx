'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { format } from 'date-fns';
import { FaArrowLeft, FaCalendarAlt, FaMapMarkerAlt, FaTag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';

type RegisteredEvent = {
  registrationId: string;
  eventId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  clubName: string;
  tags?: string[];
  imageUrl?: string;
  isPast?: boolean;
};

export default function RegisteredEventsPage() {
  const { isSignedIn } = useUser();
  const [events, setEvents] = useState<RegisteredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const toastSuccess = useMemo(
    () => debounce((msg: string) => toast.success(msg), 300, { leading: true, trailing: false }),
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/events/registered');
        const data = await res.json();
        if (res.ok) setEvents(data.events || []);
      } finally {
        setLoading(false);
      }
    };
    if (isSignedIn) load();
  }, [isSignedIn]);

  const cancelRegistration = async (eventId: string) => {
    try {
      setCancellingId(eventId);
      const res = await fetch(`/api/events/${eventId}/register`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
        toastSuccess('Registration cancelled');
      } else {
        console.error(data);
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your registrations</h1>
          <Link href="/sign-in" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-6 md:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/events/view" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors">
              <FaArrowLeft className="w-4 h-4 mr-2" /> Back to Browse
            </Link>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">My Registered Events</h1>
            <p className="text-gray-600 mt-2">All events you have registered for</p>
          </div>

          {loading ? (
            <div className="text-center text-gray-600 py-20">Loading registered events...</div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 text-center">
              <p className="text-gray-600 mb-4">You haven\'t registered for any events yet.</p>
              <Link href="/events/view" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Browse Events</Link>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((ev) => (
                <div key={ev.registrationId} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                  {ev.imageUrl ? (
                    <div className="w-full h-60 md:h-72 bg-gray-50 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ev.imageUrl} alt={ev.title} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : null}
                  <div className="p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-extrabold text-gray-900 leading-snug">{ev.title}</h3>
                        <p className="text-sm text-gray-500">{ev.clubName}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-2 justify-end"><FaCalendarAlt /> {format(new Date(ev.date), 'MMM dd, yyyy')} • {ev.time}</div>
                        <div className="flex items-center gap-2 justify-end"><FaMapMarkerAlt /> {ev.location}</div>
                      </div>
                    </div>
                    <p className="text-gray-700 mt-4">{ev.description}</p>
                    {ev.tags && ev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {ev.tags.map((t) => (
                          <span key={t} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                            <FaTag className="mr-1" /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                      <div className="mt-6 flex items-center justify-between">
                        {ev.isPast ? (
                          <div className="w-full">
                            <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-cyan-50">
                              <div className="absolute inset-0 opacity-30 animate-gradient-x" style={{ backgroundImage: 'linear-gradient(110deg, #a855f7 0%, #06b6d4 50%, #22c55e 100%)', backgroundSize: '200% 200%' }} />
                            <div className="relative flex items-center justify-between p-3">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800">This event is completed</p>
                                </div>
                                <Link href="/events/view" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Browse Events</Link>
                              </div>
                            </div>
                            <style jsx>{`
                              @keyframes gradient-x { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
                              .animate-gradient-x { animation: gradient-x 6s ease-in-out infinite; }
                            `}</style>
                          </div>
                        ) : (
                          <button
                            onClick={() => cancelRegistration(ev.eventId)}
                            disabled={cancellingId === ev.eventId}
                            className="ml-auto px-4 py-3 rounded-lg font-semibold bg-red-50 text-red-700 border border-red-300 hover:bg-red-100"
                          >
                            {cancellingId === ev.eventId ? 'Cancelling...' : 'Cancel Registration'}
                          </button>
                        )}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
