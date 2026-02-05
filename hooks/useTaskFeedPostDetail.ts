import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { TaskFeedPost, TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { ExtendedWorkOrder } from '@/hooks/useSupabaseWorkOrders';

export interface TaskFeedPostWithWorkOrders {
  post: TaskFeedPost & {
    departmentTasks: TaskFeedDepartmentTask[];
  };
  linkedWorkOrders: ExtendedWorkOrder[];
  taskVerification: {
    id: string;
    linkedWorkOrderId?: string;
    status: string;
    action: string;
    notes?: string;
    photoUri?: string;
  } | null;
}

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
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDepartmentTaskFromDb = (row: any): TaskFeedDepartmentTask => ({
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
  moduleHistoryType: row.module_reference_type,
  moduleHistoryId: row.module_reference_id,
  assignedAt: row.assigned_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useTaskFeedPostDetail(postId: string | undefined, options?: { enabled?: boolean }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_post_detail', organizationId, postId],
    queryFn: async (): Promise<TaskFeedPostWithWorkOrders | null> => {
      if (!organizationId || !postId) return null;

      console.log('[useTaskFeedPostDetail] Fetching post:', postId);

      // Fetch the post with department tasks
      const { data: postData, error: postError } = await supabase
        .from('task_feed_posts')
        .select(`
          *,
          task_feed_department_tasks (
            id,
            organization_id,
            post_id,
            post_number,
            department_code,
            department_name,
            status,
            completed_by_id,
            completed_by_name,
            completed_at,
            completion_notes,
            module_reference_type,
            module_reference_id,
            assigned_at,
            created_at,
            updated_at
          )
        `)
        .eq('id', postId)
        .eq('organization_id', organizationId)
        .single();

      if (postError) {
        console.error('[useTaskFeedPostDetail] Error fetching post:', postError);
        throw postError;
      }

      if (!postData) {
        console.log('[useTaskFeedPostDetail] Post not found');
        return null;
      }

      const post = mapPostFromDb(postData);
      const departmentTasks = (postData.task_feed_department_tasks || []).map(mapDepartmentTaskFromDb);

      // Collect all work order IDs from department tasks
      const workOrderIds = departmentTasks
        .filter(task => task.moduleHistoryType === 'work_order' && task.moduleHistoryId)
        .map(task => task.moduleHistoryId as string);

      console.log('[useTaskFeedPostDetail] Found', workOrderIds.length, 'linked work orders from department tasks');

      // Also check task_verifications for linked work orders
      const { data: verificationData } = await supabase
        .from('task_verifications')
        .select('id, linked_work_order_id, status, action, notes, photo_uri')
        .eq('source_id', postId)
        .eq('source_type', 'task_feed_post')
        .eq('organization_id', organizationId)
        .maybeSingle();

      let taskVerification = null;
      if (verificationData) {
        taskVerification = {
          id: verificationData.id,
          linkedWorkOrderId: verificationData.linked_work_order_id,
          status: verificationData.status,
          action: verificationData.action,
          notes: verificationData.notes,
          photoUri: verificationData.photo_uri,
        };

        if (verificationData.linked_work_order_id && !workOrderIds.includes(verificationData.linked_work_order_id)) {
          workOrderIds.push(verificationData.linked_work_order_id);
        }
      }

      // Also search for work orders that reference this post number in their description or source
      const { data: relatedWorkOrders } = await supabase
        .from('work_orders')
        .select('id')
        .eq('organization_id', organizationId)
        .or(`source_id.eq.${postId},description.ilike.%${post.postNumber}%`)
        .limit(20);

      if (relatedWorkOrders) {
        for (const wo of relatedWorkOrders) {
          if (!workOrderIds.includes(wo.id)) {
            workOrderIds.push(wo.id);
          }
        }
      }

      console.log('[useTaskFeedPostDetail] Total unique work order IDs:', workOrderIds.length);

      // Fetch all linked work orders
      let linkedWorkOrders: ExtendedWorkOrder[] = [];
      if (workOrderIds.length > 0) {
        const { data: workOrdersData, error: workOrdersError } = await supabase
          .from('work_orders')
          .select('*')
          .in('id', workOrderIds)
          .eq('organization_id', organizationId);

        if (workOrdersError) {
          console.error('[useTaskFeedPostDetail] Error fetching work orders:', workOrdersError);
        } else {
          linkedWorkOrders = (workOrdersData || []) as ExtendedWorkOrder[];
          console.log('[useTaskFeedPostDetail] Fetched', linkedWorkOrders.length, 'work orders');
        }
      }

      return {
        post: {
          ...post,
          departmentTasks,
        },
        linkedWorkOrders,
        taskVerification,
      };
    },
    enabled: options?.enabled !== false && !!organizationId && !!postId,
  });
}

export function useTaskFeedPostByNumber(postNumber: string | undefined, options?: { enabled?: boolean }) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['task_feed_post_by_number', organizationId, postNumber],
    queryFn: async () => {
      if (!organizationId || !postNumber) return null;

      console.log('[useTaskFeedPostByNumber] Fetching post by number:', postNumber);

      const { data, error } = await supabase
        .from('task_feed_posts')
        .select('id')
        .eq('post_number', postNumber)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('[useTaskFeedPostByNumber] Error:', error);
        return null;
      }

      return data?.id || null;
    },
    enabled: options?.enabled !== false && !!organizationId && !!postNumber,
  });
}
