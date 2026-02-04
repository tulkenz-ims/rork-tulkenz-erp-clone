export type InspectionFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'as_needed';
export type InspectionResult = 'pass' | 'fail' | 'needs_attention' | 'n/a';
export type TrackedItemStatus = 'active' | 'inactive' | 'retired' | 'maintenance';

export const FREQUENCY_DAYS: Record<InspectionFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
  as_needed: 0,
};

export interface InspectionChecklistItem {
  id: string;
  question: string;
  type: 'yes_no' | 'pass_fail' | 'rating' | 'text' | 'number';
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'safety' | 'quality' | 'compliance' | 'maintenance' | 'environmental';
  frequency: InspectionFrequency;
  checklist: InspectionChecklistItem[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackedItem {
  id: string;
  template_id: string;
  item_number: string;
  name: string;
  description?: string;
  location: string;
  facility: string;
  status: TrackedItemStatus;
  assigned_to?: string;
  assigned_to_name?: string;
  last_inspection?: string;
  next_inspection?: string;
  notes?: string;
}

export interface InspectionResponseItem {
  checklistItemId: string;
  question: string;
  response: string | number | boolean;
  notes?: string;
  photoUrl?: string;
}

export interface InspectionRecord {
  id: string;
  template_id: string;
  template_name: string;
  tracked_item_id?: string;
  tracked_item_name?: string;
  inspector_id: string;
  inspector_name: string;
  inspection_date: string;
  result: InspectionResult;
  responses: InspectionResponseItem[];
  location?: string;
  notes?: string;
  corrective_action_required?: boolean;
  corrective_action_notes?: string;
  created_at: string;
}

export interface TrackedItemChange {
  id: string;
  tracked_item_id: string;
  item_number: string;
  change_type: 'assignment' | 'location' | 'status' | 'other';
  previous_value?: string;
  new_value: string;
  reason?: string;
  changed_by: string;
  changed_at: string;
}

export interface InspectionSchedule {
  id: string;
  template_id: string;
  template_name: string;
  frequency: InspectionFrequency;
  day_of_week?: string;
  day_of_month?: number;
  assigned_to?: string;
  assigned_to_name?: string;
  last_completed?: string;
  next_due: string;
  notify_before_days?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InspectionAttachment {
  id: string;
  inspection_record_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}
