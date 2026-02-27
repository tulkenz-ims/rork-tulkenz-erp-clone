// hooks/useCustomForms.ts
// CRUD operations for custom form templates and submissions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────

export interface CustomFormField {
  id: string;
  label: string;
  fieldType: 'text_input' | 'text_area' | 'number' | 'date' | 'time' | 'dropdown' | 'radio' | 'checkbox' | 'pass_fail' | 'initials' | 'label';
  required: boolean;
  width: 'full' | 'half' | 'third';
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
  defaultValue?: string;
}

export interface CustomFormSection {
  id: string;
  title: string;
  fields: CustomFormField[];
}

export interface CustomFormSignature {
  id: string;
  label: string;
  required: boolean;
}

export interface CustomFormSchema {
  name: string;
  description: string;
  docId: string;
  category: string;
  complianceRefs: string[];
  sections: CustomFormSection[];
  signatures: CustomFormSignature[];
}

export interface CustomFormTemplate {
  id: string;
  templateCode: string;
  name: string;
  description: string | null;
  category: string;
  departmentCode: string | null;
  formSchema: CustomFormSchema;
  version: number;
  status: string;
  parentVersionId: string | null;
  sourceType: string;
  sourcePdfUrl: string | null;
  complianceRefs: string[] | null;
  organizationId: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFormSubmission {
  id: string;
  templateId: string;
  templateCode: string;
  templateVersion: number;
  formNumber: string;
  title: string;
  status: string;
  formData: Record<string, any>;
  signatures: any[];
  linkedPostId: string | null;
  linkedPostNumber: string | null;
  organizationId: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Row Mappers ───────────────────────────────────────────────

function mapTemplate(row: any): CustomFormTemplate {
  return {
    id: row.id,
    templateCode: row.template_code,
    name: row.name,
    description: row.description,
    category: row.category,
    departmentCode: row.department_code,
    formSchema: row.form_schema,
    version: row.version,
    status: row.status,
    parentVersionId: row.parent_version_id,
    sourceType: row.source_type,
    sourcePdfUrl: row.source_pdf_url,
    complianceRefs: row.compliance_refs,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubmission(row: any): CustomFormSubmission {
  return {
    id: row.id,
    templateId: row.template_id,
    templateCode: row.template_code,
    templateVersion: row.template_version,
    formNumber: row.form_number,
    title: row.title,
    status: row.status,
    formData: row.form_data,
    signatures: row.signatures,
    linkedPostId: row.linked_post_id,
    linkedPostNumber: row.linked_post_number,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Fetch Active Templates ────────────────────────────────────

export function useCustomFormTemplates(options?: { status?: string; category?: string }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['custom_form_templates', organizationId, options?.status, options?.category],
    queryFn: async (): Promise<CustomFormTemplate[]> => {
      if (!organizationId) return [];

      let query = supabase
        .from('custom_form_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (options?.status) {
        query = query.eq('status', options.status);
      } else {
        // Default: active + draft (not archived)
        query = query.in('status', ['active', 'draft']);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;
      if (error) { console.error('[useCustomFormTemplates]', error); return []; }
      return (data || []).map(mapTemplate);
    },
    enabled: !!organizationId,
  });
}

// ── Fetch Single Template ─────────────────────────────────────

export function useCustomFormTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['custom_form_template', templateId],
    queryFn: async (): Promise<CustomFormTemplate | null> => {
      if (!templateId) return null;
      const { data, error } = await supabase
        .from('custom_form_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (error) { console.error('[useCustomFormTemplate]', error); return null; }
      return mapTemplate(data);
    },
    enabled: !!templateId,
  });
}

// ── Fetch Version History ─────────────────────────────────────

export function useTemplateVersions(templateCode: string | undefined) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['custom_form_template_versions', organizationId, templateCode],
    queryFn: async (): Promise<CustomFormTemplate[]> => {
      if (!organizationId || !templateCode) return [];
      const { data, error } = await supabase
        .from('custom_form_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_code', templateCode)
        .order('version', { ascending: false });
      if (error) { console.error('[useTemplateVersions]', error); return []; }
      return (data || []).map(mapTemplate);
    },
    enabled: !!organizationId && !!templateCode,
  });
}

// ── Create Template ───────────────────────────────────────────

export function useCreateTemplate() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      templateCode: string;
      name: string;
      description?: string;
      category: string;
      departmentCode?: string;
      formSchema: CustomFormSchema;
      sourceType?: string;
      sourcePdfUrl?: string;
      complianceRefs?: string[];
      status?: string;
    }) => {
      if (!organizationId || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('custom_form_templates')
        .insert({
          template_code: input.templateCode,
          name: input.name,
          description: input.description || null,
          category: input.category,
          department_code: input.departmentCode || null,
          form_schema: input.formSchema,
          version: 1,
          status: input.status || 'active',
          source_type: input.sourceType || 'manual',
          source_pdf_url: input.sourcePdfUrl || null,
          compliance_refs: input.complianceRefs || null,
          organization_id: organizationId,
          created_by: user.id,
          created_by_name: `${user.first_name} ${user.last_name}`,
        })
        .select()
        .single();

      if (error) throw error;
      return mapTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_form_templates'] });
    },
  });
}

// ── Update Template (creates new version, archives old) ───────

export function useUpdateTemplate() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      existingTemplateId: string;
      templateCode: string;
      name: string;
      description?: string;
      category: string;
      departmentCode?: string;
      formSchema: CustomFormSchema;
      currentVersion: number;
      complianceRefs?: string[];
    }) => {
      if (!organizationId || !user) throw new Error('Not authenticated');

      // 1. Archive the current active version
      const { error: archiveError } = await supabase
        .from('custom_form_templates')
        .update({ status: 'archived' })
        .eq('id', input.existingTemplateId);

      if (archiveError) throw archiveError;

      // 2. Create new version
      const { data, error } = await supabase
        .from('custom_form_templates')
        .insert({
          template_code: input.templateCode,
          name: input.name,
          description: input.description || null,
          category: input.category,
          department_code: input.departmentCode || null,
          form_schema: input.formSchema,
          version: input.currentVersion + 1,
          status: 'active',
          parent_version_id: input.existingTemplateId,
          source_type: 'manual',
          compliance_refs: input.complianceRefs || null,
          organization_id: organizationId,
          created_by: user.id,
          created_by_name: `${user.first_name} ${user.last_name}`,
        })
        .select()
        .single();

      if (error) throw error;
      return mapTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_form_templates'] });
      queryClient.invalidateQueries({ queryKey: ['custom_form_template_versions'] });
    },
  });
}

// ── Archive Template (soft delete) ────────────────────────────

export function useArchiveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('custom_form_templates')
        .update({ status: 'archived' })
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_form_templates'] });
    },
  });
}

// ── Restore Archived Template ─────────────────────────────────

export function useRestoreTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('custom_form_templates')
        .update({ status: 'active' })
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_form_templates'] });
    },
  });
}

// ── Hard Delete Template ──────────────────────────────────────

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('custom_form_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_form_templates'] });
    },
  });
}

// ── Fetch Submissions for a Template ──────────────────────────

export function useFormSubmissions(templateCode: string | undefined, options?: { limit?: number }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['custom_form_submissions', organizationId, templateCode, options?.limit],
    queryFn: async (): Promise<CustomFormSubmission[]> => {
      if (!organizationId || !templateCode) return [];
      const { data, error } = await supabase
        .from('custom_form_submissions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('template_code', templateCode)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);
      if (error) { console.error('[useFormSubmissions]', error); return []; }
      return (data || []).map(mapSubmission);
    },
    enabled: !!organizationId && !!templateCode,
  });
}

// ── Fetch Single Submission ───────────────────────────────────

export function useFormSubmission(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['custom_form_submission', submissionId],
    queryFn: async (): Promise<CustomFormSubmission | null> => {
      if (!submissionId) return null;
      const { data, error } = await supabase
        .from('custom_form_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      if (error) { console.error('[useFormSubmission]', error); return null; }
      return mapSubmission(data);
    },
    enabled: !!submissionId,
  });
}

// ── Submit Form ───────────────────────────────────────────────

export function useSubmitCustomForm() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      templateId: string;
      templateCode: string;
      templateVersion: number;
      title: string;
      formData: Record<string, any>;
      signatures: any[];
      status?: string;
      linkedPostId?: string;
      linkedPostNumber?: string;
    }) => {
      if (!organizationId || !user) throw new Error('Not authenticated');

      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const rand = Math.floor(Math.random() * 9000 + 1000);
      const formNumber = `${input.templateCode}-${dateStr}-${rand}`;

      const { data, error } = await supabase
        .from('custom_form_submissions')
        .insert({
          template_id: input.templateId,
          template_code: input.templateCode,
          template_version: input.templateVersion,
          form_number: formNumber,
          title: input.title,
          status: input.status || 'submitted',
          form_data: input.formData,
          signatures: input.signatures,
          linked_post_id: input.linkedPostId || null,
          linked_post_number: input.linkedPostNumber || null,
          organization_id: organizationId,
          created_by: user.id,
          created_by_name: `${user.first_name} ${user.last_name}`,
        })
        .select()
        .single();

      if (error) throw error;
      return mapSubmission(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom_form_submissions'] });
    },
  });
}

// ── AI Parse PDF ──────────────────────────────────────────────

export async function parsePdfToSchema(
  base64Data: string,
  mimeType: string,
  instructions?: string
): Promise<CustomFormSchema> {
  const isPdf = mimeType === 'application/pdf';

  const response = await fetch('/api/parse-form-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(isPdf ? { pdfBase64: base64Data } : { imageBase64: base64Data }),
      mimeType,
      instructions,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to parse form');
  }

  const { schema } = await response.json();
  return schema as CustomFormSchema;
}
