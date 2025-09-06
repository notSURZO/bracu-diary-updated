'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { formatDistanceToNow } from 'date-fns';
import {
  FaUpload,
  FaCalendarPlus,
  FaCalendarCheck,
  FaGraduationCap,
  FaStar,
  FaUserPlus,
  FaEdit,
  FaDownload,
  FaTrash,
  FaClock,
  FaTimes,
  FaFilter,
  FaSearch,
  FaSync
} from 'react-icons/fa';

interface Activity {
  _id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: {
    title: string;
    description?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
}

interface ActivityCount {
  _id: string;
  count: number;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'resource_upload':
      return <FaUpload className="w-5 h-5 text-brac-blue" />;
    case 'resource_download':
      return <FaDownload className="w-5 h-5 text-green-600" />;
    case 'deadline_created':
      return <FaCalendarPlus className="w-5 h-5 text-red-600" />;
    case 'deadline_completed':
      return <FaCalendarCheck className="w-5 h-5 text-green-600" />;
    case 'event_registered':
      return <FaCalendarCheck className="w-5 h-5 text-brac-blue" />;
    case 'event_created':
      return <FaCalendarPlus className="w-5 h-5 text-brac-blue" />;
    case 'course_enrolled':
      return <FaGraduationCap className="w-5 h-5 text-brac-navy" />;
    case 'course_dropped':
      return <FaGraduationCap className="w-5 h-5 text-red-600" />;
    case 'review_posted':
      return <FaStar className="w-5 h-5 text-brac-gold" />;
    case 'connection_accepted':
      return <FaUserPlus className="w-5 h-5 text-brac-blue" />;
    case 'profile_updated':
      return <FaEdit className="w-5 h-5 text-gray-600" />;
    case 'resource_deleted':
      return <FaTrash className="w-5 h-5 text-red-600" />;
    case 'deadline_deleted':
      return <FaTrash className="w-5 h-5 text-red-600" />;
    case 'directory_created':
      return <FaUpload className="w-5 h-5 text-brac-gold" />;
    case 'directory_deleted':
      return <FaTrash className="w-5 h-5 text-red-600" />;
    case 'event_deleted':
      return <FaTrash className="w-5 h-5 text-red-600" />;
    case 'connection_requested':
      return <FaUserPlus className="w-5 h-5 text-brac-blue" />;
    case 'connection_rejected':
      return <FaTimes className="w-5 h-5 text-red-600" />;
    case 'connection_removed':
      return <FaTimes className="w-5 h-5 text-red-600" />;
    case 'profile_viewed':
      return <FaEdit className="w-5 h-5 text-gray-600" />;
    case 'study_session_created':
      return <FaCalendarPlus className="w-5 h-5 text-brac-blue" />;
    case 'study_session_left':
      return <FaTimes className="w-5 h-5 text-gray-600" />;
    case 'interests_updated':
      return <FaEdit className="w-5 h-5 text-brac-gold" />;
    case 'deadline_voted':
      return <FaStar className="w-5 h-5 text-brac-gold" />;
    default:
      return <FaClock className="w-5 h-5 text-gray-600" />;
  }
};

const getActivityColor = (action: string) => {
  switch (action) {
    case 'resource_upload':
      return 'bg-brac-blue-light border-brac-blue';
    case 'resource_download':
      return 'bg-green-50 border-green-200';
    case 'deadline_created':
      return 'bg-red-50 border-red-200';
    case 'deadline_completed':
      return 'bg-green-50 border-green-200';
    case 'event_registered':
      return 'bg-brac-blue-light border-brac-blue';
    case 'event_created':
      return 'bg-brac-blue-light border-brac-blue';
    case 'course_enrolled':
      return 'bg-slate-50 border-slate-200';
    case 'course_dropped':
      return 'bg-red-50 border-red-200';
    case 'review_posted':
      return 'bg-brac-gold-light border-brac-gold';
    case 'connection_accepted':
      return 'bg-brac-blue-light border-brac-blue';
    case 'profile_updated':
      return 'bg-gray-50 border-gray-200';
    case 'resource_deleted':
      return 'bg-red-50 border-red-200';
    case 'deadline_deleted':
      return 'bg-red-50 border-red-200';
    case 'directory_created':
      return 'bg-brac-gold-light border-brac-gold';
    case 'directory_deleted':
      return 'bg-red-50 border-red-200';
    case 'event_deleted':
      return 'bg-red-50 border-red-200';
    case 'connection_requested':
      return 'bg-brac-blue-light border-brac-blue';
    case 'connection_rejected':
      return 'bg-red-50 border-red-200';
    case 'connection_removed':
      return 'bg-red-50 border-red-200';
    case 'profile_viewed':
      return 'bg-gray-50 border-gray-200';
    case 'study_session_created':
      return 'bg-brac-blue-light border-brac-blue';
    case 'study_session_left':
      return 'bg-gray-50 border-gray-200';
    case 'interests_updated':
      return 'bg-brac-gold-light border-brac-gold';
    case 'deadline_voted':
      return 'bg-brac-gold-light border-brac-gold';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const formatActionName = (action: string) => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

type SortOption = 'newest' | 'oldest' | 'action' | 'title';

export default function ActivitiesPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityCounts, setActivityCounts] = useState<ActivityCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async (pageNum: number = 1, actionFilter: string = 'all', refresh: boolean = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch(`/api/activities?page=${pageNum}&action=${actionFilter}`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.activities);
        setActivityCounts(data.activityCounts);
        setHasNextPage(data.pagination.hasNextPage);
        setHasPrevPage(data.pagination.hasPrevPage);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const sortActivities = useCallback((activities: Activity[], sortBy: SortOption) => {
    const sorted = [...activities];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      case 'action':
        return sorted.sort((a, b) => a.action.localeCompare(b.action));
      case 'title':
        return sorted.sort((a, b) => a.details.title.localeCompare(b.details.title));
      default:
        return sorted;
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchActivities(page, filter, true);
  }, [fetchActivities, page, filter]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchActivities(page, filter);
    }
  }, [isLoaded, isSignedIn, page, filter]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    
    setDeletingId(activityId);
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setActivities(prev => prev.filter(activity => activity._id !== activityId));
        setTotalCount(prev => prev - 1);
      } else {
        console.error('Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredActivities = useMemo(() => {
    const filtered = activities.filter(activity =>
      activity.details.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return sortActivities(filtered, sortBy);
  }, [activities, searchTerm, sortActivities, sortBy]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brac-blue mx-auto mb-4"></div>
          <p className="text-brac-navy">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600">Please sign in to view your activity history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-brac-navy mb-4 bg-gradient-to-r from-brac-blue to-brac-blue-dark bg-clip-text text-transparent">
              Recent Activities
            </h1>
            <p className="text-gray-600 text-xl mb-6">
              Track your progress and stay updated with your academic journey
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-white rounded-full shadow-brac border border-brac-blue">
              <FaClock className="w-5 h-5 text-brac-blue mr-2" />
              <span className="text-lg font-semibold text-brac-navy">
                Total Activities: {totalCount}
              </span>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-2xl shadow-brac border border-gray-200 p-6 mb-8">
            {/* Search and Sort Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brac-blue focus:border-brac-blue text-lg"
                />
              </div>
              
              {/* Sort Controls */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brac-blue focus:border-brac-blue bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="action">Sort by Action</option>
                  <option value="title">Sort by Title</option>
                </select>
                
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-3 bg-brac-blue text-white rounded-xl hover:bg-brac-blue-dark transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  <FaSync className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 flex items-center ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-brac-blue to-brac-blue-dark text-white shadow-brac transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-brac-blue-light hover:text-brac-navy hover:shadow-md'
                }`}
              >
                <FaFilter className="w-4 h-4 mr-2" />
                All ({totalCount})
              </button>
              {activityCounts.map((count) => (
                <button
                  key={count._id}
                  onClick={() => handleFilterChange(count._id)}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 flex items-center ${
                    filter === count._id
                      ? 'bg-gradient-to-r from-brac-blue to-brac-blue-dark text-white shadow-brac transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-brac-blue-light hover:text-brac-navy hover:shadow-md'
                  }`}
                >
                  {getActivityIcon(count._id)}
                  <span className="ml-2">{formatActionName(count._id)} ({count.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activities List */}
          <div className="bg-white rounded-xl shadow-brac border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brac-blue mx-auto mb-4"></div>
                <p className="text-brac-navy">Loading activities...</p>
              </div>
            ) : (() => {
              if (activities.length === 0) {
                return (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-brac-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaClock className="w-8 h-8 text-brac-blue" />
                </div>
                <h3 className="text-lg font-semibold text-brac-navy mb-2">No Activities Yet</h3>
                <p className="text-gray-600">
                  {(() => {
                    if (filter === 'all') {
                      return "Start using the platform to see your activities here.";
                    }
                    return `No ${formatActionName(filter).toLowerCase()} activities found.`;
                  })()}
                </p>
              </div>
                );
              }
              return (
              <div className="divide-y divide-gray-100">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity._id}
                    className={`p-6 hover:bg-gray-50 transition-all duration-200 group ${getActivityColor(activity.action)}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 p-3 rounded-full bg-white shadow-brac">
                        {getActivityIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-brac-navy mb-2">
                          {activity.details.title}
                        </h3>
                        {activity.details.description && (
                          <p className="text-gray-600 mb-3 text-lg">
                            {activity.details.description}
                          </p>
                        )}
                        {activity.details.metadata && (
                          <div className="mb-3">
                            {activity.details.metadata.location && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                📁 {activity.details.metadata.location}
                              </span>
                            )}
                            {activity.details.metadata.rating && (
                              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                ⭐ {activity.details.metadata.rating}/5
                              </span>
                            )}
                            {activity.details.metadata.eventType && (
                              <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                🎉 {activity.details.metadata.eventType}
                              </span>
                            )}
                            {activity.details.metadata.eventDate && (
                              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                📅 {new Date(activity.details.metadata.eventDate).toLocaleDateString()}
                              </span>
                            )}
                            {activity.details.metadata.voteType && (
                              <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                {activity.details.metadata.voteType === 'agree' ? '👍' : '👎'} {activity.details.metadata.voteType}
                              </span>
                            )}
                            {activity.details.metadata.interests && (
                              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                🏷️ {activity.details.metadata.interests.slice(0, 3).join(', ')}{activity.details.metadata.interests.length > 3 ? '...' : ''}
                              </span>
                            )}
                            {activity.details.metadata.updatedFields && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                ✏️ {activity.details.metadata.updatedFields.length} fields updated
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm">
                              <FaClock className="w-4 h-4 mr-2 text-brac-blue" />
                              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </span>
                            <span className="px-3 py-1 bg-gradient-to-r from-brac-blue-light to-brac-gold-light rounded-full text-xs font-medium text-brac-navy">
                              {formatActionName(activity.action)}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteActivity(activity._id)}
                            disabled={deletingId === activity._id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full disabled:opacity-50"
                            title="Delete activity"
                          >
                            {deletingId === activity._id ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <FaTimes className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              );
            })()}

            {/* Pagination */}
            {activities.length > 0 && (
              <div className="px-8 py-6 bg-gradient-to-r from-brac-blue-light to-brac-gold-light border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPrevPage}
                    className="px-6 py-3 text-sm font-medium text-brac-navy bg-white border border-brac-blue rounded-xl hover:bg-brac-blue-light hover:shadow-brac disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                  >
                    <FaClock className="w-4 h-4 mr-2" />
                    Previous
                  </button>
                  <div className="px-4 py-2 bg-gradient-to-r from-brac-blue to-brac-blue-dark text-white rounded-xl font-semibold">
                    Page {page}
                  </div>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNextPage}
                    className="px-6 py-3 text-sm font-medium text-brac-navy bg-white border border-brac-blue rounded-xl hover:bg-brac-blue-light hover:shadow-brac disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                  >
                    Next
                    <FaClock className="w-4 h-4 ml-2" />
                  </button>
                </div>
                <div className="text-sm text-brac-navy font-medium bg-white px-4 py-2 rounded-xl shadow-sm">
                  Showing {filteredActivities.length} of {totalCount} activities
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
