import Activity from '@/lib/models/Activity';
import { connectToDatabase } from '@/lib/mongodb';

// Activity types constants
export const ACTIVITY_TYPES = {
  RESOURCE_UPLOAD: 'resource_upload',
  RESOURCE_DOWNLOAD: 'resource_download',
  DEADLINE_CREATED: 'deadline_created',
  DEADLINE_COMPLETED: 'deadline_completed',
  EVENT_REGISTERED: 'event_registered',
  EVENT_CREATED: 'event_created',
  COURSE_ENROLLED: 'course_enrolled',
  COURSE_DROPPED: 'course_dropped',
  REVIEW_POSTED: 'review_posted',
  CONNECTION_ACCEPTED: 'connection_accepted',
  STUDY_SESSION_JOINED: 'study_session_joined',
  PROFILE_UPDATED: 'profile_updated',
  RESOURCE_DELETED: 'resource_deleted',
  DEADLINE_DELETED: 'deadline_deleted',
  DEADLINE_UPDATED: 'deadline_updated',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_DELETED: 'event_deleted',
  DIRECTORY_CREATED: 'directory_created',
  DIRECTORY_DELETED: 'directory_deleted',
  CONNECTION_REQUESTED: 'connection_requested',
  CONNECTION_REJECTED: 'connection_rejected',
  CONNECTION_REMOVED: 'connection_removed',
  PROFILE_VIEWED: 'profile_viewed',
  STUDY_SESSION_CREATED: 'study_session_created',
  STUDY_SESSION_LEFT: 'study_session_left',
  INTERESTS_UPDATED: 'interests_updated',
  DEADLINE_VOTED: 'deadline_voted'
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];

// Resource types
export const RESOURCE_TYPES = {
  COURSE: 'course',
  EVENT: 'event',
  RESOURCE: 'resource',
  DEADLINE: 'deadline',
  REVIEW: 'review',
  CONNECTION: 'connection',
  STUDY_SESSION: 'study_session',
  PROFILE: 'profile'
} as const;

export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];

// Interface for activity details
export interface ActivityDetails {
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Main function to log activities
export const logActivity = async (
  userId: string,
  action: ActivityType,
  details: ActivityDetails,
  resourceType?: ResourceType,
  resourceId?: string,
  visibility: 'private' | 'public' = 'private'
): Promise<void> => {
  try {
    await connectToDatabase();
    
    const activity = new Activity({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      visibility,
      timestamp: new Date()
    });

    await activity.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break main functionality
  }
};

// Helper functions for specific activity types
export const logResourceUpload = async (
  userId: string,
  resourceTitle: string,
  courseCode: string,
  resourceId: string,
  fileType?: string,
  directoryType?: 'public' | 'private',
  directoryName?: string
) => {
  const location = directoryName ? ` in ${directoryName}` : '';
  const typeText = directoryType === 'public' ? 'public directory' : 'private directory';
  
  await logActivity(
    userId,
    ACTIVITY_TYPES.RESOURCE_UPLOAD,
    {
      title: `Uploaded: ${resourceTitle}`,
      description: `Added resource to ${courseCode} ${typeText}${location}`,
      metadata: { 
        courseCode, 
        fileType, 
        directoryType, 
        directoryName,
        location: `${typeText}${location}`
      }
    },
    RESOURCE_TYPES.RESOURCE,
    resourceId
  );
};

export const logDeadlineCreated = async (
  userId: string,
  deadlineTitle: string,
  courseCode: string,
  section: string,
  deadlineId: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.DEADLINE_CREATED,
    {
      title: `Created deadline: ${deadlineTitle}`,
      description: `Added deadline for ${courseCode} - Section ${section}`,
      metadata: { courseCode, section }
    },
    RESOURCE_TYPES.DEADLINE,
    deadlineId
  );
};

export const logEventRegistration = async (
  userId: string,
  eventTitle: string,
  eventId: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.EVENT_REGISTERED,
    {
      title: `Registered for: ${eventTitle}`,
      description: `Successfully registered for the event`,
      metadata: { eventTitle }
    },
    RESOURCE_TYPES.EVENT,
    eventId
  );
};

export const logCourseEnrollment = async (
  userId: string,
  courseCode: string,
  courseName: string,
  section: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.COURSE_ENROLLED,
    {
      title: `Enrolled in: ${courseCode}`,
      description: `${courseName} - Section ${section}`,
      metadata: { courseCode, courseName, section }
    },
    RESOURCE_TYPES.COURSE
  );
};


export const logConnectionAccepted = async (
  userId: string,
  friendName: string,
  friendEmail: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.CONNECTION_ACCEPTED,
    {
      title: `Connected with: ${friendName}`,
      description: `Accepted connection request`,
      metadata: { friendName, friendEmail }
    },
    RESOURCE_TYPES.CONNECTION
  );
};

export const logProfileUpdate = async (
  userId: string,
  updatedFields: string[]
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.PROFILE_UPDATED,
    {
      title: `Updated profile`,
      description: `Modified: ${updatedFields.join(', ')}`,
      metadata: { updatedFields }
    },
    RESOURCE_TYPES.PROFILE
  );
};

export const logCourseDropped = async (
  userId: string,
  courseCode: string,
  courseName: string,
  section: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.COURSE_DROPPED,
    {
      title: `Dropped course: ${courseCode}`,
      description: `${courseName} - Section ${section}`,
      metadata: { courseCode, courseName, section }
    },
    RESOURCE_TYPES.COURSE
  );
};

export const logDirectoryCreated = async (
  userId: string,
  directoryTitle: string,
  courseCode: string,
  directoryId: string,
  visibility: 'private' | 'connections' = 'private'
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.DIRECTORY_CREATED,
    {
      title: `Created directory: ${directoryTitle}`,
      description: `${courseCode} - ${visibility} directory`,
      metadata: { courseCode, directoryTitle, visibility }
    },
    RESOURCE_TYPES.RESOURCE,
    directoryId
  );
};

export const logResourceDeleted = async (
  userId: string,
  resourceTitle: string,
  courseCode: string,
  resourceId: string,
  resourceType: 'file' | 'youtube' = 'file',
  directoryType?: 'public' | 'private',
  directoryName?: string
) => {
  const location = directoryName ? ` from ${directoryName}` : '';
  const typeText = directoryType === 'public' ? 'public directory' : 'private directory';
  
  await logActivity(
    userId,
    ACTIVITY_TYPES.RESOURCE_DELETED,
    {
      title: `Deleted resource: ${resourceTitle}`,
      description: `Removed ${resourceType} resource from ${courseCode} ${typeText}${location}`,
      metadata: { 
        courseCode, 
        resourceTitle, 
        resourceType, 
        directoryType, 
        directoryName,
        location: `${typeText}${location}`
      }
    },
    RESOURCE_TYPES.RESOURCE,
    resourceId
  );
};

export const logDeadlineDeleted = async (
  userId: string,
  deadlineTitle: string,
  courseCode: string,
  deadlineId: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.DEADLINE_DELETED,
    {
      title: `Deleted deadline: ${deadlineTitle}`,
      description: `${courseCode} - Assignment/Quiz deadline`,
      metadata: { courseCode, deadlineTitle }
    },
    RESOURCE_TYPES.COURSE,
    deadlineId
  );
};

export const logDirectoryDeleted = async (
  userId: string,
  directoryTitle: string,
  courseCode: string,
  directoryId: string,
  visibility: 'private' | 'connections' = 'private'
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.DIRECTORY_DELETED,
    {
      title: `Deleted directory: ${directoryTitle}`,
      description: `${courseCode} - ${visibility} directory`,
      metadata: { courseCode, directoryTitle, visibility }
    },
    RESOURCE_TYPES.RESOURCE,
    directoryId
  );
};

export const logReviewPosted = async (
  userId: string,
  courseCode: string,
  rating: number,
  reviewText: string,
  reviewId: string
) => {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const truncatedText = reviewText.length > 100 ? reviewText.substring(0, 100) + '...' : reviewText;
  
  await logActivity(
    userId,
    ACTIVITY_TYPES.REVIEW_POSTED,
    {
      title: `Posted review: ${courseCode}`,
      description: `${stars} - "${truncatedText}"`,
      metadata: { 
        courseCode, 
        rating, 
        reviewText: truncatedText,
        fullText: reviewText
      }
    },
    RESOURCE_TYPES.REVIEW,
    reviewId
  );
};

export const logEventCreated = async (
  userId: string,
  eventTitle: string,
  eventId: string,
  eventType?: string,
  eventDate?: string
) => {
  const typeText = eventType ? ` (${eventType})` : '';
  const dateText = eventDate ? ` - ${new Date(eventDate).toLocaleDateString()}` : '';
  
  await logActivity(
    userId,
    ACTIVITY_TYPES.EVENT_CREATED,
    {
      title: `Created event: ${eventTitle}`,
      description: `Club event${typeText}${dateText}`,
      metadata: { 
        eventTitle, 
        eventType, 
        eventDate,
        isClubAdmin: true
      }
    },
    RESOURCE_TYPES.EVENT,
    eventId
  );
};

export const logDeadlineCompleted = async (
  userId: string,
  deadlineTitle: string,
  courseCode: string,
  deadlineId: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.DEADLINE_COMPLETED,
    {
      title: `Completed deadline: ${deadlineTitle}`,
      description: `${courseCode} - Assignment/Quiz completed`,
      metadata: { courseCode, deadlineTitle }
    },
    RESOURCE_TYPES.COURSE,
    deadlineId
  );
};

export const logEventDeleted = async (
  userId: string,
  eventTitle: string,
  eventId: string,
  eventType?: string
) => {
  const typeText = eventType ? ` (${eventType})` : '';
  
  await logActivity(
    userId,
    ACTIVITY_TYPES.EVENT_DELETED,
    {
      title: `Deleted event: ${eventTitle}`,
      description: `Removed club event${typeText}`,
      metadata: { 
        eventTitle, 
        eventType,
        isClubAdmin: true
      }
    },
    RESOURCE_TYPES.EVENT,
    eventId
  );
};

export const logConnectionRequested = async (
  userId: string,
  targetUserId: string,
  targetUserName: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.CONNECTION_REQUESTED,
    {
      title: `Sent connection request`,
      description: `Requested to connect with ${targetUserName}`,
      metadata: { targetUserId, targetUserName }
    },
    RESOURCE_TYPES.USER,
    targetUserId
  );
};

export const logConnectionRejected = async (
  userId: string,
  requesterUserId: string,
  requesterName: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.CONNECTION_REJECTED,
    {
      title: `Rejected connection request`,
      description: `Declined connection from ${requesterName}`,
      metadata: { requesterUserId, requesterName }
    },
    RESOURCE_TYPES.USER,
    requesterUserId
  );
};

export const logConnectionRemoved = async (
  userId: string,
  targetUserId: string,
  targetUserName: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.CONNECTION_REMOVED,
    {
      title: `Removed connection`,
      description: `Disconnected from ${targetUserName}`,
      metadata: { targetUserId, targetUserName }
    },
    RESOURCE_TYPES.USER,
    targetUserId
  );
};

export const logProfileViewed = async (
  userId: string,
  viewedUserId: string,
  viewedUserName: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.PROFILE_VIEWED,
    {
      title: `Viewed profile`,
      description: `Visited ${viewedUserName}'s profile`,
      metadata: { viewedUserId, viewedUserName }
    },
    RESOURCE_TYPES.USER,
    viewedUserId
  );
};

export const logStudySessionCreated = async (
  userId: string,
  roomId: string,
  roomName: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.STUDY_SESSION_CREATED,
    {
      title: `Created study room`,
      description: `Started study session: ${roomName}`,
      metadata: { roomId, roomName }
    },
    RESOURCE_TYPES.STUDY_SESSION,
    roomId
  );
};

export const logStudySessionLeft = async (
  userId: string,
  roomId: string,
  roomName: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.STUDY_SESSION_LEFT,
    {
      title: `Left study room`,
      description: `Ended study session: ${roomName}`,
      metadata: { roomId, roomName }
    },
    RESOURCE_TYPES.STUDY_SESSION,
    roomId
  );
};

export const logInterestsUpdated = async (
  userId: string,
  interests: string[]
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.INTERESTS_UPDATED,
    {
      title: `Updated interests`,
      description: `Changed interests to: ${interests.join(', ')}`,
      metadata: { interests }
    },
    RESOURCE_TYPES.USER,
    userId
  );
};

export const logDeadlineVoted = async (
  userId: string,
  deadlineTitle: string,
  courseCode: string,
  voteType: 'agree' | 'disagree',
  deadlineId: string
) => {
  const voteText = voteType === 'agree' ? 'agreed with' : 'disagreed with';
  
  await logActivity(
    userId,
    ACTIVITY_TYPES.DEADLINE_VOTED,
    {
      title: `Voted on deadline`,
      description: `${voteText} deadline: ${deadlineTitle} in ${courseCode}`,
      metadata: { courseCode, deadlineTitle, voteType }
    },
    RESOURCE_TYPES.DEADLINE,
    deadlineId
  );
};
