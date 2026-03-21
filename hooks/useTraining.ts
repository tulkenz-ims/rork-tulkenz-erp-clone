import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

// ============================================
// TYPES
// ============================================

export interface TrainingTemplate {
  id: string;
  organization_id: string;
  template_number: string;
  title: string;
  description: string | null;
  training_type: 'ojt' | 'classroom' | 'online' | 'external' | 'rippling';
  status: 'draft' | 'active' | 'archived';
  version: string;
  department_codes: string[];
  department_names: string[];
  applies_to_all_departments: boolean;
  retraining_required: boolean;
  retraining_interval_days: number;
  rippling_course_id: string | null;
  rippling_sync_enabled: boolean;
  rippling_last_synced_at: string | null;
  has_ojt_steps: boolean;
  ojt_step_count: number;
  has_knowledge_test: boolean;
  knowledge_test_passing_score: number;
  knowledge_test_max_attempts: number;
  has_hands_on_evaluation: boolean;
  issues_certification: boolean;
  certification_name: string | null;
  certification_validity_days: number | null;
  certification_auto_issue: boolean;
  task_feed_department: string;
  task_feed_priority: 'low' | 'normal' | 'high' | 'critical';
  created_by: string | null;
  created_by_id: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingTemplateDocument {
  id: string;
  organization_id: string;
  template_id: string;
  source_type: 'document' | 'sds' | 'form' | 'external';
  source_id: string | null;
  source_title: string;
  source_document_type: string | null;
  source_url: string | null;
  display_order: number;
  is_required_reading: boolean;
  notes: string | null;
  created_at: string;
}

export interface TrainingTemplateStep {
  id: string;
  organization_id: string;
  template_id: string;
  step_number: number;
  title: string;
  description: string | null;
  instructions: string | null;
  step_type: 'demonstrate' | 'together' | 'solo' | 'evaluate';
  requires_trainer_signoff: boolean;
  requires_observer_signoff: boolean;
  estimated_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface TrainingTemplateQuestion {
  id: string;
  organization_id: string;
  template_id: string;
  question_number: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  points: number;
  explanation: string | null;
  created_at: string;
}

export interface TrainingTemplateChecklistItem {
  id: string;
  organization_id: string;
  template_id: string;
  item_number: number;
  skill_description: string;
  evaluation_criteria: string | null;
  is_critical: boolean;
  notes: string | null;
  created_at: string;
}

export interface DepartmentRequiredTraining {
  id: string;
  organization_id: string;
  department_code: string;
  department_name: string;
  template_id: string;
  is_required_for_new_hire: boolean;
  due_within_days: number;
  notes: string | null;
  created_at: string;
  template?: TrainingTemplate;
}

export interface TrainingSession {
  id: string;
  organization_id: string;
  session_number: string;
  template_id: string;
  template_title: string;
  template_version: string | null;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  department_code: string | null;
  department_name: string | null;
  assigned_by: string | null;
  assigned_by_id: string | null;
  assigned_at: string;
  due_date: string | null;
  status: 'assigned' | 'in_progress' | 'pending_evaluation' | 'completed' | 'failed' | 'cancelled';
  documents_reviewed: boolean;
  documents_reviewed_at: string | null;
  ojt_steps_completed: number;
  ojt_steps_total: number;
  knowledge_test_passed: boolean | null;
  knowledge_test_score: number | null;
  knowledge_test_attempts: number;
  hands_on_passed: boolean | null;
  started_at: string | null;
  completed_at: string | null;
  trainer_name: string | null;
  trainer_id: string | null;
  trainer_signed_off: boolean;
  trainer_signed_off_at: string | null;
  evaluator_name: string | null;
  evaluator_id: string | null;
  evaluator_signed_off: boolean;
  evaluator_signed_off_at: string | null;
  supervisor_name: string | null;
  supervisor_id: string | null;
  supervisor_approved: boolean;
  supervisor_approved_at: string | null;
  task_feed_post_id: string | null;
  rippling_completion_id: string | null;
  rippling_synced_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionStep {
  id: string;
  organization_id: string;
  session_id: string;
  template_step_id: string;
  step_number: number;
  step_type: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at: string | null;
  trainer_name: string | null;
  trainer_id: string | null;
  trainer_signed_off: boolean;
  trainer_signed_off_at: string | null;
  trainer_notes: string | null;
  observer_name: string | null;
  observer_id: string | null;
  observer_signed_off: boolean;
  observer_signed_off_at: string | null;
  observer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionAttempt {
  id: string;
  organization_id: string;
  session_id: string;
  attempt_type: 'knowledge_test' | 'hands_on';
  attempt_number: number;
  answers: Record<string, string> | null;
  score: number | null;
  passing_score: number | null;
  passed: boolean | null;
  checklist_results: Record<string, { result: 'pass' | 'fail' | 'na'; notes: string }> | null;
  critical_items_passed: boolean | null;
  evaluator_name: string | null;
  evaluator_id: string | null;
  evaluator_notes: string | null;
  attempted_at: string;
  created_at: string;
}

export interface TrainingCertification {
  id: string;
  organization_id: string;
  certification_number: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  department_code: string | null;
  department_name: string | null;
  template_id: string | null;
  session_id: string | null;
  certification_name: string;
  issued_date: string;
  expiration_date: string | null;
  is_lifetime: boolean;
  status: 'active' | 'expired' | 'revoked' | 'superseded';
  source: 'ojt' | 'rippling' | 'external' | 'classroom';
  issued_by: string | null;
  issued_by_id: string | null;
  certificate_url: string | null;
  rippling_certification_id: string | null;
  superseded_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// TRAINING TEMPLATES
// ============================================

export function useTrainingTemplates(options?: {
  status?: string;
  department_code?: string;
  training_type?: string;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['training-templates', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('training_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) query = query.eq('status', options.status);
      if (options?.training_type) query = query.eq('training_type', options.training_type);
      if (options?.department_code) {
        query = query.or(
          `department_codes.cs.{${options.department_code}},applies_to_all_departments.eq.true`
        );
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      console.log(`[useTrainingTemplates] Fetched ${data?.length || 0} templates`);
      return (data || []) as TrainingTemplate[];
    },
    enabled: !!organizationId,
  });
}

export function useTrainingTemplate(templateId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['training-template', organizationId, templateId],
    queryFn: async () => {
      if (!organizationId || !templateId) return null;

      const { data, error } = await supabase
        .from('training_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplate;
    },
    enabled: !!organizationId && !!templateId,
  });
}

export function useCreateTrainingTemplate() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (template: Omit<TrainingTemplate,
      'id' | 'organization_id' | 'created_at' | 'updated_at' | 'template_number'
    >) => {
      if (!organizationId) throw new Error('No organization ID');

      // Generate template number
      const { count } = await supabase
        .from('training_templates')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const templateNumber = `TRN-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('training_templates')
        .insert({
          organization_id: organizationId,
          template_number: templateNumber,
          ...template,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useCreateTrainingTemplate] Created:', data.id);
      return data as TrainingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates', organizationId] });
    },
  });
}

export function useUpdateTrainingTemplate() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ templateId, updates }: {
      templateId: string;
      updates: Partial<TrainingTemplate>;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-templates', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['training-template', organizationId, variables.templateId] });
    },
  });
}

export function useDeleteTrainingTemplate() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('training_templates')
        .delete()
        .eq('id', templateId)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-templates', organizationId] });
    },
  });
}

// ============================================
// TEMPLATE DOCUMENTS
// ============================================

export function useTemplateDocuments(templateId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['template-documents', organizationId, templateId],
    queryFn: async () => {
      if (!organizationId || !templateId) return [];

      const { data, error } = await supabase
        .from('training_template_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', templateId)
        .order('display_order');

      if (error) throw new Error(error.message);
      return (data || []) as TrainingTemplateDocument[];
    },
    enabled: !!organizationId && !!templateId,
  });
}

export function useAddTemplateDocument() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (doc: Omit<TrainingTemplateDocument,
      'id' | 'organization_id' | 'created_at'
    >) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_documents')
        .insert({ organization_id: organizationId, ...doc })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-documents', organizationId, variables.template_id],
      });
    },
  });
}

export function useRemoveTemplateDocument() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ docId, templateId }: { docId: string; templateId: string }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('training_template_documents')
        .delete()
        .eq('id', docId)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-documents', organizationId, variables.templateId],
      });
    },
  });
}

// ============================================
// TEMPLATE OJT STEPS
// ============================================

export function useTemplateSteps(templateId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['template-steps', organizationId, templateId],
    queryFn: async () => {
      if (!organizationId || !templateId) return [];

      const { data, error } = await supabase
        .from('training_template_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', templateId)
        .order('step_number');

      if (error) throw new Error(error.message);
      return (data || []) as TrainingTemplateStep[];
    },
    enabled: !!organizationId && !!templateId,
  });
}

export function useCreateTemplateStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (step: Omit<TrainingTemplateStep, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_steps')
        .insert({ organization_id: organizationId, ...step })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateStep;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-steps', organizationId, variables.template_id],
      });
    },
  });
}

export function useUpdateTemplateStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ stepId, templateId, updates }: {
      stepId: string;
      templateId: string;
      updates: Partial<TrainingTemplateStep>;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_steps')
        .update(updates)
        .eq('id', stepId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateStep;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-steps', organizationId, variables.templateId],
      });
    },
  });
}

export function useDeleteTemplateStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ stepId, templateId }: { stepId: string; templateId: string }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('training_template_steps')
        .delete()
        .eq('id', stepId)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-steps', organizationId, variables.templateId],
      });
    },
  });
}

// ============================================
// TEMPLATE KNOWLEDGE TEST QUESTIONS
// ============================================

export function useTemplateQuestions(templateId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['template-questions', organizationId, templateId],
    queryFn: async () => {
      if (!organizationId || !templateId) return [];

      const { data, error } = await supabase
        .from('training_template_questions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', templateId)
        .order('question_number');

      if (error) throw new Error(error.message);
      return (data || []) as TrainingTemplateQuestion[];
    },
    enabled: !!organizationId && !!templateId,
  });
}

export function useCreateTemplateQuestion() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (question: Omit<TrainingTemplateQuestion,
      'id' | 'organization_id' | 'created_at'
    >) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_questions')
        .insert({ organization_id: organizationId, ...question })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateQuestion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-questions', organizationId, variables.template_id],
      });
    },
  });
}

export function useUpdateTemplateQuestion() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ questionId, templateId, updates }: {
      questionId: string;
      templateId: string;
      updates: Partial<TrainingTemplateQuestion>;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_questions')
        .update(updates)
        .eq('id', questionId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateQuestion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-questions', organizationId, variables.templateId],
      });
    },
  });
}

export function useDeleteTemplateQuestion() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ questionId, templateId }: {
      questionId: string;
      templateId: string;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('training_template_questions')
        .delete()
        .eq('id', questionId)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-questions', organizationId, variables.templateId],
      });
    },
  });
}

// ============================================
// TEMPLATE HANDS-ON CHECKLIST
// ============================================

export function useTemplateChecklist(templateId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['template-checklist', organizationId, templateId],
    queryFn: async () => {
      if (!organizationId || !templateId) return [];

      const { data, error } = await supabase
        .from('training_template_checklist')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_id', templateId)
        .order('item_number');

      if (error) throw new Error(error.message);
      return (data || []) as TrainingTemplateChecklistItem[];
    },
    enabled: !!organizationId && !!templateId,
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (item: Omit<TrainingTemplateChecklistItem,
      'id' | 'organization_id' | 'created_at'
    >) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_checklist')
        .insert({ organization_id: organizationId, ...item })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateChecklistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-checklist', organizationId, variables.template_id],
      });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ itemId, templateId, updates }: {
      itemId: string;
      templateId: string;
      updates: Partial<TrainingTemplateChecklistItem>;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_template_checklist')
        .update(updates)
        .eq('id', itemId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingTemplateChecklistItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-checklist', organizationId, variables.templateId],
      });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ itemId, templateId }: { itemId: string; templateId: string }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('training_template_checklist')
        .delete()
        .eq('id', itemId)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-checklist', organizationId, variables.templateId],
      });
    },
  });
}

// ============================================
// DEPARTMENT REQUIRED TRAINING
// ============================================

export function useDepartmentRequiredTraining(departmentCode?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['department-required-training', organizationId, departmentCode],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('department_required_training')
        .select(`
          *,
          training_templates (
            id, title, template_number, training_type,
            status, retraining_interval_days, issues_certification
          )
        `)
        .eq('organization_id', organizationId)
        .order('department_code');

      if (departmentCode) query = query.eq('department_code', departmentCode);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as DepartmentRequiredTraining[];
    },
    enabled: !!organizationId,
  });
}

export function useSetDepartmentRequiredTraining() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (req: Omit<DepartmentRequiredTraining,
      'id' | 'organization_id' | 'created_at' | 'template'
    >) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('department_required_training')
        .upsert({
          organization_id: organizationId,
          ...req,
        }, { onConflict: 'organization_id,department_code,template_id' })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as DepartmentRequiredTraining;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['department-required-training', organizationId],
      });
    },
  });
}

export function useRemoveDepartmentRequiredTraining() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization ID');

      const { error } = await supabase
        .from('department_required_training')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['department-required-training', organizationId],
      });
    },
  });
}

// ============================================
// TRAINING SESSIONS
// ============================================

export function useTrainingSessions(options?: {
  employeeId?: string;
  status?: string;
  departmentCode?: string;
  templateId?: string;
  limit?: number;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['training-sessions', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('training_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('assigned_at', { ascending: false });

      if (options?.employeeId) query = query.eq('employee_id', options.employeeId);
      if (options?.status) query = query.eq('status', options.status);
      if (options?.departmentCode) query = query.eq('department_code', options.departmentCode);
      if (options?.templateId) query = query.eq('template_id', options.templateId);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      console.log(`[useTrainingSessions] Fetched ${data?.length || 0} sessions`);
      return (data || []) as TrainingSession[];
    },
    enabled: !!organizationId,
  });
}

export function useTrainingSession(sessionId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['training-session', organizationId, sessionId],
    queryFn: async () => {
      if (!organizationId || !sessionId) return null;

      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingSession;
    },
    enabled: !!organizationId && !!sessionId,
  });
}

export function useAssignTraining() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      templateId,
      employeeId,
      employeeName,
      employeeCode,
      departmentCode,
      departmentName,
      assignedBy,
      assignedById,
      dueDate,
      trainerName,
      trainerId,
      notes,
    }: {
      templateId: string;
      employeeId: string;
      employeeName: string;
      employeeCode?: string;
      departmentCode?: string;
      departmentName?: string;
      assignedBy?: string;
      assignedById?: string;
      dueDate?: string;
      trainerName?: string;
      trainerId?: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('training_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .single();

      if (templateError || !template) throw new Error('Template not found');

      // Generate session number
      const { count } = await supabase
        .from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const sessionNumber = `TRS-${String((count || 0) + 1).padStart(5, '0')}`;
      const now = new Date().toISOString();

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          organization_id: organizationId,
          session_number: sessionNumber,
          template_id: templateId,
          template_title: template.title,
          template_version: template.version,
          employee_id: employeeId,
          employee_name: employeeName,
          employee_code: employeeCode || null,
          department_code: departmentCode || null,
          department_name: departmentName || null,
          assigned_by: assignedBy || null,
          assigned_by_id: assignedById || null,
          assigned_at: now,
          due_date: dueDate || null,
          status: 'assigned',
          ojt_steps_total: template.ojt_step_count || 4,
          trainer_name: trainerName || null,
          trainer_id: trainerId || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (sessionError) throw new Error(sessionError.message);

      // Create step records from template steps
      if (template.has_ojt_steps) {
        const { data: templateSteps } = await supabase
          .from('training_template_steps')
          .select('*')
          .eq('template_id', templateId)
          .eq('organization_id', organizationId)
          .order('step_number');

        if (templateSteps && templateSteps.length > 0) {
          const stepRecords = templateSteps.map((step: TrainingTemplateStep) => ({
            organization_id: organizationId,
            session_id: session.id,
            template_step_id: step.id,
            step_number: step.step_number,
            step_type: step.step_type,
            title: step.title,
            status: 'pending',
          }));

          await supabase.from('training_session_steps').insert(stepRecords);
        }
      }

      // Post to Task Feed
      try {
        await supabase.from('task_feed_posts').insert({
          organization_id: organizationId,
          post_type: 'training_assigned',
          title: `Training Assigned: ${template.title}`,
          description: `${employeeName} has been assigned training: ${template.title} (${sessionNumber})`,
          department: 'training',
          priority: template.task_feed_priority || 'normal',
          status: 'open',
          source: 'training',
          reference_id: session.id,
          reference_number: sessionNumber,
          assigned_to_name: employeeName,
          assigned_to_id: employeeId,
          due_date: dueDate || null,
          created_by: assignedBy || null,
          created_by_id: assignedById || null,
          metadata: {
            session_id: session.id,
            template_id: templateId,
            template_title: template.title,
          },
        });
        console.log('[useAssignTraining] Task feed post created');
      } catch (tfError) {
        console.error('[useAssignTraining] Task feed post failed:', tfError);
      }

      console.log('[useAssignTraining] Session created:', session.id);
      return session as TrainingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions', organizationId] });
    },
  });
}

export function useUpdateTrainingSession() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ sessionId, updates }: {
      sessionId: string;
      updates: Partial<TrainingSession>;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingSession;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['training-session', organizationId, variables.sessionId],
      });
    },
  });
}

// ============================================
// SESSION STEPS
// ============================================

export function useSessionSteps(sessionId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['session-steps', organizationId, sessionId],
    queryFn: async () => {
      if (!organizationId || !sessionId) return [];

      const { data, error } = await supabase
        .from('training_session_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('session_id', sessionId)
        .order('step_number');

      if (error) throw new Error(error.message);
      return (data || []) as TrainingSessionStep[];
    },
    enabled: !!organizationId && !!sessionId,
  });
}

export function useCompleteSessionStep() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      stepId,
      sessionId,
      trainerName,
      trainerId,
      trainerNotes,
      observerName,
      observerId,
      observerNotes,
    }: {
      stepId: string;
      sessionId: string;
      trainerName?: string;
      trainerId?: string;
      trainerNotes?: string;
      observerName?: string;
      observerId?: string;
      observerNotes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('training_session_steps')
        .update({
          status: 'completed',
          completed_at: now,
          trainer_name: trainerName || null,
          trainer_id: trainerId || null,
          trainer_signed_off: !!trainerName,
          trainer_signed_off_at: trainerName ? now : null,
          trainer_notes: trainerNotes || null,
          observer_name: observerName || null,
          observer_id: observerId || null,
          observer_signed_off: !!observerName,
          observer_signed_off_at: observerName ? now : null,
          observer_notes: observerNotes || null,
          updated_at: now,
        })
        .eq('id', stepId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update session step count
      const { data: allSteps } = await supabase
        .from('training_session_steps')
        .select('status')
        .eq('session_id', sessionId)
        .eq('organization_id', organizationId);

      const completedCount = allSteps?.filter(s => s.status === 'completed').length || 0;
      const totalCount = allSteps?.length || 0;

      await supabase
        .from('training_sessions')
        .update({
          ojt_steps_completed: completedCount,
          status: completedCount === totalCount ? 'pending_evaluation' : 'in_progress',
          started_at: data.completed_at,
          updated_at: now,
        })
        .eq('id', sessionId)
        .eq('organization_id', organizationId);

      console.log('[useCompleteSessionStep] Step completed:', stepId);
      return data as TrainingSessionStep;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['session-steps', organizationId, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['training-session', organizationId, variables.sessionId],
      });
      queryClient.invalidateQueries({ queryKey: ['training-sessions', organizationId] });
    },
  });
}

// ============================================
// SESSION ATTEMPTS (TEST + HANDS-ON)
// ============================================

export function useSessionAttempts(sessionId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['session-attempts', organizationId, sessionId],
    queryFn: async () => {
      if (!organizationId || !sessionId) return [];

      const { data, error } = await supabase
        .from('training_session_attempts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('session_id', sessionId)
        .order('attempted_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as TrainingSessionAttempt[];
    },
    enabled: !!organizationId && !!sessionId,
  });
}

export function useSubmitKnowledgeTest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      sessionId,
      answers,
      questions,
      passingScore,
    }: {
      sessionId: string;
      answers: Record<string, string>;
      questions: TrainingTemplateQuestion[];
      passingScore: number;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach(q => {
        totalPoints += q.points;
        if (answers[q.id] === q.correct_answer) {
          earnedPoints += q.points;
        }
      });

      const score = totalPoints > 0
        ? Math.round((earnedPoints / totalPoints) * 100)
        : 0;
      const passed = score >= passingScore;

      // Get current attempt count
      const { count } = await supabase
        .from('training_session_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('attempt_type', 'knowledge_test')
        .eq('organization_id', organizationId);

      const attemptNumber = (count || 0) + 1;

      const { data, error } = await supabase
        .from('training_session_attempts')
        .insert({
          organization_id: organizationId,
          session_id: sessionId,
          attempt_type: 'knowledge_test',
          attempt_number: attemptNumber,
          answers,
          score,
          passing_score: passingScore,
          passed,
          attempted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update session
      await supabase
        .from('training_sessions')
        .update({
          knowledge_test_passed: passed,
          knowledge_test_score: score,
          knowledge_test_attempts: attemptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('organization_id', organizationId);

      console.log('[useSubmitKnowledgeTest] Score:', score, 'Passed:', passed);
      return { attempt: data as TrainingSessionAttempt, score, passed };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['session-attempts', organizationId, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['training-session', organizationId, variables.sessionId],
      });
    },
  });
}

export function useSubmitHandsOnEvaluation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      sessionId,
      checklistResults,
      checklistItems,
      evaluatorName,
      evaluatorId,
      evaluatorNotes,
    }: {
      sessionId: string;
      checklistResults: Record<string, { result: 'pass' | 'fail' | 'na'; notes: string }>;
      checklistItems: TrainingTemplateChecklistItem[];
      evaluatorName: string;
      evaluatorId?: string;
      evaluatorNotes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      // Check critical items
      const criticalItems = checklistItems.filter(i => i.is_critical);
      const criticalItemsPassed = criticalItems.every(
        item => checklistResults[item.id]?.result !== 'fail'
      );

      // Overall pass = all critical items passed + no more than 20% non-critical failures
      const nonCriticalItems = checklistItems.filter(i => !i.is_critical);
      const nonCriticalFails = nonCriticalItems.filter(
        item => checklistResults[item.id]?.result === 'fail'
      ).length;
      const nonCriticalPassRate = nonCriticalItems.length > 0
        ? (nonCriticalItems.length - nonCriticalFails) / nonCriticalItems.length
        : 1;

      const passed = criticalItemsPassed && nonCriticalPassRate >= 0.8;

      const { count } = await supabase
        .from('training_session_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('attempt_type', 'hands_on')
        .eq('organization_id', organizationId);

      const attemptNumber = (count || 0) + 1;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('training_session_attempts')
        .insert({
          organization_id: organizationId,
          session_id: sessionId,
          attempt_type: 'hands_on',
          attempt_number: attemptNumber,
          checklist_results: checklistResults,
          critical_items_passed: criticalItemsPassed,
          passed,
          evaluator_name: evaluatorName,
          evaluator_id: evaluatorId || null,
          evaluator_notes: evaluatorNotes || null,
          attempted_at: now,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update session
      await supabase
        .from('training_sessions')
        .update({
          hands_on_passed: passed,
          evaluator_name: evaluatorName,
          evaluator_id: evaluatorId || null,
          evaluator_signed_off: true,
          evaluator_signed_off_at: now,
          updated_at: now,
        })
        .eq('id', sessionId)
        .eq('organization_id', organizationId);

      console.log('[useSubmitHandsOnEvaluation] Passed:', passed);
      return { attempt: data as TrainingSessionAttempt, passed, criticalItemsPassed };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['session-attempts', organizationId, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['training-session', organizationId, variables.sessionId],
      });
    },
  });
}

// ============================================
// COMPLETE SESSION + ISSUE CERTIFICATION
// ============================================

export function useCompleteTrainingSession() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({
      sessionId,
      supervisorName,
      supervisorId,
      notes,
    }: {
      sessionId: string;
      supervisorName: string;
      supervisorId?: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      const now = new Date().toISOString();

      // Get session + template
      const { data: session } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('organization_id', organizationId)
        .single();

      if (!session) throw new Error('Session not found');

      const { data: template } = await supabase
        .from('training_templates')
        .select('*')
        .eq('id', session.template_id)
        .eq('organization_id', organizationId)
        .single();

      if (!template) throw new Error('Template not found');

      // Verify both tests passed
      const bothPassed = session.knowledge_test_passed && session.hands_on_passed;
      const finalStatus = bothPassed ? 'completed' : 'failed';

      // Update session
      await supabase
        .from('training_sessions')
        .update({
          status: finalStatus,
          completed_at: now,
          supervisor_name: supervisorName,
          supervisor_id: supervisorId || null,
          supervisor_approved: bothPassed,
          supervisor_approved_at: bothPassed ? now : null,
          notes: notes || session.notes,
          updated_at: now,
        })
        .eq('id', sessionId)
        .eq('organization_id', organizationId);

      let certification = null;

      // Auto-issue certification if template says so and both passed
      if (bothPassed && template.issues_certification && template.certification_auto_issue) {
        const { count: certCount } = await supabase
          .from('training_certifications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        const certNumber = `CERT-${String((certCount || 0) + 1).padStart(5, '0')}`;
        const issuedDate = new Date();
        const expirationDate = template.certification_validity_days
          ? new Date(issuedDate.getTime() +
              template.certification_validity_days * 24 * 60 * 60 * 1000)
          : null;

        const { data: cert, error: certError } = await supabase
          .from('training_certifications')
          .insert({
            organization_id: organizationId,
            certification_number: certNumber,
            employee_id: session.employee_id,
            employee_name: session.employee_name,
            employee_code: session.employee_code,
            department_code: session.department_code,
            department_name: session.department_name,
            template_id: template.id,
            session_id: sessionId,
            certification_name: template.certification_name || template.title,
            issued_date: issuedDate.toISOString().split('T')[0],
            expiration_date: expirationDate
              ? expirationDate.toISOString().split('T')[0]
              : null,
            is_lifetime: !template.certification_validity_days,
            status: 'active',
            source: 'ojt',
            issued_by: supervisorName,
            issued_by_id: supervisorId || null,
          })
          .select()
          .single();

        if (!certError) {
          certification = cert as TrainingCertification;
          console.log('[useCompleteTrainingSession] Certification issued:', certNumber);
        }
      }

      // Update Task Feed post
      try {
        if (session.task_feed_post_id) {
          await supabase
            .from('task_feed_posts')
            .update({
              status: finalStatus === 'completed' ? 'closed' : 'open',
              title: `Training ${finalStatus === 'completed' ? 'Completed' : 'Failed'}: ${session.template_title}`,
              updated_at: now,
            })
            .eq('id', session.task_feed_post_id)
            .eq('organization_id', organizationId);
        }
      } catch (tfError) {
        console.error('[useCompleteTrainingSession] Task feed update failed:', tfError);
      }

      return { status: finalStatus, certification };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['training-certifications', organizationId] });
    },
  });
}

// ============================================
// TRAINING CERTIFICATIONS
// ============================================

export function useTrainingCertifications(options?: {
  employeeId?: string;
  status?: string;
  departmentCode?: string;
  expiringWithinDays?: number;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['training-certifications', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('training_certifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('issued_date', { ascending: false });

      if (options?.employeeId) query = query.eq('employee_id', options.employeeId);
      if (options?.status) query = query.eq('status', options.status);
      if (options?.departmentCode) query = query.eq('department_code', options.departmentCode);
      if (options?.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
        query = query
          .lte('expiration_date', futureDate.toISOString().split('T')[0])
          .gte('expiration_date', new Date().toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      console.log(`[useTrainingCertifications] Fetched ${data?.length || 0} certifications`);
      return (data || []) as TrainingCertification[];
    },
    enabled: !!organizationId,
  });
}

export function useIssueCertification() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (cert: Omit<TrainingCertification,
      'id' | 'organization_id' | 'certification_number' | 'created_at' | 'updated_at'
    >) => {
      if (!organizationId) throw new Error('No organization ID');

      const { count } = await supabase
        .from('training_certifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const certNumber = `CERT-${String((count || 0) + 1).padStart(5, '0')}`;

      const { data, error } = await supabase
        .from('training_certifications')
        .insert({
          organization_id: organizationId,
          certification_number: certNumber,
          ...cert,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      console.log('[useIssueCertification] Issued:', certNumber);
      return data as TrainingCertification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-certifications', organizationId] });
    },
  });
}

export function useRevokeCertification() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ certId, notes }: { certId: string; notes?: string }) => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('training_certifications')
        .update({
          status: 'revoked',
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TrainingCertification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-certifications', organizationId] });
    },
  });
}

// ============================================
// COMPLIANCE DASHBOARD STATS
// ============================================

export function useTrainingComplianceStats() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['training-compliance-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const in30DaysStr = in30Days.toISOString().split('T')[0];

      const [
        { count: totalSessions },
        { count: activeSessions },
        { count: completedSessions },
        { count: failedSessions },
        { count: overdueSessions },
        { count: activeCerts },
        { count: expiredCerts },
        { count: expiringCerts },
      ] = await Promise.all([
        supabase.from('training_sessions').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        supabase.from('training_sessions').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .in('status', ['assigned', 'in_progress', 'pending_evaluation']),
        supabase.from('training_sessions').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId).eq('status', 'completed'),
        supabase.from('training_sessions').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId).eq('status', 'failed'),
        supabase.from('training_sessions').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .in('status', ['assigned', 'in_progress'])
          .lt('due_date', today),
        supabase.from('training_certifications').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('training_certifications').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId).eq('status', 'expired'),
        supabase.from('training_certifications').select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId).eq('status', 'active')
          .lte('expiration_date', in30DaysStr).gte('expiration_date', today),
      ]);

      return {
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        completedSessions: completedSessions || 0,
        failedSessions: failedSessions || 0,
        overdueSessions: overdueSessions || 0,
        activeCertifications: activeCerts || 0,
        expiredCertifications: expiredCerts || 0,
        expiringCertifications: expiringCerts || 0,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 60000,
  });
}
