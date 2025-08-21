'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';

interface Deadline {
  id: string;
  title: string;
  details: string;
  submissionLink?: string;
  lastDate: string;
  createdBy: string;
  createdAt: string;
  type?: 'theory' | 'lab';
}

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  sections: Array<{
    section: string;
    theory: any;
    lab?: any;
  }>;
}

export default function ManageDeadlinesPage() {
  const { courseId } = useParams();
  const { user } = useUser();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  
  // Debug: Log the courseId to see what we're getting
  useEffect(() => {
    console.log('courseId from useParams():', courseId);
    console.log('Type of courseId:', typeof courseId);
    if (Array.isArray(courseId)) {
      console.log('courseId is an array:', courseId);
    }
  }, [courseId]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'theory' | 'lab'>('all');
  const [showModal, setShowModal] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [hasLab, setHasLab] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'theory' as 'theory' | 'lab',
    title: '',
    details: '',
    submissionLink: '',
    lastDate: '',
    time: ''
  });

  useEffect(() => {
    if (courseId && user) {
      fetchCourseDetails();
    }
  }, [courseId, user]);

  useEffect(() => {
    if (courseId && user && selectedSection) {
      fetchDeadlines();
    }
  }, [courseId, user, selectedSection, filter]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();
      console.log('eta holo data',data);

      
      // Handle empty or invalid response
      if (!data || !data.sections) {
        console.error('Invalid course data received:', data);
        setCourse({ _id: '', courseCode: '', courseName: '', sections: [] });
        setHasLab(false);
        return;
      }
      
      setCourse(data);
      
      // Check if course has lab sections with defensive programming
      const hasAnyLab = Array.isArray(data.sections) && 
                       data.sections.some((s: any) => s && s.lab);
      setHasLab(Boolean(hasAnyLab));
      
      // Set default section safely
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        setSelectedSection(data.sections[0]?.section || '');
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      // Set empty course on error
      setCourse({ _id: '', courseCode: '', courseName: '', sections: [] });
      setHasLab(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      // Only fetch deadlines if we have a valid section
      if (!selectedSection) {
        setDeadlines([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(
        `/api/get-deadlines?courseId=${courseId}&section=${selectedSection}&type=${filter}`
      );
      const data = await response.json();
      setDeadlines(data.deadlines || []);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      setDeadlines([]);
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure course data is available before proceeding
    if (!course) {
      console.error("Course details not loaded. Cannot post deadline.");
      return;
    }
    
    try {
      const lastDateTime = new Date(`${formData.lastDate}T${formData.time}`);
      
      const response = await fetch('/api/post-deadline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Send the original course ID along with the modified one
          courseId,
          originalCourseId: course._id, // This is the crucial line to add
          section: selectedSection,
          type: formData.type,
          title: formData.title,
          details: formData.details,
          submissionLink: formData.submissionLink,
          lastDate: lastDateTime.toISOString()
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({
          type: 'theory',
          title: '',
          details: '',
          submissionLink: '',
          lastDate: '',
          time: ''
        });
        fetchDeadlines();
      } else {
        // Log the error response from the server for debugging
        const errorData = await response.json();
        console.error('Failed to post deadline:', errorData.error);
      }
    } catch (error) {
      console.error('Error posting deadline:', error);
    }
  };
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'hh:mm a')
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Upcoming Deadlines
            </h2>
            <div className="flex items-center space-x-4">
              {/* Filter dropdown */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'theory' | 'lab')}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="theory">Theory</option>
                {hasLab && <option value="lab">Lab</option>}
              </select>
              
              {/* Section selector */}
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={!course?.sections || course.sections.length === 0}
              >
                {course?.sections && Array.isArray(course.sections) && course.sections.length > 0 ? (
                  course.sections.map((section) => (
                    <option key={section.section} value={section.section}>
                      Section {section.section}
                    </option>
                  ))
                ) : (
                  <option value="">No sections</option>
                )}
              </select>
              
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Deadline
              </button>
            </div>
          </div>

          {deadlines.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming deadlines</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new deadline.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deadlines.map((deadline) => {
                const { date, time } = formatDateTime(deadline.lastDate);
                return (
                  <div key={deadline.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">{deadline.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deadline.type === 'theory' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {deadline.type === 'theory' ? 'Theory' : 'Lab'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{deadline.details}</p>
                        {deadline.submissionLink && (
                          <a
                            href={deadline.submissionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Submission Link →
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{date}</p>
                        <p className="text-sm text-gray-500">{time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Deadline</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'theory' | 'lab'})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="theory">Theory</option>
                    {hasLab && <option value="lab">Lab</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <textarea
                    required
                    value={formData.details}
                    onChange={(e) => setFormData({...formData, details: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Submission Link (Optional)</label>
                  <input
                    type="url"
                    value={formData.submissionLink}
                    onChange={(e) => setFormData({...formData, submissionLink: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Date</label>
                    <input
                      type="date"
                      required
                      value={formData.lastDate}
                      onChange={(e) => setFormData({...formData, lastDate: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Deadline
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
