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
  DEADLINE_UPDATED: 'deadline_updated',
  EVENT_CANCELLED: 'event_cancelled',
  DIRECTORY_CREATED: 'directory_created'
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
  fileType?: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.RESOURCE_UPLOAD,
    {
      title: `Uploaded: ${resourceTitle}`,
      description: `Added resource to ${courseCode}`,
      metadata: { courseCode, fileType }
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

export const logReviewPosted = async (
  userId: string,
  courseCode: string,
  rating: number,
  reviewId: string
) => {
  await logActivity(
    userId,
    ACTIVITY_TYPES.REVIEW_POSTED,
    {
      title: `Posted review for: ${courseCode}`,
      description: `Rated ${rating}/5 stars`,
      metadata: { courseCode, rating }
    },
    RESOURCE_TYPES.REVIEW,
    reviewId
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
