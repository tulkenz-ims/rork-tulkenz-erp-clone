export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type QuestionType = 'multiple_choice' | 'rating' | 'text' | 'yes_no' | 'scale';

export interface Survey {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: SurveyStatus;
  isAnonymous: boolean;
  startDate: string;
  endDate: string;
  targetAudience: string;
  responseCount: number;
  targetResponses: number;
  questions: SurveyQuestion[];
  createdBy: string;
  createdAt: string;
}

export interface SurveyQuestion {
  id: string;
  order: number;
  text: string;
  type: QuestionType;
  isRequired: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string;
  submittedAt: string;
  answers: Record<string, string | number | boolean>;
}

export const SURVEY_STATUS_COLORS: Record<SurveyStatus, string> = {
  draft: '#6B7280',
  active: '#10B981',
  closed: '#3B82F6',
  archived: '#9CA3AF',
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  rating: 'Rating',
  text: 'Text',
  yes_no: 'Yes/No',
  scale: 'Scale',
};

export const SURVEY_CATEGORIES = [
  'Employee Engagement',
  'Workplace Safety',
  'Training Feedback',
  'Benefits Satisfaction',
  'Manager Feedback',
  'Exit Survey',
  'Pulse Survey',
  'Custom',
] as const;

export const MOCK_SURVEYS: Survey[] = [];
