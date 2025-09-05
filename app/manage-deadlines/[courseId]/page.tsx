'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  category?: 'Quiz' | 'Assignment' | 'Mid' | 'Final';
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
  theoryMarksDistribution: Array<{
    quiz: string;
    assignment: string;
    mid: string;
    final: string;
  }>;
  labmarksDistribution: Array<{
    quiz: string;
    assignment: string;
    mid: string;
    final: string;
  }>;
}

export default function ManageDeadlinesPage() {
  const { courseId } = useParams();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [missedDeadlines, setMissedDeadlines] = useState<Deadline[]>([]);
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
    category: 'Quiz' as 'Quiz' | 'Assignment' | 'Mid' | 'Final',
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
      setLoading(true);
      fetchDeadlines();
    }
  }, [courseId, user, selectedSection, filter]);

  useEffect(() => {
    const scrollKey = `scroll-position-${pathname}`;
    const savedScrollPosition = sessionStorage.getItem(scrollKey);
    if (savedScrollPosition && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition, 10);
    }

    const handleScroll = () => {
      if (scrollContainerRef.current) {
        sessionStorage.setItem(scrollKey, scrollContainerRef.current.scrollTop.toString());
      }
    };

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

    // Ensure scroll position is maintained after state changes
    const maintainScroll = () => {
      if (scrollContainerRef.current && savedScrollPosition) {
        scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition, 10);
      }
    };

    // Trigger scroll restoration on state changes
    requestAnimationFrame(maintainScroll);

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname, selectedDeadline]);

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
      const response = await fetch(`/api/courses-surzo/${courseId}`);
      const data = await response.json();
      
      if (!data || !data.sections) {
        setCourse({ _id: '', courseCode: '', courseName: '', sections: [], theoryMarksDistribution: [], labmarksDistribution: [] });
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
      setCourse({ _id: '', courseCode: '', courseName: '', sections: [], theoryMarksDistribution: [], labmarksDistribution: [] });
      setHasLab(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      if (!selectedSection) {
        setDeadlines([]);
        setMissedDeadlines([]);
        return;
      }

      const currentSection = selectedSection;
      const currentFilter = filter;
      
      const response = await fetch(
        `/api/get-deadlines?courseId=${courseId}&section=${currentSection}&type=${currentFilter}`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      const allDeadlines = data.deadlines || [];
      const now = new Date();

      const upcoming = allDeadlines.filter((d: Deadline) => new Date(d.lastDate) >= now);
      const missed = allDeadlines.filter((d: Deadline) => new Date(d.lastDate) < now && !d.completed);

      if (currentSection === selectedSection && currentFilter === filter) {
        setDeadlines(upcoming);
        setMissedDeadlines(missed);
      }
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      if (selectedSection === selectedSection && filter === filter) {
        setDeadlines([]);
        setMissedDeadlines([]);
      }
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
          category: formData.category,
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
          category: 'Quiz',
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

    if (!deadline.completed) {
      toast(
        <div>
          <p>Are you sure you have completed the deadline?</p>
          <div className="flex justify-end space-x-2 mt-2">
            <button
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              onClick={() => toast.dismiss()}
            >
              No
            </button>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={async () => {
                try {
                  const response = await fetch('/api/update-deadline', {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      deadlineId: deadline._id || deadline.id,
                      userId: user.id,
                      completed: true
                    }),
                  });

                  if (response.ok) {
                    toast.dismiss();
                    await fetchDeadlines();
                    router.push(`/marks-calculation/${course?._id}`);
                  } else {
                    const errorData = await response.json();
                    console.error('Failed to update deadline:', errorData.error);
                    toast.error('Failed to update deadline');
                  }
                } catch (error) {
                  console.error('Error updating deadline:', error);
                  toast.error('Error updating deadline');
                }
              }}
            >
              Yes
            </button>
          </div>
        </div>,
        {
          autoClose: false,
          closeButton: false,
          draggable: false,
          position: 'top-center',
        }
      );
    } else {
      try {
        const response = await fetch('/api/update-deadline', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deadlineId: deadline._id || deadline.id,
            userId: user.id,
            completed: false
          }),
        });

        if (response.ok) {
          fetchDeadlines();
        } else {
          const errorData = await response.json();
          console.error('Failed to update deadline:', errorData.error);
          toast.error('Failed to update deadline');
        }
      } catch (error) {
        console.error('Error updating deadline:', error);
        toast.error('Error updating deadline');
      }
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
        await fetchDeadlines();
      } else {
        const errorData = await response.json();
        console.error('Failed to update vote:', errorData.error);
        toast.error('Failed to update vote');
      }
    } catch (error) {
      console.error('Error updating vote:', error);
      toast.error('Error updating vote');
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
        toast.error('Failed to delete deadline');
      }
    } catch (error) {
      console.error('Error deleting deadline:', error);
      toast.error('Error deleting deadline');
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
    const currentScroll = scrollContainerRef.current?.scrollTop || 0;
    const deadlineId = deadline._id || deadline.id;
    setSelectedDeadline(
      selectedDeadline && (selectedDeadline._id === deadlineId || selectedDeadline.id === deadlineId)
        ? null
        : deadline
    );
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = currentScroll;
      }
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const DeadlineCard = ({ deadline, isMissed }: { deadline: Deadline, isMissed?: boolean }) => {
    const { date, time } = formatDateTime(deadline.lastDate);
    const hasVotedAgree = user?.id ? (deadline.agrees ?? []).includes(user.id) : false;
    const hasVotedDisagree = user?.id ? (deadline.disagrees ?? []).includes(user.id) : false;
    const cardBgColor = isMissed ? 'bg-red-50 border-l-4 border-l-red-500' : (deadline.completed ? 'bg-green-50 border-l-4 border-l-green-500' : 'bg-white border-l-4 border-l-blue-500');
    const categoryColors = {
      Quiz: 'bg-yellow-100 text-yellow-800',
      Assignment: 'bg-yellow-100 text-yellow-800',
      Mid: 'bg-yellow-100 text-yellow-800',
      Final: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <div 
        key={deadline._id || deadline.id} 
        className={`border rounded-lg p-5 hover:shadow-md transition-shadow ${cardBgColor}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{deadline.title || 'Untitled Deadline'}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                deadline.type === 'theory'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {deadline.type === 'theory' ? 'Theory' : (deadline.type === 'lab' ? 'Lab' : 'Unknown')}
              </span>
              {deadline.category && (
                <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${categoryColors[deadline.category]}`}>
                  {deadline.category}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{truncateText(deadline.details || 'No details provided', 100)}</p>
          </div>
          <div className="ml-4 text-right min-w-[120px]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due</p>
            <p className="text-sm font-semibold text-gray-900">{date}</p>
            <p className="text-xs text-gray-500">{time}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {!isMissed && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={deadline.completed}
                  onChange={() => handleToggleComplete(deadline)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">Completed</span>
              </label>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleDetails(deadline);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              {selectedDeadline && (selectedDeadline._id === (deadline._id || deadline.id) || selectedDeadline.id === (deadline._id || deadline.id)) ? 'Hide Details' : 'View Details'}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAgreeDisagree(deadline._id || deadline.id, 'agree')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  hasVotedAgree
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-green-800 hover:bg-green-200'
                }`}
              >
                ✓ ({deadline.agrees.length})
              </button>
              <button
                onClick={() => handleAgreeDisagree(deadline._id || deadline.id, 'disagree')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  hasVotedDisagree
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-red-800 hover:bg-red-200'
                }`}
              >
                ✗ ({deadline.disagrees.length})
              </button>
            </div>
            
            {user && deadline.createdBy === user.id && (
              <button
                onClick={() => confirmDelete(deadline)}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {selectedDeadline && (selectedDeadline._id === (deadline._id || deadline.id) || selectedDeadline.id === (deadline._id || deadline.id)) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Full Details:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words mb-3">{deadline.details}</p>
            
            {deadline.submissionLink && (
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700 block mb-1">Submission Link:</span>
                <a
                  href={deadline.submissionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {deadline.submissionLink}
                </a>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Due:</span> {date} at {time}
              </div>
              <div>
                <span className="font-medium text-gray-700">Created by:</span> {deadline.createdByName && deadline.createdByStudentId ? `${deadline.createdByName} (${deadline.createdByStudentId})` : 'Unknown'}
              </div>
              <div>
                <span className="font-medium text-gray-700">Created at:</span> {formatDateTime(deadline.createdAt).date} at {formatDateTime(deadline.createdAt).time}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <ToastContainer />
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Deadlines for {course?.courseCode} {selectedSection && `- Section ${selectedSection}`}
            </h2>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Deadline
              </button>
            </div>
          </div>
            
          <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Sections">
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
                              } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm`}
                          >
                              Section {section.section}
                          </button>
                      ))
                  ) : (
                      <p className="text-sm text-gray-500">No sections available for this course.</p>
                  )}
              </nav>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Deadlines</h3>
          {deadlines.length === 0 ? (
            <div className="text-center py-12">
               <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming deadlines</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add a new deadline to get started.
                </p>
            </div>
          ) : (
            <div ref={scrollContainerRef} className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {deadlines.map((deadline) => (
                <DeadlineCard key={deadline._id || deadline.id} deadline={deadline} />
              ))}
            </div>
          )}

          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Missed Deadlines</h3>
            {missedDeadlines.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No missed deadlines</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {missedDeadlines.map((deadline) => (
                  <DeadlineCard key={deadline._id || deadline.id} deadline={deadline} isMissed={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div ref={modalRef} className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Deadline</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="mt-2 text-left space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'theory' | 'lab' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="theory">Theory</option>
                    {hasLab && <option value="lab">Lab</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deadline Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'Quiz' | 'Assignment' | 'Mid' | 'Final' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(() => {
                      const distribution = formData.type === 'theory' ? course?.theoryMarksDistribution?.[0] : course?.labmarksDistribution?.[0];
                      const options = [];
                      if (distribution) {
                        if (distribution.quiz && distribution.quiz !== '') options.push(<option key="Quiz" value="Quiz">Quiz</option>);
                        if (distribution.assignment && distribution.assignment !== '') options.push(<option key="Assignment" value="Assignment">Assignment</option>);
                        if (distribution.mid && distribution.mid !== '') options.push(<option key="Mid" value="Mid">Mid</option>);
                        if (distribution.final && distribution.final !== '') options.push(<option key="Final" value="Final">Final</option>);
                      }
                      return options.length > 0 ? options : (
                        <>
                          <option value="Quiz">Quiz</option>
                          <option value="Assignment">Assignment</option>
                          <option value="Mid">Mid</option>
                          <option value="Final">Final</option>
                        </>
                      );
                    })()}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <textarea
                    name="details"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submission Link ?(Optional)</label>
                  <input
                    type="url"
                    name="submissionLink"
                    value={formData.submissionLink}
                    onChange={(e) => setFormData({ ...formData, submissionLink: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      name="lastDate"
                      value={formData.lastDate}
                      onChange={(e) => setFormData({ ...formData, lastDate: e.target.value })}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Due Time</label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="items-center px-4 py-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Submit Deadline
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteDeadline && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                  <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
                  <p className="mt-2 text-sm text-gray-600">
                      Are you sure you want to delete the deadline: "{deleteDeadline.title}"?
                  </p>
                  <div className="mt-4 flex justify-end space-x-2">
                      <button
                          onClick={() => {
                            setShowDeleteModal(false);
                            setDeleteDeadline(null);
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={() => handleDeleteDeadline(deleteDeadline)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                          Confirm Delete
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}