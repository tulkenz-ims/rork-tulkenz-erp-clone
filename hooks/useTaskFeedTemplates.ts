import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import {
  TaskFeedTemplate,
  TaskFeedPost,
  TaskFeedDepartmentTask,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreatePostInput,
  CompleteTaskInput,
  ButtonType,
  FormField,
  WorkflowRule,
} from '@/types/taskFeedTemplates';

interface MutationCallbacks<T = any> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

const mapTemplateFromDb = (row: any): TaskFeedTemplate => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  description: row.description,
  buttonType: row.button_type as ButtonType,
  triggeringDepartment: row.triggering_department,
  assignedDepartments: row.assigned_departments || [],
  formFields: (row.form_fields || []) as FormField[],
  photoRequired: row.photo_required,
  workflowRules: (row.workflow_rules || []) as WorkflowRule[],
  isActive: row.is_active,
  sortOrder: row.sort_order,
  usageCount: row.usage_count,
  createdBy: row.created_by,
  createdById: row.created_by_id,
  updatedBy: row.updated_by,
  updatedById: row.updated_by_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPostFromDb = (row: any): TaskFeedPost => ({
  id: row.id,
  organizationId: row.organization_id,
  postNumber: row.post_number,
  templateId: row.template_id,
  templateName: row.template_name,
  templateSnapshot: row.template_snapshot,
  createdById: row.created_by_id,
  createdByName: row.created_by_name,
  facilityId: row.facility_id,
  facilityName: row.facility_name,
  locationId: row.location_id,
  locationName: row.location_name,
  formData: row.form_data || {},
  photoUrl: row.photo_url,
  additionalPhotos: row.additional_photos || [],
  notes: row.notes,
  status: row.status,
  totalDepartments: row.total_departments,
  completedDepartments: row.completed_departments,
  completionRate: row.completion_rate,
  completedAt: row.completed_at,
  originatingDepartmentCode: row.originating_department_code,
  originatingDepartmentName: row.originating_department_name,
  requiresAllSignoff: row.requires_all_signoff ?? true,
  finalSignoffById: row.final_signoff_by_id,
  finalSignoffByName: row.final_signoff_by_name,
  finalSignoffAt: row.final_signoff_at,
  finalSignoffNotes: row.final_signoff_notes,
  isProductionHold: row.is_production_hold ?? false,
  productionLine: row.production_line,
  roomId: row.room_id,
  roomName: row.room_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDepartmentTaskFromDb = (row: any): TaskFeedDepartmentTask & { task_feed_posts?: any } => ({
  id: row.id,
  organizationId: row.organization_id,
  postId: row.post_id,
  postNumber: row.post_number,
  departmentCode: row.department_code,
  departmentName: row.department_name,
  status: row.status,
  completedById: row.completed_by_id,
  completedByName: row.completed_by_name,
  completedAt: row.completed_at,
  completionNotes: row.completion_notes,
  moduleHistoryType: row.module_history_type,
  moduleHistoryId: row.module_history_id,
  formType: row.form_type,
  formRoute: row.form_route,
  formResponse: row.form_response || {},
  formPhotos: row.form_photos || [],
  isOriginal: row.is_original ?? false,
  escalatedFromDepartment: row.escalated_from_department,
  escalatedFromTaskId: row.escalated_from_task_id,
  escalationReason: row.escalation_reason,
  escalatedAt: row.escalated_at,
  requiresSignoff: row.requires_signoff ?? false,
  signoffDepartmentCode: row.signoff_department_code,
  signoffById: row.signoff_by_id,
  signoffByName: row.signoff_by_name,
  signoffAt: row.signoff_at,
  signoffNotes: row.signoff_notes,
  priority: row.priority || 'medium',
  startedAt: row.started_at,
  startedById: row.started_by_id,
  startedByName: row.started_by_name,
  assignedAt: row.assigned_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  task_feed_posts: row.task_feed_posts,
});

export function useTaskFeedTemplatesQuery(options?: {
  buttonType?: ButtonType;
  triggeringDepartment?: string;
  activeOnly?: boolean;
  enabled?: boolean;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_templates', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useTaskFeedTemplatesQuery] Fetching templates for org:', organizationId);

      let query = supabase
        .from('task_feed_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (options?.buttonType) {
        query = query.eq('button_type', options.buttonType);
      }

      if (options?.triggeringDepartment) {
        query = query.or(`triggering_department.eq.${options.triggeringDepartment},triggering_department.eq.any`);
      }

      if (options?.activeOnly !== false) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        const errorMessage = error.message || error.code || JSON.stringify(error);
        console.error('[useTaskFeedTemplatesQuery] Error:', errorMessage);
        console.error('[useTaskFeedTemplatesQuery] Error code:', error.code);
        console.error('[useTaskFeedTemplatesQuery] Error details:', error.details);
        // If table doesn't exist or fetch failed, return empty array instead of throwing
        if (error.code === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('Failed to fetch')) {
          console.warn('[useTaskFeedTemplatesQuery] Table may not exist, returning empty array');
          return [];
        }
        throw new Error(errorMessage);
      }

      console.log('[useTaskFeedTemplatesQuery] Found templates:', data?.length || 0);
      return (data || []).map(mapTemplateFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

export function useTaskFeedTemplateQuery(templateId: string, options?: { enabled?: boolean }) {
  useOrganization();

  return useQuery({
    queryKey: ['task_feed_template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      console.log('[useTaskFeedTemplateQuery] Fetching template:', templateId);

      const { data, error } = await supabase
        .from('task_feed_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('[useTaskFeedTemplateQuery] Error:', error);
        throw error;
      }

      return data ? mapTemplateFromDb(data) : null;
    },
    enabled: options?.enabled !== false && !!templateId,
  });
}

export function useCreateTaskFeedTemplate(callbacks?: MutationCallbacks<TaskFeedTemplate>) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[useCreateTaskFeedTemplate] Creating template:', input.name);
      console.log('[useCreateTaskFeedTemplate] Organization ID:', organizationId);
      console.log('[useCreateTaskFeedTemplate] User ID:', user.id);

      const insertData = {
        organization_id: organizationId,
        name: input.name,
        description: input.description || null,
        button_type: input.buttonType,
        triggering_department: input.triggeringDepartment,
        assigned_departments: input.assignedDepartments,
        form_fields: input.formFields || [],
        photo_required: input.photoRequired ?? true,
        workflow_rules: input.workflowRules || [],
        is_active: input.isActive ?? true,
        sort_order: input.sortOrder ?? 0,
        created_by: user ? `${user.first_name} ${user.last_name}` : 'System',
        created_by_id: user?.id,
      };

      console.log('[useCreateTaskFeedTemplate] Insert data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('task_feed_templates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        const errorMessage = error.message || error.details || error.hint || JSON.stringify(error);
        console.error('[useCreateTaskFeedTemplate] Error:', errorMessage);
        console.error('[useCreateTaskFeedTemplate] Error code:', error.code);
        console.error('[useCreateTaskFeedTemplate] Error details:', error.details);
        console.error('[useCreateTaskFeedTemplate] Error hint:', error.hint);
        throw new Error(`Failed to create template: ${errorMessage}`);
      }

      console.log('[useCreateTaskFeedTemplate] Template created:', data.id);
      return mapTemplateFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[useCreateTaskFeedTemplate] Mutation error:', errorMessage);
      callbacks?.onError?.(error);
    },
  });
}

export function useUpdateTaskFeedTemplate(callbacks?: MutationCallbacks<TaskFeedTemplate>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      console.log('[useUpdateTaskFeedTemplate] Updating template:', input.id);

      const updateData: any = {
        updated_by: user ? `${user.first_name} ${user.last_name}` : 'System',
        updated_by_id: user?.id,
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.buttonType !== undefined) updateData.button_type = input.buttonType;
      if (input.triggeringDepartment !== undefined) updateData.triggering_department = input.triggeringDepartment;
      if (input.assignedDepartments !== undefined) updateData.assigned_departments = input.assignedDepartments;
      if (input.formFields !== undefined) updateData.form_fields = input.formFields;
      if (input.photoRequired !== undefined) updateData.photo_required = input.photoRequired;
      if (input.workflowRules !== undefined) updateData.workflow_rules = input.workflowRules;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;
      if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

      console.log('[useUpdateTaskFeedTemplate] Update data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('task_feed_templates')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        const errorMessage = error.message || error.details || error.hint || JSON.stringify(error);
        console.error('[useUpdateTaskFeedTemplate] Error:', errorMessage);
        console.error('[useUpdateTaskFeedTemplate] Error code:', error.code);
        throw new Error(`Failed to update template: ${errorMessage}`);
      }

      console.log('[useUpdateTaskFeedTemplate] Template updated:', data.id);
      return mapTemplateFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_template', data.id] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[useUpdateTaskFeedTemplate] Mutation error:', errorMessage);
      callbacks?.onError?.(error);
    },
  });
}

export function useDeleteTaskFeedTemplate(callbacks?: MutationCallbacks<string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      console.log('[useDeleteTaskFeedTemplate] Deactivating template:', templateId);

      const { error } = await supabase
        .from('task_feed_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) {
        console.error('[useDeleteTaskFeedTemplate] Error:', error);
        throw error;
      }

      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      callbacks?.onSuccess?.(templateId);
    },
    onError: (error: Error) => {
      console.error('[useDeleteTaskFeedTemplate] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useTaskFeedPostsQuery(options?: {
  status?: TaskFeedPost['status'];
  templateId?: string;
  facilityId?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_posts', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useTaskFeedPostsQuery] Fetching posts for org:', organizationId);

      let query = supabase
        .from('task_feed_posts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.templateId) {
        query = query.eq('template_id', options.templateId);
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTaskFeedPostsQuery] Error:', error);
        throw error;
      }

      return (data || []).map(mapPostFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

export function useTaskFeedPostsWithTasksQuery(options?: {
  status?: TaskFeedPost['status'];
  templateId?: string;
  facilityId?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_posts_with_tasks', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useTaskFeedPostsWithTasksQuery] Fetching posts with department tasks');

      let query = supabase
        .from('task_feed_posts')
        .select(`
          *,
          task_feed_department_tasks (
            id,
            department_code,
            department_name,
            status,
            completed_by_id,
            completed_by_name,
            completed_at,
            completion_notes,
            assigned_at
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.templateId) {
        query = query.eq('template_id', options.templateId);
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTaskFeedPostsWithTasksQuery] Error:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        ...mapPostFromDb(row),
        departmentTasks: (row.task_feed_department_tasks || []).map((t: any) => ({
          id: t.id,
          departmentCode: t.department_code,
          departmentName: t.department_name,
          status: t.status,
          completedById: t.completed_by_id,
          completedByName: t.completed_by_name,
          completedAt: t.completed_at,
          completionNotes: t.completion_notes,
          assignedAt: t.assigned_at,
        })),
      }));
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

export function useDepartmentTasksForPostQuery(postId: string, options?: { enabled?: boolean }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_department_tasks_for_post', organizationId, postId],
    queryFn: async () => {
      if (!organizationId || !postId) return [];

      console.log('[useDepartmentTasksForPostQuery] Fetching tasks for post:', postId);

      const { data, error } = await supabase
        .from('task_feed_department_tasks')
        .select('*')
        .eq('post_id', postId)
        .order('department_code', { ascending: true });

      if (error) {
        console.error('[useDepartmentTasksForPostQuery] Error:', error);
        throw error;
      }

      return (data || []).map(mapDepartmentTaskFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId && !!postId,
  });
}

export function useDepartmentTasksQuery(options?: {
  departmentCode?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'signed_off';
  statusIn?: string[];
  limit?: number;
  enabled?: boolean;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_department_tasks', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useDepartmentTasksQuery] Fetching department tasks');

      let query = supabase
        .from('task_feed_department_tasks')
        .select(`
          *,
          task_feed_posts (
            id,
            post_number,
            template_name,
            form_data,
            photo_url,
            notes,
            status,
            created_at,
            created_by_name,
            location_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('assigned_at', { ascending: false });

      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
      }

      if (options?.statusIn && options.statusIn.length > 0) {
        query = query.in('status', options.statusIn);
      } else if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useDepartmentTasksQuery] Error:', error);
        throw error;
      }

      return (data || []).map(mapDepartmentTaskFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

export function useCompleteDepartmentTask(callbacks?: MutationCallbacks<TaskFeedDepartmentTask>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: CompleteTaskInput) => {
      console.log('[useCompleteDepartmentTask] Completing task:', input.taskId);

      const { data, error } = await supabase
        .from('task_feed_department_tasks')
        .update({
          status: 'completed',
          completed_by_id: user?.id,
          completed_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          completed_at: new Date().toISOString(),
          completion_notes: input.completionNotes,
        })
        .eq('id', input.taskId)
        .select()
        .single();

      if (error) {
        console.error('[useCompleteDepartmentTask] Error:', error);
        throw error;
      }

      return mapDepartmentTaskFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('[useCompleteDepartmentTask] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

async function compressImageOnWeb(photoUri: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        console.log('[compressImageOnWeb] Compressed image from', img.width, 'x', img.height, 'to', width, 'x', height);
        resolve(compressedDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = photoUri;
  });
}

async function convertToBase64DataUrl(photoUri: string, compress: boolean = true): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      if (compress) {
        try {
          const compressed = await compressImageOnWeb(photoUri, 800, 0.7);
          console.log('[convertToBase64DataUrl] Web - compressed image size:', Math.round(compressed.length / 1024), 'KB');
          return compressed;
        } catch (compressError) {
          console.warn('[convertToBase64DataUrl] Compression failed, falling back to original:', compressError);
        }
      }
      
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          console.log('[convertToBase64DataUrl] Web - base64 size:', Math.round(result.length / 1024), 'KB');
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[convertToBase64DataUrl] Web error:', error);
      return photoUri;
    }
  } else {
    try {
      const ImageManipulator = await import('expo-image-manipulator');
      
      if (compress) {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            photoUri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          
          if (manipulated.base64) {
            console.log('[convertToBase64DataUrl] Native - compressed image');
            return `data:image/jpeg;base64,${manipulated.base64}`;
          }
        } catch (manipError) {
          console.warn('[convertToBase64DataUrl] ImageManipulator failed, falling back:', manipError);
        }
      }
      
      const FileSystem = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const uriParts = photoUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('[convertToBase64DataUrl] Native error:', error);
      return photoUri;
    }
  }
}

async function uploadPhotoToStorage(
  photoUri: string,
  organizationId: string,
  postNumber: string,
  photoIndex: number = 0
): Promise<string | null> {
  try {
    console.log('[uploadPhotoToStorage] Starting upload for:', postNumber, 'index:', photoIndex);
    
    if (!photoUri) {
      console.log('[uploadPhotoToStorage] No photo URI provided');
      return null;
    }

    // If already a data URL, compress it if too large
    if (photoUri.startsWith('data:')) {
      console.log('[uploadPhotoToStorage] Already a data URL, size:', Math.round(photoUri.length / 1024), 'KB');
      // If data URL is too large (>500KB), try to compress it
      if (photoUri.length > 500 * 1024) {
        console.log('[uploadPhotoToStorage] Data URL too large, compressing...');
        const compressed = await convertToBase64DataUrl(photoUri, true);
        console.log('[uploadPhotoToStorage] Compressed size:', Math.round(compressed.length / 1024), 'KB');
        return compressed;
      }
      return photoUri;
    }

    // For web, try to convert blob URL to base64 and upload
    if (Platform.OS === 'web') {
      console.log('[uploadPhotoToStorage] Web platform - attempting to upload blob');
      try {
        // First compress the image
        let compressedDataUrl: string;
        try {
          compressedDataUrl = await compressImageOnWeb(photoUri, 800, 0.7);
          console.log('[uploadPhotoToStorage] Web - compressed image size:', Math.round(compressedDataUrl.length / 1024), 'KB');
        } catch (compressError) {
          console.warn('[uploadPhotoToStorage] Compression failed, using original:', compressError);
          const response = await fetch(photoUri);
          const blob = await response.blob();
          compressedDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        
        const base64 = compressedDataUrl.split(',')[1];
        const contentType = 'image/jpeg';
        
        const timestamp = Date.now();
        const fileName = `task-feed/${organizationId}/${postNumber}-${photoIndex}-${timestamp}.jpg`;
        
        console.log('[uploadPhotoToStorage] Web - Uploading to:', fileName);
        
        const { error: uploadError } = await supabase.storage
          .from('task-feed-photos')
          .upload(fileName, decode(base64), {
            contentType,
            upsert: true,
          });
        
        if (uploadError) {
          // RLS policy or bucket not configured - use base64 fallback silently
          console.log('[uploadPhotoToStorage] Storage not available, using base64 fallback');
          return compressedDataUrl;
        }
        
        const { data: urlData } = supabase.storage
          .from('task-feed-photos')
          .getPublicUrl(fileName);
        
        console.log('[uploadPhotoToStorage] Web upload successful:', urlData?.publicUrl);
        return urlData?.publicUrl || compressedDataUrl;
      } catch (webError) {
        console.error('[uploadPhotoToStorage] Web blob processing error:', webError);
        const fallbackDataUrl = await convertToBase64DataUrl(photoUri, true);
        return fallbackDataUrl;
      }
    }

    // Native platform - try to compress first
    try {
      const ImageManipulator = await import('expo-image-manipulator');
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      if (manipulated.base64) {
        const contentType = 'image/jpeg';
        const timestamp = Date.now();
        const fileName = `task-feed/${organizationId}/${postNumber}-${photoIndex}-${timestamp}.jpg`;

        console.log('[uploadPhotoToStorage] Native - Uploading compressed image to:', fileName);

        const { error: uploadError } = await supabase.storage
          .from('task-feed-photos')
          .upload(fileName, decode(manipulated.base64), {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          // RLS policy or bucket not configured - use base64 fallback silently
          console.log('[uploadPhotoToStorage] Storage not available, using base64 fallback');
          return `data:${contentType};base64,${manipulated.base64}`;
        }

        const { data: urlData } = supabase.storage
          .from('task-feed-photos')
          .getPublicUrl(fileName);

        console.log('[uploadPhotoToStorage] Upload successful:', urlData?.publicUrl);
        return urlData?.publicUrl || `data:${contentType};base64,${manipulated.base64}`;
      }
    } catch (manipError) {
      console.warn('[uploadPhotoToStorage] ImageManipulator failed:', manipError);
    }

    // Fallback: read file directly
    const FileSystem = await import('expo-file-system');
    
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const uriParts = photoUri.split('.');
    const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
    const contentType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

    const timestamp = Date.now();
    const fileName = `task-feed/${organizationId}/${postNumber}-${photoIndex}-${timestamp}.${fileExtension}`;

    console.log('[uploadPhotoToStorage] Uploading to:', fileName);

    const { error: uploadError } = await supabase.storage
      .from('task-feed-photos')
      .upload(fileName, decode(base64), {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      // RLS policy or bucket not configured - use base64 fallback silently
      console.log('[uploadPhotoToStorage] Storage not available, using base64 fallback');
      return `data:${contentType};base64,${base64}`;
    }

    const { data: urlData } = supabase.storage
      .from('task-feed-photos')
      .getPublicUrl(fileName);

    console.log('[uploadPhotoToStorage] Upload successful:', urlData?.publicUrl);
    return urlData?.publicUrl || `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('[uploadPhotoToStorage] Exception:', error);
    const fallbackDataUrl = await convertToBase64DataUrl(photoUri, true);
    return fallbackDataUrl;
  }
}

async function uploadMultiplePhotos(
  photoUris: string[],
  organizationId: string,
  postNumber: string
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  const maxPhotos = 10;
  
  // Limit to max photos
  const photosToUpload = photoUris.slice(0, maxPhotos);
  console.log('[uploadMultiplePhotos] Uploading', photosToUpload.length, 'photos (max:', maxPhotos, ')');
  
  // Upload photos in parallel for better performance
  const uploadPromises = photosToUpload.map(async (uri, index) => {
    if (uri) {
      try {
        const uploadedUrl = await uploadPhotoToStorage(uri, organizationId, postNumber, index + 1);
        return uploadedUrl;
      } catch (err) {
        console.error('[uploadMultiplePhotos] Error uploading photo', index, ':', err);
        return null;
      }
    }
    return null;
  });
  
  const results = await Promise.all(uploadPromises);
  
  for (const url of results) {
    if (url) {
      uploadedUrls.push(url);
    }
  }
  
  console.log('[uploadMultiplePhotos] Successfully uploaded', uploadedUrls.length, 'photos');
  return uploadedUrls;
}

function generatePostNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TF-${year}${month}${day}-${random}`;
}

export function useCreateTaskFeedPost(callbacks?: MutationCallbacks<TaskFeedPost & { totalDepartments: number }>) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[useCreateTaskFeedPost] Creating post with template:', input.templateId);

      // Step 1: Fetch the template to capture snapshot and assigned departments
      const { data: templateData, error: templateError } = await supabase
        .from('task_feed_templates')
        .select('*')
        .eq('id', input.templateId)
        .single();

      if (templateError) {
        console.error('[useCreateTaskFeedPost] Error fetching template:', templateError);
        throw templateError;
      }

      const template = mapTemplateFromDb(templateData);
      const assignedDepartments = template.assignedDepartments || [];
      const triggeringDepartment = template.triggeringDepartment;

      // Step 2: Generate unique post number (TF-YYMMDD-XXXXXX format)
      const postNumber = generatePostNumber();
      console.log('[useCreateTaskFeedPost] Generated post number:', postNumber);

      // Step 3: Upload photos to storage (if provided)
      let photoUrl = input.photoUrl || null;
      let additionalPhotos: string[] = [];
      
      if (input.photoUrl) {
        console.log('[useCreateTaskFeedPost] Uploading primary photo...');
        photoUrl = await uploadPhotoToStorage(input.photoUrl, organizationId, postNumber, 0);
        console.log('[useCreateTaskFeedPost] Primary photo URL:', photoUrl);
      }
      
      if (input.additionalPhotos && input.additionalPhotos.length > 0) {
        console.log('[useCreateTaskFeedPost] Uploading', input.additionalPhotos.length, 'additional photos...');
        additionalPhotos = await uploadMultiplePhotos(input.additionalPhotos, organizationId, postNumber);
        console.log('[useCreateTaskFeedPost] Additional photos uploaded:', additionalPhotos.length);
      }

      // Try to extract location from form data if not provided directly
      const locationFromForm = input.locationName || 
        input.formData?.location || 
        input.formData?.area || 
        input.formData?.room || 
        input.formData?.where;

      // Step 4: Create the main task_feed_posts record
      const insertData = {
        organization_id: organizationId,
        post_number: postNumber,
        template_id: input.templateId,
        template_name: template.name,
        template_snapshot: templateData,
        created_by_id: user.id,
        created_by_name: `${user.first_name} ${user.last_name}`,
        facility_id: input.facilityId || facilityId || null,
        location_id: input.locationId || null,
        location_name: locationFromForm || null,
        form_data: input.formData || {},
        photo_url: photoUrl || null,
        additional_photos: additionalPhotos || [],
        notes: input.notes || null,
        status: assignedDepartments.length > 0 ? 'pending' : 'completed',
        total_departments: assignedDepartments.length,
        completed_departments: 0,
        completion_rate: assignedDepartments.length === 0 ? 100 : 0,
        completed_at: assignedDepartments.length === 0 ? new Date().toISOString() : null,
      };

      console.log('[useCreateTaskFeedPost] Insert data:', JSON.stringify(insertData, null, 2));

      const { data: postData, error: postError } = await supabase
        .from('task_feed_posts')
        .insert(insertData)
        .select()
        .single();

      if (postError) {
        const errorMessage = postError.message || postError.details || postError.hint || JSON.stringify(postError);
        console.error('[useCreateTaskFeedPost] Error creating post:', errorMessage);
        console.error('[useCreateTaskFeedPost] Error code:', postError.code);
        console.error('[useCreateTaskFeedPost] Error details:', postError.details);
        console.error('[useCreateTaskFeedPost] Error hint:', postError.hint);
        throw new Error(`Failed to create post: ${errorMessage}`);
      }

      console.log('[useCreateTaskFeedPost] Post created:', postData.id, postNumber);

      // Step 5: Create task_feed_department_tasks records for each assigned department
      if (assignedDepartments.length > 0) {
        const departmentTasks = assignedDepartments.map((deptCode: string) => ({
          organization_id: organizationId,
          post_id: postData.id,
          post_number: postNumber,
          department_code: deptCode,
          department_name: getDepartmentNameFromCode(deptCode),
          status: 'pending',
        }));

        const { error: tasksError } = await supabase
          .from('task_feed_department_tasks')
          .insert(departmentTasks);

        if (tasksError) {
          console.error('[useCreateTaskFeedPost] Error creating department tasks:', tasksError);
        } else {
          console.log('[useCreateTaskFeedPost] Created', assignedDepartments.length, 'department tasks');
        }

        // Step 5b: Create notifications for each assigned department
        const notificationPriority = template.buttonType === 'report_issue' ? 'high' : 'normal';
        const notificationType = template.buttonType === 'report_issue' ? 'task_feed_urgent' : 'task_feed_assigned';
        
        const notifications = assignedDepartments.map((deptCode: string) => ({
          organization_id: organizationId,
          target_type: 'department',
          target_department_code: deptCode,
          title: `New Task Assigned: ${template.name}`,
          message: `${postNumber} requires action from ${getDepartmentNameFromCode(deptCode)}. ${input.locationName ? `Location: ${input.locationName}` : ''}`,
          notification_type: notificationType,
          priority: notificationPriority,
          source_type: 'task_feed_post',
          source_id: postData.id,
          source_number: postNumber,
          action_url: `/taskfeed`,
          action_label: 'View Task',
          metadata: {
            templateId: template.id,
            templateName: template.name,
            buttonType: template.buttonType,
            locationName: input.locationName,
            createdBy: user ? `${user.first_name} ${user.last_name}` : 'System',
          },
        }));

        try {
          const { error: notifyError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifyError) {
            console.error('[useCreateTaskFeedPost] Error creating notifications:', notifyError.message || JSON.stringify(notifyError));
            console.error('[useCreateTaskFeedPost] Notification error code:', notifyError.code);
            console.error('[useCreateTaskFeedPost] Notification error details:', notifyError.details);
            console.error('[useCreateTaskFeedPost] Notification error hint:', notifyError.hint);
          } else {
            console.log('[useCreateTaskFeedPost] Created', assignedDepartments.length, 'notifications');
          }
        } catch (notifyErr) {
          console.error('[useCreateTaskFeedPost] Exception creating notifications:', notifyErr instanceof Error ? notifyErr.message : JSON.stringify(notifyErr));
        }
      }

      // Step 6: Create a task verification record so this appears in the Task Feed timeline
      const verificationAction = template.buttonType === 'report_issue' 
        ? `Issue Reported: ${template.name}`
        : template.buttonType === 'request_purchase'
          ? `Purchase Requested: ${template.name}`
          : template.name;

      const verificationStatus = template.buttonType === 'report_issue' ? 'flagged' : 'verified';

      // Try to extract location from form data if not provided directly
      const extractedLocation = input.locationName || 
        input.formData?.location || 
        input.formData?.area || 
        input.formData?.room || 
        input.formData?.where ||
        'Not Specified';

      try {
        const verificationInsertData = {
          organization_id: organizationId,
          department_code: triggeringDepartment || '1000',
          department_name: getDepartmentNameFromCode(triggeringDepartment || '1000'),
          facility_code: input.facilityId || facilityId || null,
          location_id: input.locationId || null,
          location_name: extractedLocation,
          category_id: `tf-${template.buttonType}`,
          category_name: template.name,
          action: verificationAction,
          notes: input.notes || formatFormDataForDisplay(input.formData || {}, template) || null,
          photo_uri: photoUrl,
          employee_id: user?.id || null,
          employee_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          status: verificationStatus,
          source_type: 'task_feed_post',
          source_id: String(postData.id),
          source_number: postNumber,
        };
        
        console.log('[useCreateTaskFeedPost] Creating task verification with data:', JSON.stringify(verificationInsertData, null, 2));
        
        const { data: verifyData, error: verifyError } = await supabase
          .from('task_verifications')
          .insert(verificationInsertData)
          .select()
          .single();
          
        if (verifyError) {
          console.error('[useCreateTaskFeedPost] Error creating task verification:', verifyError.message || JSON.stringify(verifyError));
          console.error('[useCreateTaskFeedPost] Verification error code:', verifyError.code);
          console.error('[useCreateTaskFeedPost] Verification error details:', verifyError.details);
          console.error('[useCreateTaskFeedPost] Verification error hint:', verifyError.hint);
        } else {
          console.log('[useCreateTaskFeedPost] Task verification record created:', verifyData?.id);
        }
      } catch (verifyError) {
        console.error('[useCreateTaskFeedPost] Exception creating task verification:', verifyError instanceof Error ? verifyError.message : JSON.stringify(verifyError));
      }

      // Step 7: Increment template usage count
      await supabase
        .from('task_feed_templates')
        .update({ usage_count: (template.usageCount || 0) + 1 })
        .eq('id', input.templateId);

      // Step 8: Process workflow rules (if any)
      if (template.workflowRules && template.workflowRules.length > 0) {
        await processWorkflowRules(template, input.formData || {}, postData.id, postNumber, organizationId, user);
      }

      return {
        ...mapPostFromDb(postData),
        totalDepartments: assignedDepartments.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[useCreateTaskFeedPost] Mutation error:', errorMessage);
      callbacks?.onError?.(error);
    },
  });
}

function getDepartmentNameFromCode(code: string): string {
  const deptNames: Record<string, string> = {
    '1000': 'Projects / Offices',
    '1001': 'Maintenance',
    '1002': 'Sanitation',
    '1003': 'Production',
    '1004': 'Quality',
    '1005': 'Safety',
    '1006': 'HR',
    '1008': 'Warehouse',
    '1009': 'IT / Technology',
  };
  return deptNames[code] || code;
}

function formatFormDataForDisplay(formData: Record<string, any>, template?: TaskFeedTemplate): string {
  if (!formData || Object.keys(formData).length === 0) return '';
  
  const lines: string[] = [];
  const fieldLabels: Record<string, string> = {};
  
  // Get field labels from template if available
  if (template?.formFields) {
    template.formFields.forEach(field => {
      fieldLabels[field.id] = field.label || field.id;
    });
  }
  
  for (const [key, value] of Object.entries(formData)) {
    if (value !== undefined && value !== null && value !== '') {
      const label = fieldLabels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
      lines.push(`${label}: ${displayValue}`);
    }
  }
  
  return lines.join('\n');
}

async function processWorkflowRules(
  template: TaskFeedTemplate,
  formData: Record<string, any>,
  postId: string,
  postNumber: string,
  organizationId: string,
  user: any
): Promise<void> {
  console.log('[processWorkflowRules] Processing', template.workflowRules.length, 'workflow rules');

  for (const rule of template.workflowRules) {
    let shouldExecute = true;

    // Check condition if exists
    if (rule.condition) {
      const fieldValue = formData[rule.condition.fieldId];
      switch (rule.condition.operator) {
        case 'equals':
          shouldExecute = fieldValue === rule.condition.value;
          break;
        case 'not_equals':
          shouldExecute = fieldValue !== rule.condition.value;
          break;
        case 'contains':
          shouldExecute = String(fieldValue).includes(rule.condition.value);
          break;
      }
    }

    if (!shouldExecute) {
      console.log('[processWorkflowRules] Condition not met, skipping rule');
      continue;
    }

    // Execute action
    switch (rule.action) {
      case 'create_work_order':
        console.log('[processWorkflowRules] Creating work order with priority:', rule.createWorkOrderPriority);
        try {
          await supabase.from('work_orders').insert({
            organization_id: organizationId,
            title: `[${postNumber}] ${template.name}`,
            description: `Auto-generated from Task Feed post ${postNumber}\n\nForm Data:\n${JSON.stringify(formData, null, 2)}`,
            status: 'open',
            priority: rule.createWorkOrderPriority || 'medium',
            type: 'request',
            facility_id: organizationId,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
          console.log('[processWorkflowRules] Work order created successfully');
        } catch (woError) {
          console.error('[processWorkflowRules] Error creating work order:', woError);
        }
        break;

      case 'alert_personnel':
        console.log('[processWorkflowRules] Would alert personnel:', rule.alertPersonnel);
        // TODO: Implement push notifications when available
        break;

      case 'notify':
        console.log('[processWorkflowRules] Would send notification');
        // TODO: Implement notifications when available
        break;

      case 'store_only':
        console.log('[processWorkflowRules] Store only - no additional action needed');
        break;
    }
  }
}

export function useDeleteTaskFeedPost(callbacks?: MutationCallbacks<string>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (postId: string) => {
      console.log('[useDeleteTaskFeedPost] Deleting post:', postId);

      // First, fetch the post to check authorization
      const { data: post, error: fetchError } = await supabase
        .from('task_feed_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (fetchError) {
        console.error('[useDeleteTaskFeedPost] Error fetching post:', fetchError);
        throw new Error('Post not found');
      }

      // Check authorization: must be creator, manager, supervisor, or super_admin
      const userRole = user?.role || '';
      const isAuthorized = 
        post.created_by_id === user?.id ||
        userRole === 'manager' ||
        userRole === 'supervisor' ||
        userRole === 'super_admin' ||
        userRole === 'admin';

      if (!isAuthorized) {
        throw new Error('You are not authorized to delete this post');
      }

      // Delete related department tasks first
      const { error: tasksDeleteError } = await supabase
        .from('task_feed_department_tasks')
        .delete()
        .eq('post_id', postId);

      if (tasksDeleteError) {
        console.error('[useDeleteTaskFeedPost] Error deleting department tasks:', tasksDeleteError);
        // Continue anyway - the post deletion is the main goal
      }

      // Delete related task verification records
      const { error: verifyDeleteError } = await supabase
        .from('task_verifications')
        .delete()
        .eq('source_id', postId)
        .eq('source_type', 'task_feed_post');

      if (verifyDeleteError) {
        console.error('[useDeleteTaskFeedPost] Error deleting task verifications:', verifyDeleteError);
        // Continue anyway
      }

      // Delete related notifications
      const { error: notifyDeleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('source_id', postId)
        .eq('source_type', 'task_feed_post');

      if (notifyDeleteError) {
        console.error('[useDeleteTaskFeedPost] Error deleting notifications:', notifyDeleteError);
        // Continue anyway
      }

      // Finally delete the post
      const { error: deleteError } = await supabase
        .from('task_feed_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        console.error('[useDeleteTaskFeedPost] Error deleting post:', deleteError);
        throw deleteError;
      }

      console.log('[useDeleteTaskFeedPost] Post deleted successfully:', postId);
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts_with_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      callbacks?.onSuccess?.(postId);
    },
    onError: (error: Error) => {
      console.error('[useDeleteTaskFeedPost] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useCanDeleteTaskFeedPost() {
  const { user } = useUser();

  return (post: { created_by_id?: string; createdById?: string }): boolean => {
    if (!user) return false;
    
    const userRole = user.role || '';
    const postCreatorId = post.created_by_id || post.createdById;
    
    // Can delete if: creator, manager, supervisor, super_admin, or admin
    return (
      postCreatorId === user.id ||
      userRole === 'manager' ||
      userRole === 'supervisor' ||
      userRole === 'super_admin' ||
      userRole === 'admin'
    );
  };
}

export interface CreateManualPostInput {
  buttonType: ButtonType;
  title: string;
  description?: string;
  departmentCode: string;
  assignedDepartments?: string[];
  locationId?: string;
  locationName?: string;
  facilityId?: string;
  photoUrl?: string;
  additionalPhotos?: string[];
  notes?: string;
  formData?: Record<string, any>;
}

export function useCreateManualTaskFeedPost(callbacks?: MutationCallbacks<TaskFeedPost & { totalDepartments: number }>) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';

  return useMutation({
    mutationFn: async (input: CreateManualPostInput) => {
      if (!organizationId) throw new Error('No organization selected');
      if (!user?.id) throw new Error('User not authenticated');

      console.log('[useCreateManualTaskFeedPost] Creating manual post:', input.title);

      const assignedDepartments = input.assignedDepartments || [input.departmentCode];

      const postNumber = generatePostNumber();
      console.log('[useCreateManualTaskFeedPost] Generated post number:', postNumber);

      let photoUrl = input.photoUrl || null;
      let additionalPhotos: string[] = [];
      
      if (input.photoUrl) {
        console.log('[useCreateManualTaskFeedPost] Uploading primary photo...');
        photoUrl = await uploadPhotoToStorage(input.photoUrl, organizationId, postNumber, 0);
      }
      
      if (input.additionalPhotos && input.additionalPhotos.length > 0) {
        console.log('[useCreateManualTaskFeedPost] Uploading', input.additionalPhotos.length, 'additional photos...');
        additionalPhotos = await uploadMultiplePhotos(input.additionalPhotos, organizationId, postNumber);
      }

      const insertData = {
        organization_id: organizationId,
        post_number: postNumber,
        template_id: null,
        template_name: input.title,
        template_snapshot: null,
        created_by_id: user.id,
        created_by_name: `${user.first_name} ${user.last_name}`,
        facility_id: input.facilityId || facilityId || null,
        location_id: input.locationId || null,
        location_name: input.locationName || null,
        form_data: input.formData || {},
        photo_url: photoUrl || null,
        additional_photos: additionalPhotos || [],
        notes: input.notes || null,
        status: assignedDepartments.length > 0 ? 'pending' : 'completed',
        total_departments: assignedDepartments.length,
        completed_departments: 0,
        completion_rate: assignedDepartments.length === 0 ? 100 : 0,
        completed_at: assignedDepartments.length === 0 ? new Date().toISOString() : null,
      };

      console.log('[useCreateManualTaskFeedPost] Insert data:', JSON.stringify(insertData, null, 2));

      const { data: postData, error: postError } = await supabase
        .from('task_feed_posts')
        .insert(insertData)
        .select()
        .single();

      if (postError) {
        const errorMessage = postError.message || postError.details || postError.hint || JSON.stringify(postError);
        console.error('[useCreateManualTaskFeedPost] Error creating post:', errorMessage);
        throw new Error(`Failed to create post: ${errorMessage}`);
      }

      console.log('[useCreateManualTaskFeedPost] Post created:', postData.id, postNumber);

      if (assignedDepartments.length > 0) {
        const departmentTasks = assignedDepartments.map((deptCode: string) => ({
          organization_id: organizationId,
          post_id: postData.id,
          post_number: postNumber,
          department_code: deptCode,
          department_name: getDepartmentNameFromCode(deptCode),
          status: 'pending',
        }));

        const { error: tasksError } = await supabase
          .from('task_feed_department_tasks')
          .insert(departmentTasks);

        if (tasksError) {
          console.error('[useCreateManualTaskFeedPost] Error creating department tasks:', tasksError);
        } else {
          console.log('[useCreateManualTaskFeedPost] Created', assignedDepartments.length, 'department tasks');
        }

        const notificationPriority = input.buttonType === 'report_issue' ? 'high' : 'normal';
        const notificationType = input.buttonType === 'report_issue' ? 'task_feed_urgent' : 'task_feed_assigned';
        
        const notifications = assignedDepartments.map((deptCode: string) => ({
          organization_id: organizationId,
          target_type: 'department',
          target_department_code: deptCode,
          title: `New Task Assigned: ${input.title}`,
          message: `${postNumber} requires action from ${getDepartmentNameFromCode(deptCode)}. ${input.locationName ? `Location: ${input.locationName}` : ''}`,
          notification_type: notificationType,
          priority: notificationPriority,
          source_type: 'task_feed_post',
          source_id: postData.id,
          source_number: postNumber,
          action_url: `/taskfeed`,
          action_label: 'View Task',
          metadata: {
            buttonType: input.buttonType,
            locationName: input.locationName,
            createdBy: user ? `${user.first_name} ${user.last_name}` : 'System',
            isManualEntry: true,
          },
        }));

        try {
          const { error: notifyError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifyError) {
            console.error('[useCreateManualTaskFeedPost] Error creating notifications:', notifyError.message);
          } else {
            console.log('[useCreateManualTaskFeedPost] Created', assignedDepartments.length, 'notifications');
          }
        } catch (notifyErr) {
          console.error('[useCreateManualTaskFeedPost] Exception creating notifications:', notifyErr);
        }
      }

      const verificationAction = input.buttonType === 'report_issue' 
        ? `Issue Reported: ${input.title}`
        : input.buttonType === 'request_purchase'
          ? `Purchase Requested: ${input.title}`
          : input.title;

      const verificationStatus = input.buttonType === 'report_issue' ? 'flagged' : 'verified';

      try {
        const verificationInsertData = {
          organization_id: organizationId,
          department_code: input.departmentCode,
          department_name: getDepartmentNameFromCode(input.departmentCode),
          facility_code: input.facilityId || facilityId || null,
          location_id: input.locationId || null,
          location_name: input.locationName || 'Not Specified',
          category_id: `manual-${input.buttonType}`,
          category_name: input.title,
          action: verificationAction,
          notes: input.notes || (input.description ? `Description: ${input.description}` : null),
          photo_uri: photoUrl,
          employee_id: user?.id || null,
          employee_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          status: verificationStatus,
          source_type: 'task_feed_post',
          source_id: String(postData.id),
          source_number: postNumber,
        };
        
        console.log('[useCreateManualTaskFeedPost] Creating task verification');
        
        const { error: verifyError } = await supabase
          .from('task_verifications')
          .insert(verificationInsertData)
          .select()
          .single();
          
        if (verifyError) {
          console.error('[useCreateManualTaskFeedPost] Error creating task verification:', verifyError.message);
        } else {
          console.log('[useCreateManualTaskFeedPost] Task verification record created');
        }
      } catch (verifyError) {
        console.error('[useCreateManualTaskFeedPost] Exception creating task verification:', verifyError);
      }

      return {
        ...mapPostFromDb(postData),
        totalDepartments: assignedDepartments.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts_with_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_templates'] });
      queryClient.invalidateQueries({ queryKey: ['task_verifications'] });
      queryClient.invalidateQueries({ queryKey: ['task_verification_stats'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[useCreateManualTaskFeedPost] Mutation error:', errorMessage);
      callbacks?.onError?.(error);
    },
  });
}

// ── START DEPARTMENT TASK ─────────────────────────────────────
export function useStartDepartmentTask(callbacks?: MutationCallbacks<TaskFeedDepartmentTask>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: { taskId: string; formType?: string; formRoute?: string }) => {
      const updateData: any = {
        status: 'in_progress',
        started_at: new Date().toISOString(),
        started_by_id: user?.id,
        started_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
      };
      if (input.formType) updateData.form_type = input.formType;
      if (input.formRoute) updateData.form_route = input.formRoute;

      const { data, error } = await supabase
        .from('task_feed_department_tasks')
        .update(updateData)
        .eq('id', input.taskId)
        .select()
        .single();

      if (error) throw error;

      // Also update parent post to in_progress if it was pending
      await supabase
        .from('task_feed_posts')
        .update({ status: 'in_progress' })
        .eq('id', data.post_id)
        .eq('status', 'pending');

      return mapDepartmentTaskFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── ESCALATE TO DEPARTMENT ────────────────────────────────────
export interface EscalateInput {
  postId: string;
  postNumber: string;
  organizationId: string;
  targetDepartments: { code: string; name: string }[];
  reason: string;
  fromDepartmentCode: string;
  fromTaskId: string;
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  requiresSignoff?: boolean;
  signoffDepartmentCode?: string;
}

export function useEscalateToDepartment(callbacks?: MutationCallbacks<TaskFeedDepartmentTask[]>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EscalateInput) => {
      const newTasks: any[] = [];

      for (const dept of input.targetDepartments) {
        // Check if department already exists on this post
        const { data: existing } = await supabase
          .from('task_feed_department_tasks')
          .select('id')
          .eq('post_id', input.postId)
          .eq('department_code', dept.code)
          .maybeSingle();

        if (existing) continue; // Already assigned

        const { data, error } = await supabase
          .from('task_feed_department_tasks')
          .insert({
            organization_id: input.organizationId,
            post_id: input.postId,
            post_number: input.postNumber,
            department_code: dept.code,
            department_name: dept.name,
            status: 'pending',
            is_original: false,
            escalated_from_department: input.fromDepartmentCode,
            escalated_from_task_id: input.fromTaskId,
            escalation_reason: input.reason,
            escalated_at: new Date().toISOString(),
            priority: input.priority || 'high',
            requires_signoff: input.requiresSignoff ?? true,
            signoff_department_code: input.signoffDepartmentCode || input.fromDepartmentCode,
          })
          .select()
          .single();

        if (error) throw error;
        newTasks.push(mapDepartmentTaskFromDb(data));
      }

      // Update total_departments on the post
      const { data: allTasks } = await supabase
        .from('task_feed_department_tasks')
        .select('id, status')
        .eq('post_id', input.postId);

      const total = allTasks?.length || 0;
      const completed = allTasks?.filter(t => t.status === 'completed' || t.status === 'signed_off').length || 0;

      await supabase
        .from('task_feed_posts')
        .update({
          total_departments: total,
          completed_departments: completed,
          completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
          status: 'in_progress',
        })
        .eq('id', input.postId);

      return newTasks;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── COMPLETE WITH FORM RESPONSE ───────────────────────────────
export interface CompleteWithFormInput {
  taskId: string;
  formType: string;
  formRoute: string;
  formResponse: Record<string, any>;
  formPhotos?: string[];
  completionNotes?: string;
}

export function useCompleteWithFormResponse(callbacks?: MutationCallbacks<TaskFeedDepartmentTask>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: CompleteWithFormInput) => {
      const { data, error } = await supabase
        .from('task_feed_department_tasks')
        .update({
          status: 'completed',
          form_type: input.formType,
          form_route: input.formRoute,
          form_response: input.formResponse,
          form_photos: input.formPhotos || [],
          completed_by_id: user?.id,
          completed_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          completed_at: new Date().toISOString(),
          completion_notes: input.completionNotes,
        })
        .eq('id', input.taskId)
        .select()
        .single();

      if (error) throw error;

      // Update post completion counts
      const postId = data.post_id;
      const { data: allTasks } = await supabase
        .from('task_feed_department_tasks')
        .select('id, status')
        .eq('post_id', postId);

      const total = allTasks?.length || 0;
      const completed = allTasks?.filter(t => t.status === 'completed' || t.status === 'signed_off').length || 0;
      const allDone = completed === total;

      await supabase
        .from('task_feed_posts')
        .update({
          completed_departments: completed,
          completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
          ...(allDone ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', postId);

      return mapDepartmentTaskFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── SIGNOFF DEPARTMENT TASK ───────────────────────────────────
export function useSignoffDepartmentTask(callbacks?: MutationCallbacks<TaskFeedDepartmentTask>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: { taskId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('task_feed_department_tasks')
        .update({
          status: 'signed_off',
          signoff_by_id: user?.id,
          signoff_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          signoff_at: new Date().toISOString(),
          signoff_notes: input.notes,
        })
        .eq('id', input.taskId)
        .select()
        .single();

      if (error) throw error;

      // Update post completion counts
      const postId = data.post_id;
      const { data: allTasks } = await supabase
        .from('task_feed_department_tasks')
        .select('id, status')
        .eq('post_id', postId);

      const total = allTasks?.length || 0;
      const signedOff = allTasks?.filter(t => t.status === 'signed_off').length || 0;
      const completedOrSigned = allTasks?.filter(t => t.status === 'completed' || t.status === 'signed_off').length || 0;
      const allDone = completedOrSigned === total;

      await supabase
        .from('task_feed_posts')
        .update({
          completed_departments: completedOrSigned,
          completion_rate: total > 0 ? Math.round((completedOrSigned / total) * 100) : 0,
          ...(allDone ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', postId);

      return mapDepartmentTaskFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── FINAL POST SIGNOFF ────────────────────────────────────────
export function useFinalPostSignoff(callbacks?: MutationCallbacks<TaskFeedPost>) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: { postId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('task_feed_posts')
        .update({
          status: 'completed',
          final_signoff_by_id: user?.id,
          final_signoff_by_name: user ? `${user.first_name} ${user.last_name}` : 'System',
          final_signoff_at: new Date().toISOString(),
          final_signoff_notes: input.notes,
          completed_at: new Date().toISOString(),
          is_production_hold: false,
        })
        .eq('id', input.postId)
        .select()
        .single();

      if (error) throw error;
      return mapPostFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

export function useTaskFeedTemplateHelpers() {
  return {
    getButtonTypeLabel: (buttonType: ButtonType) => {
      const labels: Record<ButtonType, string> = {
        add_task: 'Add Task',
        report_issue: 'Report Issue',
        request_purchase: 'Request Purchase',
      };
      return labels[buttonType] || buttonType;
    },
    getButtonTypeColor: (buttonType: ButtonType) => {
      const colors: Record<ButtonType, string> = {
        add_task: '#3B82F6',
        report_issue: '#EF4444',
        request_purchase: '#8B5CF6',
      };
      return colors[buttonType] || '#6B7280';
    },
  };
}
