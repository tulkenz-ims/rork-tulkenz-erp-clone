import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { INITIAL_TASK_FEED_TEMPLATES } from '@/constants/taskFeedTemplates';
import { CreateTemplateInput } from '@/types/taskFeedTemplates';

interface SeedResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

interface MutationCallbacks {
  onSuccess?: (result: SeedResult) => void;
  onError?: (error: Error) => void;
}

export function useSeedTaskFeedTemplates(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (): Promise<SeedResult> => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useSeedTaskFeedTemplates] Starting seed for org:', organizationId);

      const result: SeedResult = {
        created: [],
        skipped: [],
        errors: [],
      };

      const { data: existingTemplates, error: fetchError } = await supabase
        .from('task_feed_templates')
        .select('name')
        .eq('organization_id', organizationId);

      if (fetchError) {
        console.error('[useSeedTaskFeedTemplates] Error fetching existing templates:', fetchError);
        throw fetchError;
      }

      const existingNames = new Set((existingTemplates || []).map(t => t.name));
      console.log('[useSeedTaskFeedTemplates] Existing templates:', existingNames.size);

      for (const template of INITIAL_TASK_FEED_TEMPLATES) {
        if (existingNames.has(template.name)) {
          console.log('[useSeedTaskFeedTemplates] Skipping existing template:', template.name);
          result.skipped.push(template.name);
          continue;
        }

        try {
          const { error: insertError } = await supabase
            .from('task_feed_templates')
            .insert({
              organization_id: organizationId,
              name: template.name,
              description: template.description,
              button_type: template.buttonType,
              triggering_department: template.triggeringDepartment,
              assigned_departments: template.assignedDepartments,
              form_fields: template.formFields,
              photo_required: template.photoRequired,
              workflow_rules: template.workflowRules || [],
              is_active: template.isActive ?? true,
              sort_order: template.sortOrder ?? 0,
              created_by: user ? `${user.first_name} ${user.last_name}` : 'System',
              created_by_id: user?.id,
            });

          if (insertError) {
            console.error('[useSeedTaskFeedTemplates] Error creating template:', template.name, insertError);
            result.errors.push(`${template.name}: ${insertError.message}`);
          } else {
            console.log('[useSeedTaskFeedTemplates] Created template:', template.name);
            result.created.push(template.name);
          }
        } catch (err: any) {
          console.error('[useSeedTaskFeedTemplates] Exception creating template:', template.name, err);
          result.errors.push(`${template.name}: ${err.message}`);
        }
      }

      console.log('[useSeedTaskFeedTemplates] Seed complete:', result);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      callbacks?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      console.error('[useSeedTaskFeedTemplates] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useSeedSingleTemplate(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (template: CreateTemplateInput): Promise<SeedResult> => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useSeedSingleTemplate] Seeding template:', template.name);

      const result: SeedResult = {
        created: [],
        skipped: [],
        errors: [],
      };

      const { data: existing } = await supabase
        .from('task_feed_templates')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', template.name)
        .single();

      if (existing) {
        console.log('[useSeedSingleTemplate] Template already exists:', template.name);
        result.skipped.push(template.name);
        return result;
      }

      const { error: insertError } = await supabase
        .from('task_feed_templates')
        .insert({
          organization_id: organizationId,
          name: template.name,
          description: template.description,
          button_type: template.buttonType,
          triggering_department: template.triggeringDepartment,
          assigned_departments: template.assignedDepartments,
          form_fields: template.formFields,
          photo_required: template.photoRequired,
          workflow_rules: template.workflowRules || [],
          is_active: template.isActive ?? true,
          sort_order: template.sortOrder ?? 0,
          created_by: user ? `${user.first_name} ${user.last_name}` : 'System',
          created_by_id: user?.id,
        });

      if (insertError) {
        console.error('[useSeedSingleTemplate] Error:', insertError);
        result.errors.push(`${template.name}: ${insertError.message}`);
      } else {
        console.log('[useSeedSingleTemplate] Created:', template.name);
        result.created.push(template.name);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      callbacks?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      console.error('[useSeedSingleTemplate] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}
