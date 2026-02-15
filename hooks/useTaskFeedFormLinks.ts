import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────

export interface TaskFeedPostSummary {
  id: string;
  postNumber: string;
  templateName: string;
  status: string;
  createdByName: string;
  createdAt: string;
  locationName: string | null;
  isProductionHold: boolean;
  holdStatus: string;
  formData: Record<string, any>;
}

export interface TaskFeedFormLink {
  id: string;
  postId: string;
  postNumber: string;
  formType: string;
  formId: string;
  formNumber: string | null;
  formTitle: string | null;
  linkedByName: string | null;
  linkedAt: string;
  departmentCode: string | null;
  departmentName: string | null;
}

// ── Fetch recent issue posts for the linker picker ────────────

export function useRecentIssuePosts(options?: { 
  limit?: number; 
  enabled?: boolean;
  search?: string;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_issue_posts', organizationId, options?.limit, options?.search],
    queryFn: async (): Promise<TaskFeedPostSummary[]> => {
      if (!organizationId) return [];

      let query = supabase
        .from('task_feed_posts')
        .select('id, post_number, template_name, status, created_by_name, created_at, location_name, is_production_hold, hold_status, form_data')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      // Search by post number or template name
      if (options?.search) {
        const search = options.search.toLowerCase();
        query = query.or(`post_number.ilike.%${search}%,template_name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useRecentIssuePosts] Error:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        postNumber: row.post_number,
        templateName: row.template_name || 'Unknown',
        status: row.status,
        createdByName: row.created_by_name || 'Unknown',
        createdAt: row.created_at,
        locationName: row.location_name,
        isProductionHold: row.is_production_hold ?? false,
        holdStatus: row.hold_status || 'none',
        formData: row.form_data || {},
      }));
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

// ── Create a form link ────────────────────────────────────────

export function useLinkFormToPost() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      postId: string;
      postNumber: string;
      formType: string;
      formId: string;
      formNumber?: string;
      formTitle?: string;
      departmentCode?: string;
      departmentName?: string;
    }) => {
      if (!organizationId || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_feed_form_links')
        .insert({
          organization_id: organizationId,
          post_id: input.postId,
          post_number: input.postNumber,
          form_type: input.formType,
          form_id: input.formId,
          form_number: input.formNumber || null,
          form_title: input.formTitle || null,
          linked_by_id: user.id,
          linked_by_name: `${user.first_name} ${user.last_name}`,
          department_code: input.departmentCode || null,
          department_name: input.departmentName || null,
        })
        .select()
        .single();

      if (error) {
        // Duplicate link — not an error
        if (error.code === '23505') {
          console.log('[useLinkFormToPost] Link already exists, skipping');
          return null;
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_form_links'] });
    },
  });
}

// ── Get links for a specific form ─────────────────────────────

export function useFormLinks(formType: string, formId: string | undefined, options?: { enabled?: boolean }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_form_links', 'by_form', organizationId, formType, formId],
    queryFn: async (): Promise<TaskFeedFormLink[]> => {
      if (!organizationId || !formId) return [];

      const { data, error } = await supabase
        .from('task_feed_form_links')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('form_type', formType)
        .eq('form_id', formId)
        .order('linked_at', { ascending: false });

      if (error) {
        console.error('[useFormLinks] Error:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        postId: row.post_id,
        postNumber: row.post_number,
        formType: row.form_type,
        formId: row.form_id,
        formNumber: row.form_number,
        formTitle: row.form_title,
        linkedByName: row.linked_by_name,
        linkedAt: row.linked_at,
        departmentCode: row.department_code,
        departmentName: row.department_name,
      }));
    },
    enabled: options?.enabled !== false && !!organizationId && !!formId,
  });
}

// ── Get links for a specific post ─────────────────────────────

export function usePostFormLinks(postId: string | undefined, options?: { enabled?: boolean }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_form_links', 'by_post', organizationId, postId],
    queryFn: async (): Promise<TaskFeedFormLink[]> => {
      if (!organizationId || !postId) return [];

      const { data, error } = await supabase
        .from('task_feed_form_links')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('post_id', postId)
        .order('linked_at', { ascending: false });

      if (error) {
        console.error('[usePostFormLinks] Error:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        postId: row.post_id,
        postNumber: row.post_number,
        formType: row.form_type,
        formId: row.form_id,
        formNumber: row.form_number,
        formTitle: row.form_title,
        linkedByName: row.linked_by_name,
        linkedAt: row.linked_at,
        departmentCode: row.department_code,
        departmentName: row.department_name,
      }));
    },
    enabled: options?.enabled !== false && !!organizationId && !!postId,
  });
}

// ── Delete a form link ────────────────────────────────────────

export function useUnlinkForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('task_feed_form_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_form_links'] });
    },
  });
}
