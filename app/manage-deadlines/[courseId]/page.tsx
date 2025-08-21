'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'theory' | 'lab'>('all');
  const [showModal, setShowModal] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [hasLab, setHasLab] = useState(false);

  // Ref for the modal
  const modalRef = useRef<HTMLDivElement>(null);

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

    // Effect to handle clicks outside the modal
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setShowModal(false);
            }
        }

        if (showModal) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showModal]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();
      
      if (!data || !data.sections) {
        console.error('Invalid course data received:', data);
        setCourse({ _id: '', courseCode: '', courseName: '', sections: [] });
        setHasLab(false);
        return;
      }
      
      setCourse(data);
      
      const hasAnyLab = Array.isArray(data.sections) && 
                       data.sections.some((s: any) => s && s.lab);
      setHasLab(Boolean(hasAnyLab));
      
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        setSelectedSection(data.sections[0]?.section || '');
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      setCourse({ _id: '', courseCode: '', courseName: '', sections: [] });
      setHasLab(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
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
          courseId,
          originalCourseId: course._id,
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
              Upcoming Deadlines {selectedSection && `- Section ${selectedSection}`}
            </h2>
            <div className="flex items-center space-x-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'theory' | 'lab')}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="theory">Theory</option>
                {hasLab && <option value="lab">Lab</option>}
              </select>
              
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Deadline
              </button>
            </div>
          </div>
            
          {/* Section Tabs */}
          <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8" aria-label="Sections">
                  {course?.sections && Array.isArray(course.sections) && course.sections.length > 0 ? (
                      course.sections.map((section) => (
                          <button
                              key={section.section}
                              onClick={() => setSelectedSection(section.section)}
                              className={`${
                                  selectedSection === section.section
                                      ? 'border-blue-500 text-blue-600'
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                          >
                              Section {section.section}
                          </button>
                      ))
                  ) : (
                      <p className="text-sm text-gray-500">No sections available for this course.</p>
                  )}
              </nav>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div ref={modalRef} className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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