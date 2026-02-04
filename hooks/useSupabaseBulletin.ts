import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type BulletinPriority = 'normal' | 'important' | 'urgent';

export interface BulletinPost {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_by_name: string;
  priority: BulletinPriority;
  expires_at: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

type CreateBulletinInput = Omit<BulletinPost, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseBulletin() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const bulletinQuery = useQuery({
    queryKey: ['bulletin', 'posts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseBulletin] Fetching bulletin posts');

      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BulletinPost[];
    },
    enabled: !!organizationId,
  });

  const activePostsQuery = useQuery({
    queryKey: ['bulletin', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseBulletin] Fetching active bulletin posts');

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BulletinPost[];
    },
    enabled: !!organizationId,
  });

  const createPostMutation = useMutation({
    mutationFn: async (input: CreateBulletinInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseBulletin] Creating bulletin post:', input.title);

      const { data, error } = await supabase
        .from('bulletin_posts')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as BulletinPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin'] });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BulletinPost> & { id: string }) => {
      console.log('[useSupabaseBulletin] Updating bulletin post:', id);

      const { data, error } = await supabase
        .from('bulletin_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BulletinPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      console.log('[useSupabaseBulletin] Toggling pin:', id, pinned);

      const { data, error } = await supabase
        .from('bulletin_posts')
        .update({ pinned })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BulletinPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin'] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseBulletin] Deleting bulletin post:', id);

      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin'] });
    },
  });

  const getPostsByPriority = (priority: BulletinPriority) => {
    return bulletinQuery.data?.filter(post => post.priority === priority) || [];
  };

  const getPinnedPosts = () => {
    return bulletinQuery.data?.filter(post => post.pinned) || [];
  };

  const getUrgentPosts = () => {
    return activePostsQuery.data?.filter(post => post.priority === 'urgent') || [];
  };

  return {
    posts: bulletinQuery.data || [],
    activePosts: activePostsQuery.data || [],
    isLoading: bulletinQuery.isLoading,

    createPost: createPostMutation.mutateAsync,
    updatePost: updatePostMutation.mutateAsync,
    togglePin: togglePinMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,

    getPostsByPriority,
    getPinnedPosts,
    getUrgentPosts,

    refetch: () => {
      bulletinQuery.refetch();
      activePostsQuery.refetch();
    },
  };
}
