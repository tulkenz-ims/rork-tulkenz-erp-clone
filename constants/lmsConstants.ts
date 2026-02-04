export type CourseStatus = 'draft' | 'published' | 'archived';
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed' | 'expired' | 'failed';
export type CourseType = 'required' | 'optional' | 'certification' | 'compliance';

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  type: CourseType;
  category: string;
  duration: number;
  passingScore: number;
  status: CourseStatus;
  instructor?: string;
  prerequisites?: string[];
  expirationDays?: number;
  isActive: boolean;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  courseName: string;
  employeeId: string;
  employeeName: string;
  enrollmentDate: string;
  dueDate?: string;
  completedDate?: string;
  status: EnrollmentStatus;
  progress: number;
  score?: number;
  attempts: number;
  certificateId?: string;
}

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  required: 'Required',
  optional: 'Optional',
  certification: 'Certification',
  compliance: 'Compliance',
};

export const COURSE_TYPE_COLORS: Record<CourseType, string> = {
  required: '#EF4444',
  optional: '#3B82F6',
  certification: '#8B5CF6',
  compliance: '#F59E0B',
};

export const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  not_started: '#6B7280',
  in_progress: '#3B82F6',
  completed: '#10B981',
  expired: '#EF4444',
  failed: '#DC2626',
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  expired: 'Expired',
  failed: 'Failed',
};

export const LMS_CATEGORIES = [
  'Safety',
  'Quality',
  'Compliance',
  'Operations',
  'Leadership',
  'Technical',
  'Soft Skills',
  'Onboarding',
] as const;

export const MOCK_COURSES: Course[] = [];
export const MOCK_ENROLLMENTS: CourseEnrollment[] = [];
