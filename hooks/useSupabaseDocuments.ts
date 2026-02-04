import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables, QueryOptions, fetchAll, fetchById, insertRecord, updateRecord, deleteRecord } from '@/lib/supabase';

type Document = Tables['documents'];
type DocumentVersion = Tables['document_versions'];
type DocumentCategory = Tables['document_categories'];
type DocumentAcknowledgment = Tables['document_acknowledgments'];

export type DocumentType = 'sop' | 'policy' | 'specification' | 'manual' | 'procedure' | 'form' | 'template' | 'training' | 'certificate' | 'other';
export type DocumentStatus = 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'active' | 'revision' | 'obsolete' | 'archived';

export interface DocumentWithVersions extends Document {
  versions?: DocumentVersion[];
  acknowledgment_count?: number;
}

export function useDocumentsQuery(options?: QueryOptions<Document> & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: ['documents', organizationId, filters, orderBy, limit, offset, select],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await fetchAll('documents', organizationId, { 
        filters, 
        orderBy: orderBy || { column: 'updated_at', ascending: false }, 
        limit, 
        offset, 
        select 
      });
      if (result.error) throw result.error;
      console.log('[useDocumentsQuery] Fetched documents:', result.data?.length || 0);
      return result.data || [];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('documents', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDocumentById] Fetched document:', result.data?.id);
      return result.data;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentsByType(documentType: DocumentType | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'byType', documentType, organizationId],
    queryFn: async () => {
      if (!organizationId || !documentType) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('document_type', documentType)
        .order('title', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useDocumentsByType] Fetched:', data?.length || 0, 'for type:', documentType);
      return (data || []) as Document[];
    },
    enabled: !!organizationId && !!documentType,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentsByStatus(status: DocumentStatus | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'byStatus', status, organizationId],
    queryFn: async () => {
      if (!organizationId || !status) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', status)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useDocumentsByStatus] Fetched:', data?.length || 0, 'for status:', status);
      return (data || []) as Document[];
    },
    enabled: !!organizationId && !!status,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentsByDepartment(departmentCode: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'byDepartment', departmentCode, organizationId],
    queryFn: async () => {
      if (!organizationId || !departmentCode) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('department_code', departmentCode)
        .order('title', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useDocumentsByDepartment] Fetched:', data?.length || 0, 'for dept:', departmentCode);
      return (data || []) as Document[];
    },
    enabled: !!organizationId && !!departmentCode,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExpiringDocuments(daysAhead: number = 30) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'expiring', daysAhead, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'approved'])
        .not('expiration_date', 'is', null)
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useExpiringDocuments] Fetched:', data?.length || 0, 'expiring within', daysAhead, 'days');
      return (data || []) as Document[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentsNeedingReview() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'needingReview', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'approved'])
        .not('review_date', 'is', null)
        .lte('review_date', today)
        .order('review_date', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useDocumentsNeedingReview] Fetched:', data?.length || 0);
      return (data || []) as Document[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDocument(options?: {
  onSuccess?: (data: Document) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (document: Omit<Document, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('documents', {
        ...document,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      console.log('[useCreateDocument] Created document:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateDocument] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateDocument(options?: {
  onSuccess?: (data: Document) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Document> }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await updateRecord('documents', id, updates, organizationId);
      if (result.error) throw result.error;
      console.log('[useUpdateDocument] Updated document:', id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateDocument] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteDocument(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await deleteRecord('documents', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteDocument] Deleted document:', id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteDocument] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Document Versions
export function useDocumentVersions(documentId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['document_versions', documentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !documentId) return [];
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('document_id', documentId)
        .order('revision_number', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useDocumentVersions] Fetched:', data?.length || 0, 'versions for doc:', documentId);
      return (data || []) as DocumentVersion[];
    },
    enabled: !!organizationId && !!documentId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDocumentVersion(options?: {
  onSuccess?: (data: DocumentVersion) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (version: Omit<DocumentVersion, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const result = await insertRecord('document_versions', {
        ...version,
        organization_id: organizationId,
      });
      
      if (result.error) throw result.error;
      console.log('[useCreateDocumentVersion] Created version:', result.data?.id);
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document_versions'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateDocumentVersion] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Document Categories
export function useDocumentCategories() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['document_categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[useDocumentCategories] Fetched:', data?.length || 0);
      return (data || []) as DocumentCategory[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

// Document Acknowledgments
export function useDocumentAcknowledgments(documentId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['document_acknowledgments', documentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !documentId) return [];
      const { data, error } = await supabase
        .from('document_acknowledgments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('document_id', documentId)
        .order('acknowledged_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useDocumentAcknowledgments] Fetched:', data?.length || 0, 'for doc:', documentId);
      return (data || []) as DocumentAcknowledgment[];
    },
    enabled: !!organizationId && !!documentId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDocumentAcknowledgment(options?: {
  onSuccess?: (data: DocumentAcknowledgment) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ack: Omit<DocumentAcknowledgment, 'id' | 'organization_id' | 'acknowledged_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('document_acknowledgments')
        .insert({
          ...ack,
          organization_id: organizationId,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useCreateDocumentAcknowledgment] Created acknowledgment:', data?.id);
      return data as DocumentAcknowledgment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document_acknowledgments'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateDocumentAcknowledgment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// Search documents
export function useSearchDocuments(searchTerm: string, options?: { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['documents', 'search', searchTerm, organizationId],
    queryFn: async () => {
      if (!organizationId || !searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`title.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw new Error(error.message);
      console.log('[useSearchDocuments] Found:', data?.length || 0, 'for term:', searchTerm);
      return (data || []) as Document[];
    },
    enabled: !!organizationId && !!searchTerm && searchTerm.length >= 2 && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}
