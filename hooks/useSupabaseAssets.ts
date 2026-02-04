import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

export interface Asset {
  id: string;
  organization_id: string;
  facility_id: string | null;
  name: string;
  asset_tag: string;
  category: string;
  status: AssetStatus;
  location: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  assigned_to: string | null;
  barcode: string | null;
  qr_code: string | null;
  department_code: string | null;
  cost_center: string | null;
  gl_account: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type CreateAssetInput = Omit<Asset, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseAssets() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const assetsQuery = useQuery({
    queryKey: ['assets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAssets] Fetching assets');

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Asset[];
    },
    enabled: !!organizationId,
  });

  const activeAssetsQuery = useQuery({
    queryKey: ['assets', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseAssets] Fetching active assets');

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Asset[];
    },
    enabled: !!organizationId,
  });

  const createAssetMutation = useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseAssets] Creating asset:', input.name);

      const { data, error } = await supabase
        .from('assets')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Asset> & { id: string }) => {
      console.log('[useSupabaseAssets] Updating asset:', id);

      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const assignAssetMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string | null }) => {
      console.log('[useSupabaseAssets] Assigning asset:', id, 'to', assignedTo);

      const { data, error } = await supabase
        .from('assets')
        .update({ assigned_to: assignedTo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AssetStatus; notes?: string }) => {
      console.log('[useSupabaseAssets] Changing asset status:', id, status);

      const updates: Partial<Asset> = { status };
      if (notes) updates.notes = notes;

      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const retireAssetMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      console.log('[useSupabaseAssets] Retiring asset:', id);

      const { data, error } = await supabase
        .from('assets')
        .update({ 
          status: 'retired' as AssetStatus,
          assigned_to: null,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseAssets] Deleting asset:', id);

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const getAssetsByCategory = (category: string) => {
    return assetsQuery.data?.filter(asset => asset.category === category) || [];
  };

  const getAssetsByStatus = (status: AssetStatus) => {
    return assetsQuery.data?.filter(asset => asset.status === status) || [];
  };

  const getAssetsByEmployee = (employeeId: string) => {
    return assetsQuery.data?.filter(asset => asset.assigned_to === employeeId) || [];
  };

  const getAssetsByFacility = (facilityId: string) => {
    return assetsQuery.data?.filter(asset => asset.facility_id === facilityId) || [];
  };

  const getExpiringWarranties = (daysAhead: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return assetsQuery.data?.filter(asset => {
      if (!asset.warranty_expiry) return false;
      const expiryDate = new Date(asset.warranty_expiry);
      return expiryDate <= cutoffDate && expiryDate >= new Date();
    }) || [];
  };

  const generateAssetTag = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `AST-${year}-${random}`;
  };

  return {
    assets: assetsQuery.data || [],
    activeAssets: activeAssetsQuery.data || [],
    isLoading: assetsQuery.isLoading,

    createAsset: createAssetMutation.mutateAsync,
    updateAsset: updateAssetMutation.mutateAsync,
    assignAsset: assignAssetMutation.mutateAsync,
    changeStatus: changeStatusMutation.mutateAsync,
    retireAsset: retireAssetMutation.mutateAsync,
    deleteAsset: deleteAssetMutation.mutateAsync,

    getAssetsByCategory,
    getAssetsByStatus,
    getAssetsByEmployee,
    getAssetsByFacility,
    getExpiringWarranties,
    generateAssetTag,

    refetch: () => {
      assetsQuery.refetch();
      activeAssetsQuery.refetch();
    },
  };
}
