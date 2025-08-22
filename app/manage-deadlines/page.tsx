'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { format, formatDistanceToNowStrict } from 'date-fns';
import AddDeadlineModal from '../components/AddDeadlineModal';

// --- INTERFACES ---
interface Deadline {
  id: string;
  title: string;
  details: string;
  submissionLink?: string;
  lastDate: string;
  createdBy: string;
  createdAt: string;
  type?: 'theory' | 'lab';
  agrees?: string[];
  disagrees?: string[];
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

export default function ManageDeadlinesRoot() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'theory' | 'lab'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedDeadline, setExpandedDeadline] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const { user } = useUser();
  const router = useRouter();

  const [selectedSection, setSelectedSection] = useState<string>('');
  const [hasLab, setHasLab] = useState(false);

  // State for the "Add Deadline" form
  const [formData, setFormData] = useState({
    type: 'theory' as 'theory' | 'lab',
    title: '',
    details: '',
    submissionLink: '',
    lastDate: '',
    time: ''
  });

  useEffect(() => {
    if (user?.emailAddresses?.[0]?.emailAddress) {
      fetchUserCourses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCourse && user && selectedSection) {
      fetchDeadlines();
    }
  }, [selectedCourse, user, selectedSection, filter]);

  const fetchUserCourses = async () => {
    try {
      const response = await fetch(`/api/user-courses?email=${user?.emailAddresses?.[0]?.emailAddress}`);
      const data = await response.json();
      
      if (data.enrolledCourses && data.enrolledCourses.length > 0) {
        const validCourses = data.enrolledCourses.filter((course: any) => 
          !course.courseCode.endsWith('L')
        );
        setCourses(validCourses);
        
        if (validCourses.length > 0) {
          setSelectedCourse(validCourses[0]._id);
          fetchCourseDetails(validCourses[0]._id);
        }
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching user courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();

      if (!data || !data.sections) {
        console.error('Invalid course data received:', data);
        setHasLab(false);
        return;
      }

      const hasAnyLab = data.sections.some((s: any) => s && s.lab);
      setHasLab(hasAnyLab);

      if (data.sections.length > 0) {
        setSelectedSection(data.sections[0]?.section || '');
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
    }
  };

  const fetchDeadlines = async () => {
    setLoading(true);
    try {
      if (!selectedSection) {
        setDeadlines([]);
        return;
      }
      const response = await fetch(`/api/get-deadlines?courseId=${selectedCourse}&section=${selectedSection}&type=${filter}`);
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
    if (!selectedCourse) return;

    try {
      const lastDateTime = new Date(`${formData.lastDate}T${formData.time}`);
      const response = await fetch('/api/post-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse,
          section: selectedSection,
          ...formData,
          lastDate: lastDateTime.toISOString()
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ type: 'theory', title: '', details: '', submissionLink: '', lastDate: '', time: '' });
        fetchDeadlines();
      } else {
        const errorData = await response.json();
        console.error('Failed to post deadline:', errorData.error);
      }
    } catch (error) {
      console.error('Error posting deadline:', error);
    }
  };

  const handleVote = async (deadlineId: string, voteType: 'agree' | 'disagree') => {
    if (!user?.id || isVoting) return;

    setIsVoting(true);
    try {
      // Get the user's enrolled courses to find the originalCourseId
      const userResponse = await fetch(`/api/user-courses?email=${user?.emailAddresses?.[0]?.emailAddress}`);
      const userData = await userResponse.json();
      
      if (userData.enrolledCourses && userData.enrolledCourses.length > 0) {
        const currentCourse = userData.enrolledCourses.find((c: any) => c._id === selectedCourse);
        if (currentCourse && currentCourse.originalCourseId) {
          const response = await fetch('/api/vote-deadline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deadlineId,
              originalCourseId: currentCourse.originalCourseId,
              section: selectedSection,
              userId: user.id,
              voteType,
            }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            // Update the specific deadline with new vote data
            setDeadlines(prev => prev.map(d => 
              d.id === deadlineId ? result.data : d
            ));
          } else {
            console.error("Failed to vote:", result.error);
          }
        } else {
          console.error("Course not found or missing originalCourseId");
        }
      }
    } catch (error) {
      console.error("An error occurred while voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'hh:mm a')
    };
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleDeadlineDetails = (deadlineId: string) => {
    setExpandedDeadline(expandedDeadline === deadlineId ? null : deadlineId);
  };

  if (loading && deadlines.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {courses.length === 0 ? (
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No enrolled courses</h3>
          <p className="mt-1 text-sm text-gray-500">
            You need to enroll in courses to manage deadlines.
          </p>
          <button 
            onClick={() => router.push('/enroll')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Enroll in Courses
          </button>
        </div>
      ) : !selectedCourse ? (
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477 4.5 1.253"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a course</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a course from the tabs above to view deadlines.
          </p>
        </div>
      ) : (
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
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Deadline
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8" aria-label="Sections">
                {courses.find(c => c._id === selectedCourse)?.sections?.map((section) => (
                  <button
                    key={section.section}
                    onClick={() => setSelectedSection(section.section)}
                    className={`${selectedSection === section.section ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Section {section.section}
                  </button>
                ))}
              </nav>
            </div>

            {deadlines.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming deadlines</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a new deadline.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deadlines.map((deadline) => {
                  const { date, time } = formatDateTime(deadline.lastDate);
                  const isExpanded = expandedDeadline === deadline.id;
                  const userVote = deadline.agrees?.includes(user?.id || '') 
                    ? 'agree' 
                    : deadline.disagrees?.includes(user?.id || '') 
                    ? 'disagree' 
                    : null;

                  return (
                    <div key={deadline.id} className="border rounded-lg overflow-hidden">
                      <div className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">{deadline.title}</h3>
                            <p className="mt-1 text-sm text-gray-600">{truncateText(deadline.details)}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm font-medium text-gray-900">{date}</p>
                            <p className="text-sm text-gray-500">{time}</p>
                          </div>
                        </div>
                        
                        {/* Voting buttons */}
                        <div className="flex items-center space-x-3 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(deadline.id, 'agree');
                            }}
                            disabled={isVoting}
                            className={`flex items-center space-x-1.5 p-2 rounded-lg transition-colors ${
                              userVote === 'agree' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-green-50'
                            }`}
                          >
                            <span>👍</span>
                            <span className="font-semibold">Agree</span>
                            <span className="text-xs font-bold bg-white text-green-800 px-2 py-0.5 rounded-full ring-1 ring-inset ring-green-200">
                              {deadline.agrees?.length || 0}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(deadline.id, 'disagree');
                            }}
                            disabled={isVoting}
                            className={`flex items-center space-x-1.5 p-2 rounded-lg transition-colors ${
                              userVote === 'disagree' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-red-50'
                            }`}
                          >
                            <span>👎</span>
                            <span className="font-semibold">Disagree</span>
                            <span className="text-xs font-bold bg-white text-red-800 px-2 py-0.5 rounded-full ring-1 ring-inset ring-red-200">
                              {deadline.disagrees?.length || 0}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDeadlineDetails(deadline.id);
                            }}
                            className="ml-auto px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
                          >
                            {isExpanded ? 'Hide Details' : 'Details'}
                          </button>
                        </div>
                      </div>

                      {/* Dropdown details */}
                      {isExpanded && (
                        <div className="bg-gray-50 p-4 border-t">
                          <div className="space-y-4">
                            <p className="text-base whitespace-pre-wrap">{deadline.details}</p>
                            {deadline.submissionLink && (
                              <a 
                                href={deadline.submissionLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 font-medium inline-block"
                              >
                                Go to Submission Link &rarr;
                              </a>
                            )}
                            <div className="text-sm text-gray-500">
                              <p>Reminded by: <span className="font-medium text-gray-700">{deadline.createdBy}</span></p>
                              <p>Posted: {format(new Date(deadline.createdAt), 'MMM dd, hh:mm a')}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Deadline Modal */}
      {showAddModal && <AddDeadlineModal onClose={() => setShowAddModal(false)} onSubmit={handleSubmit} formData={formData} setFormData={setFormData} hasLab={hasLab} />}
    </div>
  );
}
