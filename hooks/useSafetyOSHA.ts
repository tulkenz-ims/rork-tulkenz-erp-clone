import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Types
export type SeverityLevel = 'minor' | 'moderate' | 'serious' | 'severe' | 'fatal';
export type AccidentType = 'slip_trip_fall' | 'struck_by' | 'caught_in' | 'contact_with' | 'overexertion' | 'exposure' | 'vehicle' | 'equipment' | 'ergonomic' | 'other';
export type ContributingFactor = 'unsafe_act' | 'unsafe_condition' | 'equipment_failure' | 'lack_of_training' | 'ppe_issue' | 'procedure_violation' | 'environmental' | 'human_error' | 'supervision' | 'other';

export interface AccidentInvestigation {
  id: string;
  investigation_number: string;
  incident_date: string;
  incident_time: string;
  report_date: string;
  location: string;
  specific_location: string;
  department: string;
  injured_employee: string;
  employee_id: string;
  job_title: string;
  supervisor: string;
  accident_type: AccidentType;
  severity: SeverityLevel;
  description: string;
  immediate_cause: string;
  contributing_factors: ContributingFactor[];
  root_cause_analysis: string;
  witnesses: string[];
  witness_statements: string;
  evidence_collected: string[];
  photos_attached: boolean;
  diagrams_attached: boolean;
  equipment_involved: string;
  ppe_worn: string;
  ppe_adequate: boolean;
  training_adequate: boolean;
  procedures_followed: boolean;
  corrective_actions: string;
  preventive_measures: string;
  responsible_party: string;
  target_completion_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';
  investigated_by: string;
  investigated_by_id: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
}

export type InjuryType = 'cut' | 'scrape' | 'burn' | 'bruise' | 'sprain' | 'strain' | 'eye_injury' | 'insect_bite' | 'splinter' | 'headache' | 'nausea' | 'other';
export type TreatmentType = 'bandage' | 'ice_pack' | 'antiseptic' | 'burn_treatment' | 'eye_wash' | 'splint' | 'medication' | 'cpr_aed' | 'other';

export interface FirstAidEntry {
  id: string;
  entry_number: string;
  date: string;
  time: string;
  employee_name: string;
  employee_id: string;
  department: string;
  location: string;
  injury_type: InjuryType;
  injury_description: string;
  body_part: string;
  treatment_provided: TreatmentType[];
  treatment_details: string;
  administered_by: string;
  administered_by_id: string;
  follow_up_required: boolean;
  follow_up_notes: string;
  returned_to_work: boolean;
  sent_for_medical: boolean;
  medical_facility: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
}

export type OSHA300InjuryType = 'injury' | 'skin_disorder' | 'respiratory' | 'poisoning' | 'hearing_loss' | 'other_illness';
export type OutcomeType = 'death' | 'days_away' | 'job_transfer' | 'other_recordable';

export interface OSHA300Entry {
  id: string;
  case_number: string;
  employee_name: string;
  job_title: string;
  date_of_injury: string;
  where_occurred: string;
  description: string;
  classify_case: OSHA300InjuryType;
  outcome: OutcomeType;
  death: boolean;
  days_away_from_work: number;
  days_job_transfer: number;
  injury: boolean;
  skin_disorder: boolean;
  respiratory: boolean;
  poisoning: boolean;
  hearing_loss: boolean;
  other_illness: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  entered_by: string;
  entered_by_id: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  year: number;
  created_at: string;
}

export type Gender = 'male' | 'female' | 'other';
export type OSHA301TreatmentType = 'first_aid' | 'medical_treatment' | 'hospitalization' | 'emergency_room' | 'none';

export interface OSHA301Form {
  id: string;
  form_number: string;
  case_number: string;
  establishment_name: string;
  establishment_address: string;
  employee_name: string;
  employee_address: string;
  employee_dob: string;
  employee_gender: Gender;
  employee_hire_date: string;
  job_title: string;
  department: string;
  date_of_injury: string;
  time_of_injury: string;
  time_began_work: string;
  incident_location: string;
  what_happened: string;
  object_substance: string;
  injury_illness_type: OSHA300InjuryType;
  body_parts_affected: string;
  treatment_received: OSHA301TreatmentType;
  treatment_facility: string;
  treatment_facility_address: string;
  hospitalized_overnight: boolean;
  emergency_room: boolean;
  days_away_from_work: number;
  days_job_transfer: number;
  physician_name: string;
  physician_phone: string;
  completed_by: string;
  completed_by_title: string;
  completed_by_phone: string;
  completion_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  entered_by: string;
  entered_by_id: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

// Accident Investigation Hooks
export function useAccidentInvestigations() {
  return useQuery({
    queryKey: ['accident-investigations'],
    queryFn: async () => {
      console.log('[useAccidentInvestigations] Fetching investigations');
      const { data, error } = await supabase
        .from('accident_investigations')
        .select('*')
        .order('incident_date', { ascending: false });

      if (error) {
        console.error('[useAccidentInvestigations] Error:', error);
        throw error;
      }
      console.log('[useAccidentInvestigations] Fetched:', data?.length);
      return (data || []) as AccidentInvestigation[];
    },
  });
}

export function useCreateAccidentInvestigation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (investigation: Omit<AccidentInvestigation, 'id' | 'created_at'>) => {
      console.log('[useCreateAccidentInvestigation] Creating investigation');
      const { data, error } = await supabase
        .from('accident_investigations')
        .insert([{
          ...investigation,
          investigated_by: user?.email || 'Unknown',
          investigated_by_id: user?.id || '',
        }])
        .select()
        .single();

      if (error) {
        console.error('[useCreateAccidentInvestigation] Error:', error);
        throw error;
      }
      console.log('[useCreateAccidentInvestigation] Created:', data?.investigation_number);
      return data as AccidentInvestigation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accident-investigations'] });
    },
  });
}

// First Aid Log Hooks
export function useFirstAidEntries() {
  return useQuery({
    queryKey: ['first-aid-entries'],
    queryFn: async () => {
      console.log('[useFirstAidEntries] Fetching entries');
      const { data, error } = await supabase
        .from('first_aid_log')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('[useFirstAidEntries] Error:', error);
        throw error;
      }
      console.log('[useFirstAidEntries] Fetched:', data?.length);
      return (data || []) as FirstAidEntry[];
    },
  });
}

export function useCreateFirstAidEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<FirstAidEntry, 'id' | 'created_at'>) => {
      console.log('[useCreateFirstAidEntry] Creating entry');
      const { data, error } = await supabase
        .from('first_aid_log')
        .insert([{
          ...entry,
          administered_by: user?.email || 'Unknown',
          administered_by_id: user?.id || '',
        }])
        .select()
        .single();

      if (error) {
        console.error('[useCreateFirstAidEntry] Error:', error);
        throw error;
      }
      console.log('[useCreateFirstAidEntry] Created:', data?.entry_number);
      return data as FirstAidEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['first-aid-entries'] });
    },
  });
}

// OSHA 300 Hooks
export function useOSHA300Entries(year?: number) {
  return useQuery({
    queryKey: ['osha-300-entries', year],
    queryFn: async () => {
      console.log('[useOSHA300Entries] Fetching entries for year:', year);
      let query = supabase
        .from('osha_300_log')
        .select('*')
        .order('case_number', { ascending: true });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useOSHA300Entries] Error:', error);
        throw error;
      }
      console.log('[useOSHA300Entries] Fetched:', data?.length);
      return (data || []) as OSHA300Entry[];
    },
  });
}

export function useCreateOSHA300Entry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<OSHA300Entry, 'id' | 'created_at'>) => {
      console.log('[useCreateOSHA300Entry] Creating entry');
      const { data, error } = await supabase
        .from('osha_300_log')
        .insert([{
          ...entry,
          entered_by: user?.email || 'Unknown',
          entered_by_id: user?.id || '',
        }])
        .select()
        .single();

      if (error) {
        console.error('[useCreateOSHA300Entry] Error:', error);
        throw error;
      }
      console.log('[useCreateOSHA300Entry] Created case:', data?.case_number);
      return data as OSHA300Entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-300-entries'] });
    },
  });
}

// OSHA 301 Hooks
export function useOSHA301Forms() {
  return useQuery({
    queryKey: ['osha-301-forms'],
    queryFn: async () => {
      console.log('[useOSHA301Forms] Fetching forms');
      const { data, error } = await supabase
        .from('osha_301_forms')
        .select('*')
        .order('date_of_injury', { ascending: false });

      if (error) {
        console.error('[useOSHA301Forms] Error:', error);
        throw error;
      }
      console.log('[useOSHA301Forms] Fetched:', data?.length);
      return (data || []) as OSHA301Form[];
    },
  });
}

export function useCreateOSHA301Form() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (form: Omit<OSHA301Form, 'id' | 'created_at'>) => {
      console.log('[useCreateOSHA301Form] Creating form');
      const { data, error } = await supabase
        .from('osha_301_forms')
        .insert([{
          ...form,
          entered_by: user?.email || 'Unknown',
          entered_by_id: user?.id || '',
        }])
        .select()
        .single();

      if (error) {
        console.error('[useCreateOSHA301Form] Error:', error);
        throw error;
      }
      console.log('[useCreateOSHA301Form] Created:', data?.form_number);
      return data as OSHA301Form;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['osha-301-forms'] });
    },
  });
}
