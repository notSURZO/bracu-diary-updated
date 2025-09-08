'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaMapMarkerAlt, FaTag, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';

type EventItem = {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  clubName: string;
  tags?: string[];
  imageUrl?: string;
};

export default function ViewEventsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [recommended, setRecommended] = useState<EventItem[]>([]);
  const [useRecommended, setUseRecommended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  // Debounced success toaster
  const toastSuccess = useMemo(
    () => debounce((msg: string) => toast.success(msg), 300, { leading: true, trailing: false }),
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        // 1) Load interests first
        let hasInterests = false;
        const ir = await fetch('/api/user/interests');
        if (ir.ok) {
          const ij = await ir.json();
          const list = ij.interests || [];
          setInterests(list);
          hasInterests = Array.isArray(list) && list.length > 0;
          setUseRecommended(hasInterests);
        }

        // 2) Load recommended if user has interests
        if (hasInterests) {
          const r = await fetch('/api/events/recommended');
          const rj = await r.json();
          if (r.ok) setRecommended(rj.events || []);
        }

        // 3) Load all upcoming (fallback)
        let e = await fetch('/api/events');
        let ej = await e.json();
        if (e.ok && Array.isArray(ej.events)) {
          setEvents(ej.events);
        } else {
          e = await fetch('/api/events?includePast=true');
          ej = await e.json();
          if (e.ok) setEvents(ej.events || []);
        }

        // 4) Load current registrations
        const reg = await fetch('/api/events/registered');
        if (reg.ok) {
          const rj = await reg.json();
          const ids = new Set<string>((rj.events || []).map((x: any) => String(x.eventId)));
          setRegisteredIds(ids);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (isSignedIn) load();
  }, [isSignedIn]);

  const display = useMemo(() => (useRecommended ? recommended : events), [useRecommended, recommended, events]);

  const onRegister = async (eventId: string) => {
    try {
      setRegistering(eventId);
      const res = await fetch(`/api/events/${eventId}/register`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toastSuccess(data.message || 'Registered successfully');
        setRegisteredIds((prev) => new Set([...Array.from(prev), eventId]));
      } else {
        toast.error(data.message || 'Failed to register');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setRegistering(null);
    }
  };

  const onCancel = async (eventId: string) => {
    try {
      setRegistering(eventId);
      const res = await fetch(`/api/events/${eventId}/register`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toastSuccess(data.message || 'Registration cancelled');
        setRegisteredIds((prev) => {
          const copy = new Set(prev);
          copy.delete(eventId);
          return copy;
        });
      } else {
        toast.error(data.message || 'Failed to cancel');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setRegistering(null);
    }
  };

  const addInterest = () => {
    const val = newInterest.trim();
    if (!val) return;
    if (interests.includes(val)) return;
    const next = [...interests, val];
    setInterests(next);
    setNewInterest('');
  };

  const saveInterests = async () => {
    try {
      const res = await fetch('/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Interests saved');
        const enable = Array.isArray(interests) && interests.length > 0;
        setUseRecommended(enable);
        if (enable) {
          setLoading(true);
          const r = await fetch('/api/events/recommended');
          const rj = await r.json();
          if (r.ok) setRecommended(rj.events || []);
        }
      } else {
        toast.error(data.message || 'Failed to save interests');
      }
    } catch (e) {
      toast.error('Error saving interests');
    } finally {
      setLoading(false);
    }
  };

  // While Clerk is loading, render a pleasant skeleton instead of flashing the sign-in page
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
              <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100 mb-10">
                <div className="h-6 w-40 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-full max-w-md bg-gray-200 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 rounded-full" />
                  <div className="h-8 w-28 bg-gray-200 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="h-56 bg-gray-200" />
                    <div className="p-6">
                      <div className="h-5 w-3/5 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-2/5 bg-gray-200 rounded mb-4" />
                      <div className="h-4 w-full bg-gray-200 rounded mb-3" />
                      <div className="h-10 w-full bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view events</h1>
          <Link href="/sign-in" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <Link href="/events" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors">
                <FaArrowLeft className="w-4 h-4 mr-2" /> Back to Events
              </Link>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Browse Events</h1>
              <p className="text-gray-600 mt-2 text-base">{useRecommended ? 'Recommended for you' : 'All upcoming events'}</p>
            </div>
            <Link href="/events/registered" className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
              <FaCheckCircle className="w-4 h-4 mr-2" /> My Registrations
            </Link>
          </div>

          {/* Interests Editor */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Interests</h2>
            <p className="text-gray-600 mb-4">Add topics to personalize event recommendations (e.g., AI, Debate, Hackathon).</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {interests.map((t) => (
                <span key={t} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                  <FaTag className="mr-1" /> {t}
                  <button className="ml-2 text-blue-600 hover:text-blue-800" onClick={() => setInterests((prev) => prev.filter((x) => x !== t))}>
                    ×
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  placeholder="Add interest"
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button onClick={addInterest} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                <button onClick={saveInterests} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">Save</button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-600 py-20">Loading events...</div>
          ) : display.length === 0 ? (
            <div className="text-center text-gray-600 py-20">No upcoming events found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 justify-center">
              {display.map((ev) => (
                <div key={ev._id} className="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
                  {/* Banner */}
                  <div className="relative w-full h-56 md:h-64 bg-gray-100">
                    {ev.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.imageUrl} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-100 to-slate-100" />
                    )}
                    {/* Overlay info strip */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                      <div className="flex items-center gap-3 text-white text-sm">
                        <div className="inline-flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                          <FaCalendarAlt className="opacity-90" /> {format(new Date(ev.date), 'MMM dd, yyyy')} • {ev.time}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <div className="mb-3">
                      <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">{ev.title}</h3>
                      <p className="text-sm text-gray-500">{ev.clubName}</p>
                    </div>
                    <p className="text-gray-700 mb-4 line-clamp-3">{ev.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <FaMapMarkerAlt className="shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                    {ev.tags && ev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {ev.tags.map((t) => (
                          <span key={t} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                            <FaTag className="mr-1" /> {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {registeredIds.has(ev._id) ? (
                      <div className="flex gap-3">
                        <button disabled className="flex-1 py-3 rounded-lg font-semibold bg-green-100 text-green-700 border border-green-300">
                          Registered
                        </button>
                        <button onClick={() => onCancel(ev._id)} disabled={registering === ev._id} className="px-4 py-3 rounded-lg font-semibold bg-red-50 text-red-700 border border-red-300 hover:bg-red-100">
                          {registering === ev._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button disabled={registering === ev._id} onClick={() => onRegister(ev._id)} className="w-full py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                        {registering === ev._id ? 'Registering...' : 'Register'}
                      </button>
                    )}
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
