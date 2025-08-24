// Shared TypeScript interfaces for the application

// Describes the structure of a single deadline object
export interface Deadline {
  id: string;
  title: string;
  details: string;
  submissionLink?: string;
  lastDate: string;
  createdBy: string; // This should be populated with the user's name from your API
  createdAt: string;
  type?: 'theory' | 'lab';
  agrees?: string[]; // Array of user IDs who agree
  disagrees?: string[]; // Array of user IDs who disagree
}

// Describes the structure of a course object
export interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  sections: Array<{
    section: string;
    theory: any;
    lab?: any;
  }>;
}
