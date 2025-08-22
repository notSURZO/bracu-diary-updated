'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';

interface Deadline {
  _id: string;
  id: string;
  title: string;
  details: string;
  submissionLink?: string;
  lastDate: string;
  createdBy: string;
  createdByName?: string;
  createdByStudentId?: string;
  createdAt: string;
  type?: 'theory' | 'lab';
  agrees: string[];
  disagrees: string[];
  completed: boolean;
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
  const pathname = usePathname();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'theory' | 'lab'>('all');
  const [showModal, setShowModal] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [hasLab, setHasLab] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [deleteDeadline, setDeleteDeadline] = useState<Deadline | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    type: 'theory' as 'theory' | 'lab',
    title: '',
    details: '',
    submissionLink: '',
    lastDate: '',
    time: '',
    completed: false
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

  useEffect(() => {
    // Generate a unique key for this page to store scroll position
    const scrollKey = `scroll-position-${pathname}`;

    // Restore scroll position when component mounts
    const savedScrollPosition = sessionStorage.getItem(scrollKey);
    if (savedScrollPosition && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition, 10);
    }

    // Save scroll position on scroll
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        sessionStorage.setItem(scrollKey, scrollContainerRef.current.scrollTop.toString());
      }
    };

    // Save scroll position before unload
    const handleBeforeUnload = () => {
      if (scrollContainerRef.current) {
        sessionStorage.setItem(scrollKey, scrollContainerRef.current.scrollTop.toString());
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
        setError(null);
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

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showModal) {
        setShowModal(false);
        setError(null);
      }
      if (selectedDeadline) {
        setSelectedDeadline(null);
      }
      if (showDeleteModal) {
        setShowDeleteModal(false);
        setDeleteDeadline(null);
      }
    }
  }, [showModal, selectedDeadline, showDeleteModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();
      
      if (!data || !data.sections) {
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
        `/api/get-deadlines?courseId=${courseId}&section=${selectedSection}&type=${filter}`,
        { cache: 'no-store' } // Prevent caching to ensure fresh data
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

    if (!course || !user) {
      setError('User or course data not available');
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
          lastDate: lastDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setError(null);
        setSelectedDeadline(null);
        setFormData({
          type: 'theory',
          title: '',
          details: '',
          submissionLink: '',
          lastDate: '',
          time: '',
          completed: false
        });
        fetchDeadlines();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to post deadline');
      }
    } catch (error) {
      console.error('Error posting deadline:', error);
      setError('Failed to post deadline');
    }
  };

  const handleToggleComplete = async (deadline: Deadline) => {
    if (!user) return;

    try {
      const response = await fetch('/api/update-deadline', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deadlineId: deadline._id || deadline.id,
          userId: user.id,
          completed: !deadline.completed
        }),
      });

      if (response.ok) {
        fetchDeadlines();
      } else {
        const errorData = await response.json();
        console.error('Failed to update deadline:', errorData.error);
      }
    } catch (error) {
      console.error('Error updating deadline:', error);
    }
  };

  const handleAgreeDisagree = async (deadlineId: string, voteType: 'agree' | 'disagree') => {
    if (!user || !course) return;

    try {
      const response = await fetch('/api/vote-deadline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deadlineId,
          originalCourseId: course._id,
          section: selectedSection,
          userId: user.id,
          voteType
        }),
      });

      if (response.ok) {
        await fetchDeadlines(); // Ensure fresh data is fetched
      } else {
        const errorData = await response.json();
        console.error('Failed to update vote:', errorData.error);
      }
    } catch (error) {
      console.error('Error updating vote:', error);
    }
  };

  const handleDeleteDeadline = async (deadline: Deadline) => {
    if (!user || !course) return;

    try {
      const response = await fetch(
        `/api/delete-deadline?deadlineId=${deadline._id || deadline.id}&courseId=${course._id}&section=${selectedSection}&type=${deadline.type || 'theory'}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setShowDeleteModal(false);
        setDeleteDeadline(null);
        fetchDeadlines();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete deadline:', errorData.error);
      }
    } catch (error) {
      console.error('Error deleting deadline:', error);
    }
  };

  const confirmDelete = (deadline: Deadline) => {
    setDeleteDeadline(deadline);
    setShowDeleteModal(true);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString || typeof dateString !== 'string') {
      return { date: 'Unknown', time: 'Unknown' };
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { date: 'Unknown', time: 'Unknown' };
    }

    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'hh:mm a')
    };
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    const safeText = text || ''; 
    if (safeText.length <= maxLength) return safeText;
    return safeText.substring(0, maxLength) + '...';
  };

  const toggleDetails = (deadline: Deadline) => {
    const deadlineId = deadline._id || deadline.id;
    setSelectedDeadline(selectedDeadline && (selectedDeadline._id === deadlineId || selectedDeadline.id === deadlineId) ? null : deadline);
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
                onChange={(e) => {
                  setFilter(e.target.value as 'all' | 'theory' | 'lab');
                  setSelectedDeadline(null);
                }}
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
            
          <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8" aria-label="Sections">
                  {course?.sections && Array.isArray(course.sections) && course.sections.length > 0 ? (
                      course.sections.map((section) => (
                          <button
                              key={`section-${section.section}`}
                              onClick={() => {
                                setSelectedSection(section.section);
                                setSelectedDeadline(null);
                              }}
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
            <div ref={scrollContainerRef} className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {deadlines.map((deadline) => {
                const { date, time } = formatDateTime(deadline.lastDate);
                const hasVotedAgree = user?.id ? (deadline.agrees ?? []).includes(user.id) : false;
                const hasVotedDisagree = user?.id ? (deadline.disagrees ?? []).includes(user.id) : false;
                return (
                  <div 
                    key={deadline._id || deadline.id} 
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow relative ${deadline.completed ? 'bg-green-50' : 'bg-white'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">{deadline.title || 'Untitled Deadline'}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deadline.type === 'theory' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {deadline.type === 'theory' ? 'Theory' : (deadline.type === 'lab' ? 'Lab' : 'Unknown')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{truncateText(deadline.details || 'No details provided')}</p>
                        <div className="mt-2 flex items-center space-x-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={deadline.completed}
                              onChange={() => handleToggleComplete(deadline)}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-600">Completed</span>
                          </label>
                          <button
                            onClick={() => toggleDetails(deadline)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                          >
                            {selectedDeadline && (selectedDeadline._id === (deadline._id || deadline.id) || selectedDeadline.id === (deadline._id || deadline.id)) ? 'Hide Details' : 'Details'}
                          </button>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAgreeDisagree(deadline._id || deadline.id, 'agree')}
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                hasVotedAgree
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              Agree ({deadline.agrees.length})
                            </button>
                            <button
                              onClick={() => handleAgreeDisagree(deadline._id || deadline.id, 'disagree')}
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                hasVotedDisagree
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-gray-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              Disagree ({deadline.disagrees.length})
                            </button>
                          </div>
                          {user && deadline.createdBy === user.id && (
                            <button
                              onClick={() => confirmDelete(deadline)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <h3>Due:</h3>
                        <p className="text-sm font-medium text-gray-900">{date}</p>
                        <p className="text-sm text-gray-500">{time}</p>
                      </div>
                    </div>
                    {selectedDeadline && (selectedDeadline._id === (deadline._id || deadline.id) || selectedDeadline.id === (deadline._id || deadline.id)) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-gray-900">Details:</h3>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{deadline.details}</p>
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
                        <p className="mt-2 text-sm font-medium text-gray-900">Due: {date} at {time}</p>
                        <p className="mt-2 text-sm text-gray-500">Created by: {deadline.createdByName && deadline.createdByStudentId ? `${deadline.createdByName} (${deadline.createdByStudentId})` : 'Unknown'}</p>
                        <p className="mt-2 text-sm text-gray-500">Created at: {formatDateTime(deadline.createdAt).date} at {formatDateTime(deadline.createdAt).time}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div ref={modalRef} className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Deadline</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
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
                    onClick={() => {
                      setShowModal(false);
                      setError(null);
                    }}
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

      {showDeleteModal && deleteDeadline && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Delete Deadline</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteDeadline(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete the deadline "<span className="font-medium text-gray-900">{deleteDeadline.title}</span>"?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteDeadline(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteDeadline(deleteDeadline)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}