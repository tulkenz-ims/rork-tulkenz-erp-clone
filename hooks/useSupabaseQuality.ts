import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type NCRType = 'product' | 'process' | 'supplier' | 'customer' | 'internal' | 'regulatory';
export type NCRSeverity = 'minor' | 'major' | 'critical';
export type NCRStatus = 'open' | 'investigation' | 'containment' | 'root_cause' | 'corrective_action' | 'verification' | 'closed' | 'rejected';
export type NCRSource = 'incoming_inspection' | 'in_process' | 'final_inspection' | 'customer_complaint' | 'audit' | 'supplier' | 'internal' | 'other';
export type NCRDisposition = 'use_as_is' | 'rework' | 'scrap' | 'return_to_supplier' | 'downgrade' | 'hold' | 'other';

export type CAPAType = 'corrective' | 'preventive' | 'both';
export type CAPAPriority = 'low' | 'medium' | 'high' | 'critical';
export type CAPAStatus = 'open' | 'investigation' | 'action_planning' | 'implementation' | 'verification' | 'effectiveness_review' | 'closed' | 'cancelled';
export type CAPASource = 'ncr' | 'audit' | 'customer_complaint' | 'near_miss' | 'trend_analysis' | 'management_review' | 'regulatory' | 'other';
export type RootCauseMethod = '5_whys' | 'fishbone' | 'fmea' | 'fault_tree' | 'pareto' | 'other';

export type ComplaintType = 'product_quality' | 'foreign_material' | 'allergen' | 'labeling' | 'packaging' | 'delivery' | 'service' | 'safety' | 'other';
export type ComplaintStatus = 'new' | 'acknowledged' | 'investigation' | 'resolution' | 'closed' | 'rejected';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ResolutionType = 'replacement' | 'refund' | 'credit' | 'apology' | 'no_action' | 'other';

export type DeviationType = 'planned' | 'unplanned';
export type DeviationCategory = 'process' | 'equipment' | 'material' | 'environmental' | 'documentation' | 'other';
export type DeviationStatus = 'open' | 'pending_approval' | 'approved' | 'rejected' | 'implemented' | 'closed';

export type InspectionType = 'incoming' | 'in_process' | 'final' | 'pre_shipment' | 'first_article' | 'periodic' | 'customer' | 'supplier' | 'audit';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InspectionResult = 'pass' | 'fail' | 'conditional' | 'pending';

export interface NCRRecord {
  id: string;
  organization_id: string;
  ncr_number: string;
  title: string;
  description: string;
  ncr_type: NCRType;
  severity: NCRSeverity;
  status: NCRStatus;
  source: NCRSource | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  quantity_affected: number | null;
  unit_of_measure: string | null;
  discovered_date: string;
  discovered_by: string;
  discovered_by_id: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  root_cause: string | null;
  root_cause_category: string | null;
  containment_actions: string | null;
  containment_date: string | null;
  corrective_actions: string | null;
  corrective_action_date: string | null;
  preventive_actions: string | null;
  verification_method: string | null;
  verification_date: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  disposition: NCRDisposition | null;
  disposition_notes: string | null;
  cost_impact: number | null;
  customer_notified: boolean;
  customer_notification_date: string | null;
  capa_required: boolean;
  capa_id: string | null;
  attachments: any[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CAPARecord {
  id: string;
  organization_id: string;
  capa_number: string;
  title: string;
  description: string;
  capa_type: CAPAType;
  priority: CAPAPriority;
  status: CAPAStatus;
  source: CAPASource | null;
  source_reference: string | null;
  source_id: string | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  initiated_date: string;
  initiated_by: string;
  initiated_by_id: string | null;
  owner: string | null;
  owner_id: string | null;
  problem_statement: string | null;
  immediate_containment: string | null;
  root_cause_analysis: string | null;
  root_cause_method: RootCauseMethod | null;
  root_cause_summary: string | null;
  action_plan: any[];
  target_completion_date: string | null;
  actual_completion_date: string | null;
  verification_plan: string | null;
  verification_results: string | null;
  verification_date: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  effectiveness_criteria: string | null;
  effectiveness_review_date: string | null;
  effectiveness_results: string | null;
  effectiveness_verified_by: string | null;
  effectiveness_verified_by_id: string | null;
  is_effective: boolean | null;
  recurrence_check_date: string | null;
  recurrence_notes: string | null;
  related_ncrs: string[];
  related_capas: string[];
  attachments: any[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerComplaint {
  id: string;
  organization_id: string;
  complaint_number: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  complaint_type: ComplaintType;
  customer_name: string;
  customer_contact: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  received_date: string;
  received_by: string;
  received_by_id: string | null;
  received_method: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  purchase_date: string | null;
  purchase_location: string | null;
  complaint_description: string;
  sample_available: boolean;
  sample_received_date: string | null;
  illness_reported: boolean;
  injury_reported: boolean;
  medical_attention_sought: boolean;
  regulatory_notification_required: boolean;
  regulatory_notification_date: string | null;
  facility_id: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  investigation_summary: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  customer_response: string | null;
  customer_response_date: string | null;
  resolution_type: ResolutionType | null;
  resolution_notes: string | null;
  ncr_id: string | null;
  ncr_number: string | null;
  capa_id: string | null;
  capa_number: string | null;
  attachments: any[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviationRecord {
  id: string;
  organization_id: string;
  deviation_number: string;
  title: string;
  description: string;
  deviation_type: DeviationType;
  category: DeviationCategory | null;
  severity: NCRSeverity;
  status: DeviationStatus;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  process_affected: string | null;
  product_affected: string | null;
  lot_numbers_affected: string[];
  start_date: string;
  end_date: string | null;
  duration_hours: number | null;
  requested_by: string;
  requested_by_id: string | null;
  justification: string | null;
  risk_assessment: string | null;
  mitigation_measures: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  impact_assessment: string | null;
  capa_required: boolean;
  capa_id: string | null;
  capa_number: string | null;
  attachments: any[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityInspection {
  id: string;
  organization_id: string;
  inspection_number: string;
  inspection_type: InspectionType;
  status: InspectionStatus;
  result: InspectionResult | null;
  facility_id: string | null;
  department_code: string | null;
  location: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity_inspected: number | null;
  quantity_accepted: number | null;
  quantity_rejected: number | null;
  sample_size: number | null;
  aql_level: string | null;
  scheduled_date: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_id: string | null;
  template_id: string | null;
  checklist_items: any[];
  measurements: any[];
  defects_found: any[];
  supplier_name: string | null;
  supplier_id: string | null;
  po_number: string | null;
  customer_name: string | null;
  order_number: string | null;
  ncr_required: boolean;
  ncr_id: string | null;
  ncr_number: string | null;
  attachments: any[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

type CreateNCRInput = Omit<NCRRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateCAPAInput = Omit<CAPARecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateComplaintInput = Omit<CustomerComplaint, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateDeviationInput = Omit<DeviationRecord, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateInspectionInput = Omit<QualityInspection, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseQuality() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // ==================== NCR Queries ====================
  const ncrsQuery = useQuery({
    queryKey: ['ncr_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching NCRs');

      const { data, error } = await supabase
        .from('ncr_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as NCRRecord[];
    },
    enabled: !!organizationId,
  });

  const openNCRsQuery = useQuery({
    queryKey: ['ncr_records', 'open', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching open NCRs');

      const { data, error } = await supabase
        .from('ncr_records')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'closed')
        .neq('status', 'rejected')
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as NCRRecord[];
    },
    enabled: !!organizationId,
  });

  // ==================== CAPA Queries ====================
  const capasQuery = useQuery({
    queryKey: ['capa_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching CAPAs');

      const { data, error } = await supabase
        .from('capa_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CAPARecord[];
    },
    enabled: !!organizationId,
  });

  const openCAPAsQuery = useQuery({
    queryKey: ['capa_records', 'open', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching open CAPAs');

      const { data, error } = await supabase
        .from('capa_records')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'closed')
        .neq('status', 'cancelled')
        .order('priority', { ascending: true })
        .order('target_completion_date', { ascending: true });

      if (error) throw error;
      return (data || []) as CAPARecord[];
    },
    enabled: !!organizationId,
  });

  // ==================== Customer Complaints Queries ====================
  const complaintsQuery = useQuery({
    queryKey: ['customer_complaints', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching customer complaints');

      const { data, error } = await supabase
        .from('customer_complaints')
        .select('*')
        .eq('organization_id', organizationId)
        .order('received_date', { ascending: false });

      if (error) throw error;
      return (data || []) as CustomerComplaint[];
    },
    enabled: !!organizationId,
  });

  // ==================== Deviations Queries ====================
  const deviationsQuery = useQuery({
    queryKey: ['deviation_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching deviations');

      const { data, error } = await supabase
        .from('deviation_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DeviationRecord[];
    },
    enabled: !!organizationId,
  });

  // ==================== Quality Inspections Queries ====================
  const inspectionsQuery = useQuery({
    queryKey: ['quality_inspections', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseQuality] Fetching quality inspections');

      const { data, error } = await supabase
        .from('quality_inspections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as QualityInspection[];
    },
    enabled: !!organizationId,
  });

  // ==================== NCR Mutations ====================
  const createNCRMutation = useMutation({
    mutationFn: async (input: CreateNCRInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQuality] Creating NCR:', input.ncr_number);

      const { data, error } = await supabase
        .from('ncr_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as NCRRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncr_records'] });
    },
  });

  const updateNCRMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NCRRecord> & { id: string }) => {
      console.log('[useSupabaseQuality] Updating NCR:', id);

      const { data, error } = await supabase
        .from('ncr_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NCRRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncr_records'] });
    },
  });

  const closeNCRMutation = useMutation({
    mutationFn: async ({ id, closedBy, closedById, notes }: { id: string; closedBy: string; closedById?: string; notes?: string }) => {
      console.log('[useSupabaseQuality] Closing NCR:', id);

      const { data, error } = await supabase
        .from('ncr_records')
        .update({
          status: 'closed' as NCRStatus,
          closed_date: new Date().toISOString().split('T')[0],
          closed_by: closedBy,
          closed_by_id: closedById || null,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NCRRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncr_records'] });
    },
  });

  // ==================== CAPA Mutations ====================
  const createCAPAMutation = useMutation({
    mutationFn: async (input: CreateCAPAInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQuality] Creating CAPA:', input.capa_number);

      const { data, error } = await supabase
        .from('capa_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as CAPARecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capa_records'] });
    },
  });

  const updateCAPAMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CAPARecord> & { id: string }) => {
      console.log('[useSupabaseQuality] Updating CAPA:', id);

      const { data, error } = await supabase
        .from('capa_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CAPARecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capa_records'] });
    },
  });

  const closeCAPAMutation = useMutation({
    mutationFn: async ({ id, closedBy, closedById, isEffective, notes }: { id: string; closedBy: string; closedById?: string; isEffective: boolean; notes?: string }) => {
      console.log('[useSupabaseQuality] Closing CAPA:', id);

      const { data, error } = await supabase
        .from('capa_records')
        .update({
          status: 'closed' as CAPAStatus,
          closed_date: new Date().toISOString().split('T')[0],
          closed_by: closedBy,
          closed_by_id: closedById || null,
          is_effective: isEffective,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CAPARecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capa_records'] });
    },
  });

  // ==================== Complaint Mutations ====================
  const createComplaintMutation = useMutation({
    mutationFn: async (input: CreateComplaintInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQuality] Creating complaint:', input.complaint_number);

      const { data, error } = await supabase
        .from('customer_complaints')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as CustomerComplaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_complaints'] });
    },
  });

  const updateComplaintMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerComplaint> & { id: string }) => {
      console.log('[useSupabaseQuality] Updating complaint:', id);

      const { data, error } = await supabase
        .from('customer_complaints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomerComplaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_complaints'] });
    },
  });

  // ==================== Deviation Mutations ====================
  const createDeviationMutation = useMutation({
    mutationFn: async (input: CreateDeviationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQuality] Creating deviation:', input.deviation_number);

      const { data, error } = await supabase
        .from('deviation_records')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as DeviationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviation_records'] });
    },
  });

  const updateDeviationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeviationRecord> & { id: string }) => {
      console.log('[useSupabaseQuality] Updating deviation:', id);

      const { data, error } = await supabase
        .from('deviation_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DeviationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviation_records'] });
    },
  });

  // ==================== Inspection Mutations ====================
  const createInspectionMutation = useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQuality] Creating inspection:', input.inspection_number);

      const { data, error } = await supabase
        .from('quality_inspections')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as QualityInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_inspections'] });
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualityInspection> & { id: string }) => {
      console.log('[useSupabaseQuality] Updating inspection:', id);

      const { data, error } = await supabase
        .from('quality_inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QualityInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_inspections'] });
    },
  });

  const completeInspectionMutation = useMutation({
    mutationFn: async ({ id, result, reviewedBy, reviewedById, notes, skipTaskFeedPost }: { id: string; result: InspectionResult; reviewedBy?: string; reviewedById?: string; notes?: string; skipTaskFeedPost?: boolean }) => {
      console.log('[useSupabaseQuality] Completing inspection:', id);

      // First fetch the existing inspection for Task Feed details
      const { data: existingInspection, error: fetchError } = await supabase
        .from('quality_inspections')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('[useSupabaseQuality] Error fetching inspection:', fetchError);
        throw fetchError;
      }

      const { data, error } = await supabase
        .from('quality_inspections')
        .update({
          status: 'completed' as InspectionStatus,
          result,
          inspection_date: new Date().toISOString().split('T')[0],
          reviewed_by: reviewedBy || null,
          reviewed_by_id: reviewedById || null,
          reviewed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Post to Task Feed unless explicitly skipped
      if (!skipTaskFeedPost && organizationId) {
        try {
          const resultLabel = result === 'pass' ? 'PASSED' : result === 'fail' ? 'FAILED' : result === 'conditional' ? 'CONDITIONAL' : 'PENDING';
          const status = result === 'fail' ? 'flagged' : 'verified';
          const inspectionNumber = existingInspection.inspection_number || `QI-${id.slice(0, 8)}`;
          const completedName = reviewedBy || 'System';
          
          const action = `Quality Inspection ${resultLabel}: ${existingInspection.inspection_type || 'General'}`;
          const categoryName = `Quality Inspection - ${(existingInspection.inspection_type || 'general').charAt(0).toUpperCase() + (existingInspection.inspection_type || 'general').slice(1)}`;
          
          const taskFeedNotes = [
            existingInspection.product_name ? `Product: ${existingInspection.product_name}` : null,
            existingInspection.lot_number ? `Lot #: ${existingInspection.lot_number}` : null,
            `Result: ${resultLabel}`,
            existingInspection.quantity_inspected ? `Qty Inspected: ${existingInspection.quantity_inspected}` : null,
            existingInspection.quantity_accepted ? `Qty Accepted: ${existingInspection.quantity_accepted}` : null,
            existingInspection.quantity_rejected ? `Qty Rejected: ${existingInspection.quantity_rejected}` : null,
            notes ? `Notes: ${notes}` : null,
            `Completed by: ${completedName}`,
          ].filter(Boolean).join('\n');
          
          await supabase
            .from('task_verifications')
            .insert({
              organization_id: organizationId,
              department_code: existingInspection.department_code || '1004',
              department_name: 'Quality',
              facility_code: existingInspection.facility_id || null,
              location_id: null,
              location_name: existingInspection.location || existingInspection.product_name || null,
              category_id: 'cat-quality-inspection',
              category_name: categoryName,
              action: action,
              notes: taskFeedNotes,
              photo_uri: null,
              employee_id: reviewedById || 'system',
              employee_name: completedName,
              status: status,
              source_type: 'inspection',
              source_id: id,
              source_number: inspectionNumber,
            });
          
          console.log('[useSupabaseQuality] Posted inspection to Task Feed:', inspectionNumber);
        } catch (taskFeedError) {
          console.error('[useSupabaseQuality] Task Feed post error (non-blocking):', taskFeedError);
        }
      }
      
      return data as QualityInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_inspections'] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
    },
  });

  // ==================== Utility Functions ====================
  const generateNCRNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NCR-${year}${month}-${random}`;
  };

  const generateCAPANumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CAPA-${year}${month}-${random}`;
  };

  const generateComplaintNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CC-${year}${month}-${random}`;
  };

  const generateDeviationNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DEV-${year}${month}-${random}`;
  };

  const generateInspectionNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QI-${year}${month}-${random}`;
  };

  const getNCRsBySeverity = (severity: NCRSeverity) => {
    return ncrsQuery.data?.filter(ncr => ncr.severity === severity) || [];
  };

  const getNCRsByStatus = (status: NCRStatus) => {
    return ncrsQuery.data?.filter(ncr => ncr.status === status) || [];
  };

  const getCAPAsByPriority = (priority: CAPAPriority) => {
    return capasQuery.data?.filter(capa => capa.priority === priority) || [];
  };

  const getCAPAsByStatus = (status: CAPAStatus) => {
    return capasQuery.data?.filter(capa => capa.status === status) || [];
  };

  const getOverdueCAPAs = () => {
    const today = new Date().toISOString().split('T')[0];
    return capasQuery.data?.filter(capa => 
      capa.target_completion_date && 
      capa.target_completion_date < today &&
      capa.status !== 'closed' &&
      capa.status !== 'cancelled'
    ) || [];
  };

  const getComplaintsByType = (type: ComplaintType) => {
    return complaintsQuery.data?.filter(c => c.complaint_type === type) || [];
  };

  const getCriticalComplaints = () => {
    return complaintsQuery.data?.filter(c => 
      c.illness_reported || c.injury_reported || c.regulatory_notification_required
    ) || [];
  };

  return {
    ncrs: ncrsQuery.data || [],
    openNCRs: openNCRsQuery.data || [],
    capas: capasQuery.data || [],
    openCAPAs: openCAPAsQuery.data || [],
    complaints: complaintsQuery.data || [],
    deviations: deviationsQuery.data || [],
    inspections: inspectionsQuery.data || [],
    isLoading: ncrsQuery.isLoading || capasQuery.isLoading || complaintsQuery.isLoading,

    createNCR: createNCRMutation.mutateAsync,
    updateNCR: updateNCRMutation.mutateAsync,
    closeNCR: closeNCRMutation.mutateAsync,

    createCAPA: createCAPAMutation.mutateAsync,
    updateCAPA: updateCAPAMutation.mutateAsync,
    closeCAPA: closeCAPAMutation.mutateAsync,

    createComplaint: createComplaintMutation.mutateAsync,
    updateComplaint: updateComplaintMutation.mutateAsync,

    createDeviation: createDeviationMutation.mutateAsync,
    updateDeviation: updateDeviationMutation.mutateAsync,

    createInspection: createInspectionMutation.mutateAsync,
    updateInspection: updateInspectionMutation.mutateAsync,
    completeInspection: completeInspectionMutation.mutateAsync,

    generateNCRNumber,
    generateCAPANumber,
    generateComplaintNumber,
    generateDeviationNumber,
    generateInspectionNumber,

    getNCRsBySeverity,
    getNCRsByStatus,
    getCAPAsByPriority,
    getCAPAsByStatus,
    getOverdueCAPAs,
    getComplaintsByType,
    getCriticalComplaints,

    refetch: () => {
      ncrsQuery.refetch();
      openNCRsQuery.refetch();
      capasQuery.refetch();
      openCAPAsQuery.refetch();
      complaintsQuery.refetch();
      deviationsQuery.refetch();
      inspectionsQuery.refetch();
    },
  };
}
