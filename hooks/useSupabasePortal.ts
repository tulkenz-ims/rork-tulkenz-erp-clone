import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

export type AnnouncementType = 'general' | 'policy' | 'event' | 'safety' | 'hr' | 'maintenance' | 'it' | 'celebration' | 'urgent' | 'other';
export type AnnouncementPriority = 'low' | 'normal' | 'important' | 'urgent' | 'critical';
export type AnnouncementStatus = 'draft' | 'published' | 'archived' | 'expired';
export type TargetAudience = 'all' | 'departments' | 'roles' | 'facilities' | 'custom';

export interface PortalAnnouncement {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  summary: string | null;
  announcement_type: AnnouncementType;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target_audience: TargetAudience;
  target_departments: string[];
  target_roles: string[];
  target_facilities: string[];
  target_employee_ids: string[];
  publish_at: string | null;
  expires_at: string | null;
  pinned: boolean;
  show_on_dashboard: boolean;
  show_on_portal: boolean;
  requires_acknowledgment: boolean;
  cover_image_url: string | null;
  attachments: any[];
  created_by: string | null;
  created_by_name: string;
  published_by: string | null;
  published_by_name: string | null;
  published_at: string | null;
  view_count: number;
  acknowledgment_count: number;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDirectoryEntry {
  id: string;
  organization_id: string;
  facility_id: string | null;
  facility_name: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  position: string | null;
  department_code: string | null;
  status: string;
  hire_date: string | null;
  manager_id: string | null;
  manager_name: string | null;
  phone: string;
  extension: string;
  office_location: string;
  avatar_url: string;
  job_title: string;
  bio: string;
  skills: any[];
  created_at: string;
}

export interface AnnouncementAcknowledgment {
  id: string;
  organization_id: string;
  announcement_id: string;
  employee_id: string;
  employee_name: string;
  acknowledged_at: string;
}

type CreateAnnouncementInput = Omit<PortalAnnouncement, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'view_count' | 'acknowledgment_count'>;

export function useSupabasePortal() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const announcementsQuery = useQuery({
    queryKey: ['portal', 'announcements', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePortal] Fetching all announcements');

      const { data, error } = await supabase
        .from('portal_announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PortalAnnouncement[];
    },
    enabled: !!organizationId,
  });

  const publishedAnnouncementsQuery = useQuery({
    queryKey: ['portal', 'announcements', 'published', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePortal] Fetching published announcements');

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('portal_announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'published')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PortalAnnouncement[];
    },
    enabled: !!organizationId,
  });

  const dashboardAnnouncementsQuery = useQuery({
    queryKey: ['portal', 'announcements', 'dashboard', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePortal] Fetching dashboard announcements');

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('portal_announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'published')
        .eq('show_on_dashboard', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as PortalAnnouncement[];
    },
    enabled: !!organizationId,
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (input: Partial<CreateAnnouncementInput>) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePortal] Creating announcement:', input.title);

      const { data, error } = await supabase
        .from('portal_announcements')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as PortalAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PortalAnnouncement> & { id: string }) => {
      console.log('[useSupabasePortal] Updating announcement:', id);

      const { data, error } = await supabase
        .from('portal_announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PortalAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
    },
  });

  const publishAnnouncementMutation = useMutation({
    mutationFn: async ({ id, publishedBy, publishedByName }: { id: string; publishedBy: string; publishedByName: string }) => {
      console.log('[useSupabasePortal] Publishing announcement:', id);

      const { data, error } = await supabase
        .from('portal_announcements')
        .update({
          status: 'published',
          published_by: publishedBy,
          published_by_name: publishedByName,
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PortalAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
    },
  });

  const archiveAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePortal] Archiving announcement:', id);

      const { data, error } = await supabase
        .from('portal_announcements')
        .update({ status: 'archived' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PortalAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePortal] Deleting announcement:', id);

      const { error } = await supabase
        .from('portal_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      console.log('[useSupabasePortal] Toggling pin:', id, pinned);

      const { data, error } = await supabase
        .from('portal_announcements')
        .update({ pinned })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PortalAnnouncement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
    },
  });

  const recordViewMutation = useMutation({
    mutationFn: async ({ announcementId, employeeId, employeeName }: { announcementId: string; employeeId: string; employeeName?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePortal] Recording view:', announcementId);

      const { error } = await supabase
        .from('portal_announcement_views')
        .upsert({
          organization_id: organizationId,
          announcement_id: announcementId,
          employee_id: employeeId,
          viewed_at: new Date().toISOString(),
        }, { onConflict: 'announcement_id,employee_id' });

      if (error) throw error;

      await supabase.rpc('increment_announcement_view_count', { announcement_id: announcementId });
    },
  });

  const acknowledgeAnnouncementMutation = useMutation({
    mutationFn: async ({ announcementId, employeeId, employeeName }: { announcementId: string; employeeId: string; employeeName: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePortal] Acknowledging announcement:', announcementId);

      const { data, error } = await supabase
        .from('portal_announcement_acknowledgments')
        .insert({
          organization_id: organizationId,
          announcement_id: announcementId,
          employee_id: employeeId,
          employee_name: employeeName,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('portal_announcements')
        .update({ acknowledgment_count: supabase.rpc('increment_acknowledgment_count', { announcement_id: announcementId }) })
        .eq('id', announcementId);

      return data as AnnouncementAcknowledgment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'announcements'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'acknowledgments'] });
    },
  });

  const getAnnouncementsByType = (type: AnnouncementType) => {
    return publishedAnnouncementsQuery.data?.filter(a => a.announcement_type === type) || [];
  };

  const getAnnouncementsByPriority = (priority: AnnouncementPriority) => {
    return publishedAnnouncementsQuery.data?.filter(a => a.priority === priority) || [];
  };

  const getPinnedAnnouncements = () => {
    return publishedAnnouncementsQuery.data?.filter(a => a.pinned) || [];
  };

  const getUrgentAnnouncements = () => {
    return publishedAnnouncementsQuery.data?.filter(a => a.priority === 'urgent' || a.priority === 'critical') || [];
  };

  const getAnnouncementsRequiringAck = () => {
    return publishedAnnouncementsQuery.data?.filter(a => a.requires_acknowledgment) || [];
  };

  return {
    announcements: announcementsQuery.data || [],
    publishedAnnouncements: publishedAnnouncementsQuery.data || [],
    dashboardAnnouncements: dashboardAnnouncementsQuery.data || [],
    isLoading: announcementsQuery.isLoading,

    createAnnouncement: createAnnouncementMutation.mutateAsync,
    updateAnnouncement: updateAnnouncementMutation.mutateAsync,
    publishAnnouncement: publishAnnouncementMutation.mutateAsync,
    archiveAnnouncement: archiveAnnouncementMutation.mutateAsync,
    deleteAnnouncement: deleteAnnouncementMutation.mutateAsync,
    togglePin: togglePinMutation.mutateAsync,
    recordView: recordViewMutation.mutateAsync,
    acknowledgeAnnouncement: acknowledgeAnnouncementMutation.mutateAsync,

    getAnnouncementsByType,
    getAnnouncementsByPriority,
    getPinnedAnnouncements,
    getUrgentAnnouncements,
    getAnnouncementsRequiringAck,

    refetch: () => {
      announcementsQuery.refetch();
      publishedAnnouncementsQuery.refetch();
      dashboardAnnouncementsQuery.refetch();
    },
  };
}

export function useSupabaseEmployeeProfile() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { userProfile } = useUser();

  const profileQuery = useQuery({
    queryKey: ['portal', 'profile', organizationId, userProfile?.id],
    queryFn: async () => {
      if (!organizationId || !userProfile?.id) return null;
      console.log('[useSupabaseEmployeeProfile] Fetching employee profile:', userProfile.id);

      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          manager:manager_id (
            id,
            first_name,
            last_name,
            email,
            position
          )
        `)
        .eq('organization_id', organizationId)
        .eq('id', userProfile.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && !!userProfile?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: {
      phone?: string;
      emergencyContact?: string;
      emergencyPhone?: string;
      bio?: string;
      skills?: string[];
      avatar_url?: string;
    }) => {
      if (!organizationId || !userProfile?.id) throw new Error('Not authenticated');
      console.log('[useSupabaseEmployeeProfile] Updating profile:', updates);

      const currentProfile = profileQuery.data?.profile || {};
      const newProfile = { ...currentProfile, ...updates };

      const { data, error } = await supabase
        .from('employees')
        .update({ profile: newProfile })
        .eq('id', userProfile.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'directory'] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    refetch: profileQuery.refetch,
  };
}

export function useSupabaseBulletinPosts() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const bulletinQuery = useQuery({
    queryKey: ['portal', 'bulletin', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseBulletinPosts] Fetching bulletin posts');

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
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createPostMutation = useMutation({
    mutationFn: async (post: {
      title: string;
      content: string;
      priority?: 'normal' | 'important' | 'urgent';
      pinned?: boolean;
      expires_at?: string | null;
      created_by_name: string;
      created_by?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseBulletinPosts] Creating post:', post.title);

      const { data, error } = await supabase
        .from('bulletin_posts')
        .insert({
          organization_id: organizationId,
          ...post,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'bulletin'] });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; pinned?: boolean; priority?: string }) => {
      console.log('[useSupabaseBulletinPosts] Updating post:', id);

      const { data, error } = await supabase
        .from('bulletin_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'bulletin'] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseBulletinPosts] Deleting post:', id);

      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'bulletin'] });
    },
  });

  return {
    posts: bulletinQuery.data || [],
    isLoading: bulletinQuery.isLoading,
    createPost: createPostMutation.mutateAsync,
    updatePost: updatePostMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,
    refetch: bulletinQuery.refetch,
  };
}

export function useSupabaseEmployeeDirectory() {
  const { organizationId } = useOrganization();

  const directoryQuery = useQuery({
    queryKey: ['portal', 'directory', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseEmployeeDirectory] Fetching employee directory');

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          organization_id,
          facility_id,
          employee_code,
          first_name,
          last_name,
          email,
          role,
          position,
          department_code,
          status,
          hire_date,
          manager_id,
          profile
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });

      if (error) throw error;

      const entries: EmployeeDirectoryEntry[] = (data || []).map(e => ({
        id: e.id,
        organization_id: e.organization_id,
        facility_id: e.facility_id,
        facility_name: null,
        employee_code: e.employee_code,
        first_name: e.first_name,
        last_name: e.last_name,
        full_name: `${e.first_name} ${e.last_name}`,
        email: e.email,
        role: e.role,
        position: e.position,
        department_code: e.department_code,
        status: e.status,
        hire_date: e.hire_date,
        manager_id: e.manager_id,
        manager_name: null,
        phone: e.profile?.phone || '',
        extension: e.profile?.extension || '',
        office_location: e.profile?.location || '',
        avatar_url: e.profile?.avatar_url || '',
        job_title: e.profile?.title || e.position || '',
        bio: e.profile?.bio || '',
        skills: e.profile?.skills || [],
        created_at: '',
      }));

      return entries;
    },
    enabled: !!organizationId,
  });

  const searchDirectory = (searchTerm: string, filters?: { departmentCode?: string; facilityId?: string; role?: string }) => {
    const employees = directoryQuery.data || [];
    const term = searchTerm.toLowerCase();

    return employees.filter(e => {
      const matchesSearch = !searchTerm || 
        e.full_name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.employee_code.toLowerCase().includes(term) ||
        (e.position?.toLowerCase().includes(term)) ||
        (e.department_code?.toLowerCase().includes(term));

      const matchesDepartment = !filters?.departmentCode || e.department_code === filters.departmentCode;
      const matchesFacility = !filters?.facilityId || e.facility_id === filters.facilityId;
      const matchesRole = !filters?.role || e.role === filters.role;

      return matchesSearch && matchesDepartment && matchesFacility && matchesRole;
    });
  };

  const getEmployeeById = (id: string) => {
    return directoryQuery.data?.find(e => e.id === id);
  };

  const getEmployeesByDepartment = (departmentCode: string) => {
    return directoryQuery.data?.filter(e => e.department_code === departmentCode) || [];
  };

  const getEmployeesByFacility = (facilityId: string) => {
    return directoryQuery.data?.filter(e => e.facility_id === facilityId) || [];
  };

  const getDepartments = () => {
    const departments = new Set<string>();
    directoryQuery.data?.forEach(e => {
      if (e.department_code) departments.add(e.department_code);
    });
    return Array.from(departments).sort();
  };

  return {
    directory: directoryQuery.data || [],
    isLoading: directoryQuery.isLoading,

    searchDirectory,
    getEmployeeById,
    getEmployeesByDepartment,
    getEmployeesByFacility,
    getDepartments,

    refetch: directoryQuery.refetch,
  };
}

export function useSupabasePortalStats() {
  const { organizationId } = useOrganization();

  const statsQuery = useQuery({
    queryKey: ['portal', 'stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      console.log('[useSupabasePortalStats] Fetching portal stats');

      const [employeesRes, announcementsRes, bulletinRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active'),
        supabase
          .from('portal_announcements')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'published'),
        supabase
          .from('bulletin_posts')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
      ]);

      return {
        activeEmployees: employeesRes.count || 0,
        publishedAnnouncements: announcementsRes.count || 0,
        bulletinPosts: bulletinRes.count || 0,
      };
    },
    enabled: !!organizationId,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    refetch: statsQuery.refetch,
  };
}
