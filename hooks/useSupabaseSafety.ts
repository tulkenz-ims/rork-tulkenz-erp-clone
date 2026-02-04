import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type IncidentType = 'injury' | 'illness' | 'near_miss' | 'property_damage' | 'environmental' | 'vehicle' | 'other';
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical' | 'fatality';
export type IncidentStatus = 'reported' | 'under_investigation' | 'pending_review' | 'closed' | 'reopened';
export type BodyPart = 'head' | 'neck' | 'back' | 'chest' | 'abdomen' | 'arm' | 'hand' | 'leg' | 'foot' | 'multiple' | 'other';
export type InjuryType = 'cut' | 'burn' | 'fracture' | 'sprain' | 'strain' | 'contusion' | 'amputation' | 'chemical_exposure' | 'other';

export type PermitType = 'loto' | 'confined_space' | 'hot_work' | 'fall_protection' | 'electrical' | 'line_break' | 'excavation' | 'roof_access' | 'chemical_handling' | 'temporary_equipment';
export type PermitStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled' | 'expired';

export type SafetyInspectionType = 'daily_walk' | 'monthly' | 'equipment' | 'fire_safety' | 'ppe' | 'forklift' | 'ladder' | 'electrical' | 'emergency' | 'eyewash' | 'first_aid' | 'aed' | 'fire_extinguisher' | 'fall_protection' | 'compressed_gas' | 'electrical_panel' | 'ammonia' | 'other';
export type SafetyInspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SafetyInspectionResult = 'pass' | 'fail' | 'conditional' | 'needs_attention';

export type TrainingType = 'safety_orientation' | 'loto' | 'forklift' | 'confined_space' | 'first_aid' | 'hazmat' | 'ppe' | 'emergency' | 'annual_refresher' | 'job_specific' | 'fall_protection' | 'hearing_conservation' | 'new_employee' | 'cpr_aed' | 'other';
export type TrainingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked';

export type PPERecordType = 'issue' | 'inspection' | 'hazard_assessment';
export type PPECondition = 'new' | 'good' | 'fair' | 'poor' | 'needs_replacement';

export type ChemicalRecordType = 'inventory' | 'approval' | 'handling' | 'exposure' | 'sds_receipt' | 'sds_index';
export type ChemicalApprovalStatus = 'pending' | 'approved' | 'rejected' | 'restricted';
export type SignalWord = 'danger' | 'warning' | 'none';

export type EmergencyRecordType = 'drill' | 'evacuation' | 'fire_drill' | 'tornado_drill' | 'action_plan' | 'contacts' | 'equipment_map' | 'assembly_headcount';

export interface SafetyIncident {
  id: string;
  organization_id: string;
  incident_number: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  facility_id: string | null;
  location: string | null;
  department_code: string | null;
  department_name: string | null;
  incident_date: string;
  incident_time: string | null;
  reported_date: string;
  reported_by: string;
  reported_by_id: string | null;
  description: string;
  immediate_actions: string | null;
  injured_employee_id: string | null;
  injured_employee_name: string | null;
  injury_type: InjuryType | null;
  body_part: BodyPart | null;
  medical_treatment: string | null;
  days_away: number | null;
  restricted_days: number | null;
  witnesses: string[];
  root_cause: string | null;
  contributing_factors: string[];
  corrective_actions: string | null;
  preventive_actions: string | null;
  osha_recordable: boolean;
  osha_form_completed: boolean;
  investigation_lead: string | null;
  investigation_lead_id: string | null;
  investigation_date: string | null;
  investigation_notes: string | null;
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyPermit {
  id: string;
  organization_id: string;
  permit_number: string;
  permit_type: PermitType;
  status: PermitStatus;
  facility_id: string | null;
  location: string | null;
  department_code: string | null;
  work_description: string;
  hazards_identified: string[];
  precautions_required: string[];
  ppe_required: string[];
  start_date: string;
  start_time: string | null;
  end_date: string;
  end_time: string | null;
  requested_by: string;
  requested_by_id: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  contractor_name: string | null;
  contractor_company: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  equipment_isolated: string[];
  energy_sources: string[];
  lockout_points: string[];
  verification_steps: string[];
  completed_by: string | null;
  completed_by_id: string | null;
  completed_date: string | null;
  cancellation_reason: string | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyInspection {
  id: string;
  organization_id: string;
  inspection_number: string;
  inspection_type: SafetyInspectionType;
  status: SafetyInspectionStatus;
  result: SafetyInspectionResult | null;
  facility_id: string | null;
  location: string | null;
  area_inspected: string | null;
  scheduled_date: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_id: string | null;
  checklist_items: any[];
  findings: any[];
  deficiencies_found: number;
  corrective_actions_required: boolean;
  corrective_actions: string | null;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  score: number | null;
  attachments: any[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyTraining {
  id: string;
  organization_id: string;
  training_id: string;
  training_type: TrainingType;
  title: string;
  description: string | null;
  status: TrainingStatus;
  facility_id: string | null;
  scheduled_date: string | null;
  completion_date: string | null;
  instructor_name: string | null;
  instructor_id: string | null;
  duration_hours: number | null;
  location: string | null;
  max_attendees: number | null;
  attendees: any[];
  materials: string[];
  quiz_required: boolean;
  quiz_passing_score: number | null;
  certification_valid_months: number | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyCertification {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  certification_type: TrainingType;
  certification_name: string;
  status: CertificationStatus;
  issue_date: string;
  expiration_date: string | null;
  issuing_authority: string | null;
  certificate_number: string | null;
  training_id: string | null;
  renewal_required: boolean;
  renewal_reminder_sent: boolean;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyPPERecord {
  id: string;
  organization_id: string;
  record_number: string;
  record_type: PPERecordType;
  employee_id: string | null;
  employee_name: string | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  ppe_type: string;
  ppe_items: any[];
  issue_date: string | null;
  inspection_date: string | null;
  condition: PPECondition | null;
  result: SafetyInspectionResult | null;
  hazards_identified: string[];
  ppe_required: string[];
  job_task: string | null;
  location: string | null;
  issued_by: string | null;
  issued_by_id: string | null;
  inspector_name: string | null;
  inspector_id: string | null;
  employee_signature: boolean;
  notes: string | null;
  next_inspection_date: string | null;
  attachments: any[];
  created_at: string;
  updated_at: string;
}

export interface SafetyChemicalRecord {
  id: string;
  organization_id: string;
  record_number: string;
  record_type: ChemicalRecordType;
  facility_id: string | null;
  location: string | null;
  department_code: string | null;
  department_name: string | null;
  chemical_name: string;
  manufacturer: string | null;
  product_code: string | null;
  cas_number: string | null;
  hazard_class: string[];
  ghs_pictograms: string[];
  signal_word: SignalWord | null;
  quantity: number | null;
  unit_of_measure: string | null;
  storage_location: string | null;
  storage_requirements: string[];
  ppe_required: string[];
  handling_procedures: string | null;
  emergency_procedures: string | null;
  sds_date: string | null;
  sds_received_date: string | null;
  sds_location: string | null;
  approval_status: ChemicalApprovalStatus | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  exposure_date: string | null;
  exposure_type: string | null;
  exposure_duration: string | null;
  exposure_level: string | null;
  employee_id: string | null;
  employee_name: string | null;
  medical_attention: boolean;
  reported_by: string | null;
  reported_by_id: string | null;
  notes: string | null;
  attachments: any[];
  created_at: string;
  updated_at: string;
}

export interface SafetyEmergencyRecord {
  id: string;
  organization_id: string;
  record_number: string;
  record_type: EmergencyRecordType;
  facility_id: string | null;
  location: string | null;
  department_code: string | null;
  department_name: string | null;
  drill_date: string | null;
  drill_time: string | null;
  drill_type: string | null;
  drill_scenario: string | null;
  evacuation_time_minutes: number | null;
  total_participants: number | null;
  total_accounted: number | null;
  missing_count: number;
  assembly_point: string | null;
  alarm_activation_time: string | null;
  all_clear_time: string | null;
  weather_conditions: string | null;
  issues_identified: string[];
  corrective_actions: string | null;
  conducted_by: string | null;
  conducted_by_id: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  contacts: any[];
  equipment_locations: any[];
  headcount_data: any[];
  notes: string | null;
  attachments: any[];
  created_at: string;
  updated_at: string;
}

type CreateIncidentInput = Omit<SafetyIncident, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreatePermitInput = Omit<SafetyPermit, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateInspectionInput = Omit<SafetyInspection, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateTrainingInput = Omit<SafetyTraining, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateCertificationInput = Omit<SafetyCertification, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreatePPERecordInput = Omit<SafetyPPERecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateChemicalRecordInput = Omit<SafetyChemicalRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateEmergencyRecordInput = Omit<SafetyEmergencyRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseSafety() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Incidents
  const incidentsQuery = useQuery({
    queryKey: ['safety_incidents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching safety incidents');

      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('incident_date', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching incidents:', error.message);
        return [];
      }
      return (data || []) as SafetyIncident[];
    },
    enabled: !!organizationId,
  });

  const openIncidentsQuery = useQuery({
    queryKey: ['safety_incidents', 'open', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching open safety incidents');

      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'closed')
        .order('severity', { ascending: true })
        .order('incident_date', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching open incidents:', error.message);
        return [];
      }
      return (data || []) as SafetyIncident[];
    },
    enabled: !!organizationId,
  });

  // Permits
  const permitsQuery = useQuery({
    queryKey: ['safety_permits', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching safety permits');

      const { data, error } = await supabase
        .from('safety_permits')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching permits:', error.message);
        return [];
      }
      return (data || []) as SafetyPermit[];
    },
    enabled: !!organizationId,
  });

  const activePermitsQuery = useQuery({
    queryKey: ['safety_permits', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching active safety permits');

      const { data, error } = await supabase
        .from('safety_permits')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'approved'])
        .order('start_date', { ascending: true });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching active permits:', error.message);
        return [];
      }
      return (data || []) as SafetyPermit[];
    },
    enabled: !!organizationId,
  });

  // Inspections
  const inspectionsQuery = useQuery({
    queryKey: ['safety_inspections', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching safety inspections');

      const { data, error } = await supabase
        .from('safety_inspections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('inspection_date', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching inspections:', error.message);
        return [];
      }
      return (data || []) as SafetyInspection[];
    },
    enabled: !!organizationId,
  });

  // Trainings
  const trainingsQuery = useQuery({
    queryKey: ['safety_trainings', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching safety trainings');

      const { data, error } = await supabase
        .from('safety_trainings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching trainings:', error.message);
        return [];
      }
      return (data || []) as SafetyTraining[];
    },
    enabled: !!organizationId,
  });

  // Certifications
  const certificationsQuery = useQuery({
    queryKey: ['safety_certifications', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching safety certifications');

      const { data, error } = await supabase
        .from('safety_certifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('expiration_date', { ascending: true });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching certifications:', error.message);
        return [];
      }
      return (data || []) as SafetyCertification[];
    },
    enabled: !!organizationId,
  });

  // PPE Records
  const ppeRecordsQuery = useQuery({
    queryKey: ['safety_ppe_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching PPE records');

      const { data, error } = await supabase
        .from('safety_ppe_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching PPE records:', error.message);
        return [];
      }
      return (data || []) as SafetyPPERecord[];
    },
    enabled: !!organizationId,
  });

  // Chemical Records
  const chemicalRecordsQuery = useQuery({
    queryKey: ['safety_chemical_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching chemical records');

      const { data, error } = await supabase
        .from('safety_chemical_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching chemical records:', error.message);
        return [];
      }
      return (data || []) as SafetyChemicalRecord[];
    },
    enabled: !!organizationId,
  });

  // Emergency Records
  const emergencyRecordsQuery = useQuery({
    queryKey: ['safety_emergency_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseSafety] Fetching emergency records');

      const { data, error } = await supabase
        .from('safety_emergency_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useSupabaseSafety] Error fetching emergency records:', error.message);
        return [];
      }
      return (data || []) as SafetyEmergencyRecord[];
    },
    enabled: !!organizationId,
  });

  // Mutations - Incidents
  const createIncidentMutation = useMutation({
    mutationFn: async (input: CreateIncidentInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating incident:', input.incident_number);

      const { data, error } = await supabase
        .from('safety_incidents')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_incidents'] });
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyIncident> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating incident:', id);

      const { data, error } = await supabase
        .from('safety_incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_incidents'] });
    },
  });

  // Mutations - Permits
  const createPermitMutation = useMutation({
    mutationFn: async (input: CreatePermitInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating permit:', input.permit_number);

      const { data, error } = await supabase
        .from('safety_permits')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  const updatePermitMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyPermit> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating permit:', id);

      const { data, error } = await supabase
        .from('safety_permits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyPermit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_permits'] });
    },
  });

  // Mutations - Inspections
  const createInspectionMutation = useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating inspection:', input.inspection_number);

      const { data, error } = await supabase
        .from('safety_inspections')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_inspections'] });
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyInspection> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating inspection:', id);

      const { data, error } = await supabase
        .from('safety_inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_inspections'] });
    },
  });

  // Mutations - Trainings
  const createTrainingMutation = useMutation({
    mutationFn: async (input: CreateTrainingInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating training:', input.training_id);

      const { data, error } = await supabase
        .from('safety_trainings')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyTraining;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_trainings'] });
    },
  });

  const updateTrainingMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyTraining> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating training:', id);

      const { data, error } = await supabase
        .from('safety_trainings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyTraining;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_trainings'] });
    },
  });

  // Mutations - Certifications
  const createCertificationMutation = useMutation({
    mutationFn: async (input: CreateCertificationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating certification');

      const { data, error } = await supabase
        .from('safety_certifications')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyCertification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_certifications'] });
    },
  });

  const updateCertificationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyCertification> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating certification:', id);

      const { data, error } = await supabase
        .from('safety_certifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyCertification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_certifications'] });
    },
  });

  // Mutations - PPE Records
  const createPPERecordMutation = useMutation({
    mutationFn: async (input: CreatePPERecordInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating PPE record:', input.record_number);

      const { data, error } = await supabase
        .from('safety_ppe_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyPPERecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_ppe_records'] });
    },
  });

  const updatePPERecordMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyPPERecord> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating PPE record:', id);

      const { data, error } = await supabase
        .from('safety_ppe_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyPPERecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_ppe_records'] });
    },
  });

  // Mutations - Chemical Records
  const createChemicalRecordMutation = useMutation({
    mutationFn: async (input: CreateChemicalRecordInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating chemical record:', input.record_number);

      const { data, error } = await supabase
        .from('safety_chemical_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyChemicalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_chemical_records'] });
    },
  });

  const updateChemicalRecordMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyChemicalRecord> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating chemical record:', id);

      const { data, error } = await supabase
        .from('safety_chemical_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyChemicalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_chemical_records'] });
    },
  });

  // Mutations - Emergency Records
  const createEmergencyRecordMutation = useMutation({
    mutationFn: async (input: CreateEmergencyRecordInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSafety] Creating emergency record:', input.record_number);

      const { data, error } = await supabase
        .from('safety_emergency_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyEmergencyRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_emergency_records'] });
    },
  });

  const updateEmergencyRecordMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SafetyEmergencyRecord> & { id: string }) => {
      console.log('[useSupabaseSafety] Updating emergency record:', id);

      const { data, error } = await supabase
        .from('safety_emergency_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyEmergencyRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety_emergency_records'] });
    },
  });

  // Number generators
  const generateIncidentNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INC-${year}${month}-${random}`;
  };

  const generatePermitNumber = (type: PermitType) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefix = type.toUpperCase().replace('_', '');
    return `${prefix}-${year}${month}-${random}`;
  };

  const generateInspectionNumber = (type?: string) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefix = type ? type.toUpperCase().slice(0, 4) : 'INSP';
    return `${prefix}-${year}${month}-${random}`;
  };

  const generateTrainingNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRN-${year}${month}-${random}`;
  };

  const generatePPERecordNumber = (type: PPERecordType) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefix = type === 'issue' ? 'PPEI' : type === 'inspection' ? 'PPEINSP' : 'PPEHA';
    return `${prefix}-${year}${month}-${random}`;
  };

  const generateChemicalRecordNumber = (type: ChemicalRecordType) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefixMap: Record<ChemicalRecordType, string> = {
      inventory: 'CHEMINV',
      approval: 'CHEMAPP',
      handling: 'CHEMHDL',
      exposure: 'CHEMEXP',
      sds_receipt: 'SDSRCPT',
      sds_index: 'SDSIDX',
    };
    return `${prefixMap[type]}-${year}${month}-${random}`;
  };

  const generateEmergencyRecordNumber = (type: EmergencyRecordType) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const prefixMap: Record<EmergencyRecordType, string> = {
      drill: 'EMDRL',
      evacuation: 'EMEVAC',
      fire_drill: 'FIREDRL',
      tornado_drill: 'TORNDRL',
      action_plan: 'EMAP',
      contacts: 'EMCON',
      equipment_map: 'EMEQP',
      assembly_headcount: 'EMHC',
    };
    return `${prefixMap[type]}-${year}${month}-${random}`;
  };

  // Utility functions
  const getDaysWithoutIncident = () => {
    const incidents = incidentsQuery.data || [];
    const recordableIncidents = incidents.filter(i => i.osha_recordable && i.incident_type === 'injury');
    if (recordableIncidents.length === 0) return 365;
    
    const lastIncident = recordableIncidents.sort((a, b) => 
      new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime()
    )[0];
    
    const daysSince = Math.floor((Date.now() - new Date(lastIncident.incident_date).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince;
  };

  const getExpiringCertifications = (daysAhead: number = 30) => {
    const certs = certificationsQuery.data || [];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return certs.filter(cert => 
      cert.expiration_date &&
      new Date(cert.expiration_date) <= futureDate &&
      cert.status !== 'expired' &&
      cert.status !== 'revoked'
    );
  };

  return {
    // Data
    incidents: incidentsQuery.data || [],
    openIncidents: openIncidentsQuery.data || [],
    permits: permitsQuery.data || [],
    activePermits: activePermitsQuery.data || [],
    inspections: inspectionsQuery.data || [],
    trainings: trainingsQuery.data || [],
    certifications: certificationsQuery.data || [],
    ppeRecords: ppeRecordsQuery.data || [],
    chemicalRecords: chemicalRecordsQuery.data || [],
    emergencyRecords: emergencyRecordsQuery.data || [],

    // Loading states
    isLoading: incidentsQuery.isLoading || permitsQuery.isLoading || inspectionsQuery.isLoading,
    isLoadingIncidents: incidentsQuery.isLoading,
    isLoadingPermits: permitsQuery.isLoading,
    isLoadingInspections: inspectionsQuery.isLoading,
    isLoadingTrainings: trainingsQuery.isLoading,
    isLoadingCertifications: certificationsQuery.isLoading,
    isLoadingPPE: ppeRecordsQuery.isLoading,
    isLoadingChemical: chemicalRecordsQuery.isLoading,
    isLoadingEmergency: emergencyRecordsQuery.isLoading,

    // Mutations
    createIncident: createIncidentMutation.mutateAsync,
    updateIncident: updateIncidentMutation.mutateAsync,
    createPermit: createPermitMutation.mutateAsync,
    updatePermit: updatePermitMutation.mutateAsync,
    createInspection: createInspectionMutation.mutateAsync,
    updateInspection: updateInspectionMutation.mutateAsync,
    createTraining: createTrainingMutation.mutateAsync,
    updateTraining: updateTrainingMutation.mutateAsync,
    createCertification: createCertificationMutation.mutateAsync,
    updateCertification: updateCertificationMutation.mutateAsync,
    createPPERecord: createPPERecordMutation.mutateAsync,
    updatePPERecord: updatePPERecordMutation.mutateAsync,
    createChemicalRecord: createChemicalRecordMutation.mutateAsync,
    updateChemicalRecord: updateChemicalRecordMutation.mutateAsync,
    createEmergencyRecord: createEmergencyRecordMutation.mutateAsync,
    updateEmergencyRecord: updateEmergencyRecordMutation.mutateAsync,

    // Mutation states
    isCreatingIncident: createIncidentMutation.isPending,
    isUpdatingIncident: updateIncidentMutation.isPending,
    isCreatingPermit: createPermitMutation.isPending,
    isUpdatingPermit: updatePermitMutation.isPending,
    isCreatingInspection: createInspectionMutation.isPending,
    isUpdatingInspection: updateInspectionMutation.isPending,
    isCreatingTraining: createTrainingMutation.isPending,
    isUpdatingTraining: updateTrainingMutation.isPending,
    isCreatingCertification: createCertificationMutation.isPending,
    isUpdatingCertification: updateCertificationMutation.isPending,
    isCreatingPPERecord: createPPERecordMutation.isPending,
    isUpdatingPPERecord: updatePPERecordMutation.isPending,
    isCreatingChemicalRecord: createChemicalRecordMutation.isPending,
    isUpdatingChemicalRecord: updateChemicalRecordMutation.isPending,
    isCreatingEmergencyRecord: createEmergencyRecordMutation.isPending,
    isUpdatingEmergencyRecord: updateEmergencyRecordMutation.isPending,

    // Number generators
    generateIncidentNumber,
    generatePermitNumber,
    generateInspectionNumber,
    generateTrainingNumber,
    generatePPERecordNumber,
    generateChemicalRecordNumber,
    generateEmergencyRecordNumber,

    // Utility functions
    getDaysWithoutIncident,
    getExpiringCertifications,

    // Refetch
    refetch: () => {
      incidentsQuery.refetch();
      openIncidentsQuery.refetch();
      permitsQuery.refetch();
      activePermitsQuery.refetch();
      inspectionsQuery.refetch();
      trainingsQuery.refetch();
      certificationsQuery.refetch();
      ppeRecordsQuery.refetch();
      chemicalRecordsQuery.refetch();
      emergencyRecordsQuery.refetch();
    },
  };
}
