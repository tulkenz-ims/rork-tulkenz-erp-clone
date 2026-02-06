export type EmergencyEventType =
  | 'fire'
  | 'tornado'
  | 'active_shooter'
  | 'chemical_spill'
  | 'gas_leak'
  | 'bomb_threat'
  | 'medical_emergency'
  | 'earthquake'
  | 'flood'
  | 'power_outage'
  | 'structural_collapse'
  | 'other';

export type EmergencyEventStatus =
  | 'initiated'
  | 'in_progress'
  | 'all_clear'
  | 'resolved'
  | 'cancelled';

export type EmergencyEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface EmergencyEvent {
  id: string;
  organization_id: string;
  facility_id?: string;
  facility_name?: string;
  event_type: EmergencyEventType;
  severity: EmergencyEventSeverity;
  status: EmergencyEventStatus;
  title: string;
  description?: string;
  location_details?: string;
  initiated_by: string;
  initiated_by_id?: string;
  initiated_at: string;
  all_clear_at?: string;
  resolved_at?: string;
  total_evacuated?: number;
  total_sheltered?: number;
  injuries_reported: number;
  fatalities_reported: number;
  emergency_services_called: boolean;
  emergency_services_arrival?: string;
  assembly_points_used: string[];
  departments_affected: string[];
  actions_taken: string[];
  timeline_entries: EmergencyTimelineEntry[];
  after_action_notes?: string;
  corrective_actions?: string;
  root_cause?: string;
  property_damage?: boolean;
  property_damage_description?: string;
  estimated_damage_cost?: number;
  media_urls: string[];
  notifications_sent: boolean;
  drill: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  performed_by?: string;
  notes?: string;
}

export interface EmergencyEventFormData {
  event_type: EmergencyEventType;
  severity: EmergencyEventSeverity;
  title: string;
  description?: string;
  location_details?: string;
  drill: boolean;
  departments_affected: string[];
  emergency_services_called: boolean;
}

export const EMERGENCY_EVENT_TYPE_CONFIG: Record<
  EmergencyEventType,
  { label: string; icon: string; color: string; instructions: string; priority: number }
> = {
  fire: {
    label: 'Fire',
    icon: 'Flame',
    color: '#EF4444',
    instructions: 'Activate fire alarm. Evacuate immediately. Call 911. Do NOT use elevators. Meet at designated assembly point.',
    priority: 1,
  },
  tornado: {
    label: 'Tornado',
    icon: 'Tornado',
    color: '#7C3AED',
    instructions: 'Move to interior rooms/shelter areas. Stay away from windows. Protect head and neck. Wait for all-clear.',
    priority: 2,
  },
  active_shooter: {
    label: 'Active Shooter',
    icon: 'ShieldAlert',
    color: '#DC2626',
    instructions: 'RUN if possible. HIDE if you cannot run. FIGHT as a last resort. Call 911 when safe. Do NOT pull fire alarm.',
    priority: 3,
  },
  chemical_spill: {
    label: 'Chemical Spill',
    icon: 'FlaskConical',
    color: '#F59E0B',
    instructions: 'Evacuate area. Do NOT touch or inhale. Alert hazmat team. Refer to SDS. Isolate the area.',
    priority: 4,
  },
  gas_leak: {
    label: 'Gas Leak',
    icon: 'Wind',
    color: '#F97316',
    instructions: 'Evacuate area immediately. Do NOT use electrical switches. Call 911. Move upwind from leak.',
    priority: 5,
  },
  bomb_threat: {
    label: 'Bomb Threat',
    icon: 'AlertOctagon',
    color: '#B91C1C',
    instructions: 'Do NOT use radios or cell phones near suspicious items. Evacuate. Call 911. Note caller details if phone threat.',
    priority: 6,
  },
  medical_emergency: {
    label: 'Medical Emergency',
    icon: 'HeartPulse',
    color: '#EC4899',
    instructions: 'Call 911. Locate nearest AED. Begin CPR if trained. Do NOT move the person unless in danger.',
    priority: 7,
  },
  earthquake: {
    label: 'Earthquake',
    icon: 'Activity',
    color: '#8B5CF6',
    instructions: 'DROP, COVER, HOLD ON. Stay away from windows. After shaking stops, evacuate. Watch for aftershocks.',
    priority: 8,
  },
  flood: {
    label: 'Flood',
    icon: 'Waves',
    color: '#0EA5E9',
    instructions: 'Move to higher ground. Avoid walking/driving through flood water. Turn off utilities if safe.',
    priority: 9,
  },
  power_outage: {
    label: 'Power Outage',
    icon: 'ZapOff',
    color: '#6B7280',
    instructions: 'Stay calm. Use flashlights (not candles). Check on personnel. Secure sensitive equipment.',
    priority: 10,
  },
  structural_collapse: {
    label: 'Structural Collapse',
    icon: 'Building',
    color: '#92400E',
    instructions: 'Evacuate immediately. Call 911. Do NOT re-enter. Account for all personnel at assembly point.',
    priority: 11,
  },
  other: {
    label: 'Other Emergency',
    icon: 'AlertTriangle',
    color: '#6B7280',
    instructions: 'Follow facility emergency procedures. Alert management. Call 911 if needed.',
    priority: 12,
  },
};

export const EMERGENCY_EVENT_STATUS_LABELS: Record<EmergencyEventStatus, string> = {
  initiated: 'Initiated',
  in_progress: 'In Progress',
  all_clear: 'All Clear',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export const EMERGENCY_EVENT_STATUS_COLORS: Record<EmergencyEventStatus, string> = {
  initiated: '#EF4444',
  in_progress: '#F59E0B',
  all_clear: '#3B82F6',
  resolved: '#10B981',
  cancelled: '#6B7280',
};

export const EMERGENCY_SEVERITY_LABELS: Record<EmergencyEventSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const EMERGENCY_SEVERITY_COLORS: Record<EmergencyEventSeverity, string> = {
  critical: '#DC2626',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#3B82F6',
};
