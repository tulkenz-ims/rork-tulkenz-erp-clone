import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { getDepartmentName } from '@/constants/organizationCodes';

export type ActivitySourceType = 
  | 'work_order'
  | 'pm_work_order'
  | 'quality_form'
  | 'inspection'
  | 'safety_audit'
  | 'sanitation_task'
  | 'inventory_adjustment'
  | 'receiving'
  | 'training_completion'
  | 'corrective_action'
  | 'permit'
  | 'equipment_downtime'
  | 'manual';

export interface ActivityPostInput {
  sourceType: ActivitySourceType;
  sourceId: string;
  sourceNumber: string;
  departmentCode: string;
  facilityCode?: string;
  locationId?: string;
  locationName?: string;
  categoryId?: string;
  categoryName: string;
  action: string;
  notes?: string;
  photoUri?: string;
  status?: 'verified' | 'flagged' | 'pending_review';
  metadata?: Record<string, any>;
  linkedWorkOrderId?: string;
}

export interface WorkOrderCompletionPost {
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  departmentCode: string;
  facilityId?: string;
  locationName?: string;
  equipmentName?: string;
  priority: string;
  completionNotes?: string;
  actualHours?: number;
  completedByName: string;
  isFromPM?: boolean;
  pmScheduleName?: string;
}

export interface PMCompletionPost {
  pmScheduleId: string;
  pmScheduleName: string;
  equipmentId?: string;
  equipmentName?: string;
  frequency: string;
  completionNotes?: string;
  laborHours?: number;
  completedByName: string;
  nextDueDate: string;
  departmentCode?: string;
}

export interface QualityFormCompletionPost {
  formId: string;
  formNumber: string;
  formType: string;
  productName?: string;
  lotNumber?: string;
  result: 'pass' | 'fail' | 'pending';
  notes?: string;
  completedByName: string;
  departmentCode?: string;
  locationName?: string;
}

export interface InspectionCompletionPost {
  inspectionId: string;
  inspectionNumber: string;
  inspectionType: string;
  areaName?: string;
  result: 'pass' | 'fail' | 'needs_action';
  findingsCount?: number;
  notes?: string;
  completedByName: string;
  departmentCode?: string;
}

function generateActivityNumber(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}${month}${day}-${random}`;
}

function getSourceTypeLabel(sourceType: ActivitySourceType): string {
  const labels: Record<ActivitySourceType, string> = {
    work_order: 'Work Order',
    pm_work_order: 'PM Work Order',
    quality_form: 'Quality Form',
    inspection: 'Inspection',
    safety_audit: 'Safety Audit',
    sanitation_task: 'Sanitation Task',
    inventory_adjustment: 'Inventory Adjustment',
    receiving: 'Receiving',
    training_completion: 'Training',
    corrective_action: 'Corrective Action',
    permit: 'Permit',
    equipment_downtime: 'Equipment Downtime',
    manual: 'Manual Entry',
  };
  return labels[sourceType] || sourceType;
}

function getSourceTypeColor(sourceType: ActivitySourceType): string {
  const colors: Record<ActivitySourceType, string> = {
    work_order: '#EF4444',
    pm_work_order: '#8B5CF6',
    quality_form: '#10B981',
    inspection: '#F59E0B',
    safety_audit: '#F97316',
    sanitation_task: '#06B6D4',
    inventory_adjustment: '#6366F1',
    receiving: '#84CC16',
    training_completion: '#EC4899',
    corrective_action: '#DC2626',
    permit: '#0EA5E9',
    equipment_downtime: '#991B1B',
    manual: '#6B7280',
  };
  return colors[sourceType] || '#6B7280';
}

export function usePostActivityToFeed(options?: {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ActivityPostInput) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[usePostActivityToFeed] Posting activity:', input.sourceType, input.sourceNumber);

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: input.departmentCode,
          department_name: getDepartmentName(input.departmentCode) || input.departmentCode,
          facility_code: input.facilityCode || null,
          location_id: input.locationId || null,
          location_name: input.locationName || null,
          category_id: input.categoryId || `cat-${input.sourceType}`,
          category_name: input.categoryName,
          action: input.action,
          notes: input.notes || null,
          photo_uri: input.photoUri || null,
          employee_id: user.id,
          employee_name: `${user.first_name} ${user.last_name}`,
          status: input.status || 'verified',
          source_type: input.sourceType,
          source_id: input.sourceId,
          source_number: input.sourceNumber,
          linked_work_order_id: input.linkedWorkOrderId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[usePostActivityToFeed] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePostActivityToFeed] Activity posted successfully:', data.id);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[usePostActivityToFeed] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePostWorkOrderCompletion(options?: {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkOrderCompletionPost) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[usePostWorkOrderCompletion] Posting WO completion:', input.workOrderNumber);

      const sourceType: ActivitySourceType = input.isFromPM ? 'pm_work_order' : 'work_order';
      const categoryName = input.isFromPM 
        ? `PM Completed: ${input.pmScheduleName || 'Preventive Maintenance'}` 
        : 'Work Order Completed';

      const action = input.isFromPM
        ? `PM Work Order Completed: ${input.title}`
        : `Work Order Completed: ${input.title}`;

      const notes = [
        input.description,
        input.equipmentName ? `Equipment: ${input.equipmentName}` : null,
        `Priority: ${input.priority.charAt(0).toUpperCase() + input.priority.slice(1)}`,
        input.actualHours ? `Labor Hours: ${input.actualHours}` : null,
        input.completionNotes ? `Completion Notes: ${input.completionNotes}` : null,
        `Completed by: ${input.completedByName}`,
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: input.departmentCode || '1001',
          department_name: getDepartmentName(input.departmentCode || '1001') || 'Maintenance',
          facility_code: input.facilityId || null,
          location_id: null,
          location_name: input.locationName || input.equipmentName || null,
          category_id: `cat-${sourceType}-complete`,
          category_name: categoryName,
          action: action,
          notes: notes,
          photo_uri: null,
          employee_id: user.id,
          employee_name: `${user.first_name} ${user.last_name}`,
          status: 'verified',
          source_type: sourceType,
          source_id: input.workOrderId,
          source_number: input.workOrderNumber,
          linked_work_order_id: input.workOrderId,
        })
        .select()
        .single();

      if (error) {
        console.error('[usePostWorkOrderCompletion] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePostWorkOrderCompletion] WO completion posted:', data.id);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[usePostWorkOrderCompletion] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePostPMCompletion(options?: {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PMCompletionPost) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[usePostPMCompletion] Posting PM completion:', input.pmScheduleName);

      const pmNumber = generateActivityNumber('PM');
      
      const action = `PM Completed: ${input.pmScheduleName}`;
      const categoryName = `Preventive Maintenance - ${input.frequency.charAt(0).toUpperCase() + input.frequency.slice(1)}`;

      const notes = [
        input.equipmentName ? `Equipment: ${input.equipmentName}` : null,
        `Frequency: ${input.frequency.charAt(0).toUpperCase() + input.frequency.slice(1)}`,
        input.laborHours ? `Labor Hours: ${input.laborHours}` : null,
        `Next Due: ${new Date(input.nextDueDate).toLocaleDateString()}`,
        input.completionNotes ? `Notes: ${input.completionNotes}` : null,
        `Completed by: ${input.completedByName}`,
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: input.departmentCode || '1001',
          department_name: getDepartmentName(input.departmentCode || '1001') || 'Maintenance',
          facility_code: null,
          location_id: null,
          location_name: input.equipmentName || null,
          category_id: 'cat-pm-complete',
          category_name: categoryName,
          action: action,
          notes: notes,
          photo_uri: null,
          employee_id: user.id,
          employee_name: `${user.first_name} ${user.last_name}`,
          status: 'verified',
          source_type: 'pm_work_order',
          source_id: input.pmScheduleId,
          source_number: pmNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('[usePostPMCompletion] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePostPMCompletion] PM completion posted:', data.id);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[usePostPMCompletion] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePostQualityFormCompletion(options?: {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QualityFormCompletionPost) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[usePostQualityFormCompletion] Posting QA form completion:', input.formNumber);

      const resultLabel = input.result === 'pass' ? 'PASSED' : input.result === 'fail' ? 'FAILED' : 'PENDING';
      const status: 'verified' | 'flagged' = input.result === 'fail' ? 'flagged' : 'verified';

      const action = `Quality Form ${resultLabel}: ${input.formType}`;
      const categoryName = `Quality Check - ${input.formType}`;

      const notes = [
        input.productName ? `Product: ${input.productName}` : null,
        input.lotNumber ? `Lot #: ${input.lotNumber}` : null,
        `Result: ${resultLabel}`,
        input.notes ? `Notes: ${input.notes}` : null,
        `Completed by: ${input.completedByName}`,
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: input.departmentCode || '1004',
          department_name: getDepartmentName(input.departmentCode || '1004') || 'Quality',
          facility_code: null,
          location_id: null,
          location_name: input.locationName || null,
          category_id: 'cat-quality-form',
          category_name: categoryName,
          action: action,
          notes: notes,
          photo_uri: null,
          employee_id: user.id,
          employee_name: `${user.first_name} ${user.last_name}`,
          status: status,
          source_type: 'quality_form',
          source_id: input.formId,
          source_number: input.formNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('[usePostQualityFormCompletion] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePostQualityFormCompletion] QA form posted:', data.id);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[usePostQualityFormCompletion] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePostInspectionCompletion(options?: {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InspectionCompletionPost) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[usePostInspectionCompletion] Posting inspection completion:', input.inspectionNumber);

      const resultLabel = input.result === 'pass' ? 'PASSED' : input.result === 'fail' ? 'FAILED' : 'NEEDS ACTION';
      const status: 'verified' | 'flagged' = input.result !== 'pass' ? 'flagged' : 'verified';

      const action = `Inspection ${resultLabel}: ${input.inspectionType}`;
      const categoryName = `Inspection - ${input.inspectionType}`;

      const notes = [
        input.areaName ? `Area: ${input.areaName}` : null,
        `Result: ${resultLabel}`,
        input.findingsCount !== undefined ? `Findings: ${input.findingsCount}` : null,
        input.notes ? `Notes: ${input.notes}` : null,
        `Completed by: ${input.completedByName}`,
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: input.departmentCode || '1005',
          department_name: getDepartmentName(input.departmentCode || '1005') || 'Safety',
          facility_code: null,
          location_id: null,
          location_name: input.areaName || null,
          category_id: 'cat-inspection',
          category_name: categoryName,
          action: action,
          notes: notes,
          photo_uri: null,
          employee_id: user.id,
          employee_name: `${user.first_name} ${user.last_name}`,
          status: status,
          source_type: 'inspection',
          source_id: input.inspectionId,
          source_number: input.inspectionNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('[usePostInspectionCompletion] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePostInspectionCompletion] Inspection posted:', data.id);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[usePostInspectionCompletion] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useActivityFeedHelpers() {
  return {
    getSourceTypeLabel,
    getSourceTypeColor,
    generateActivityNumber,
    getDepartmentName,
  };
}
