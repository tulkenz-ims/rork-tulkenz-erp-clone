import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type HoldTagStatus = 'on_hold' | 'released' | 'scrapped' | 'reworked' | 'returned';
export type HoldType = 'quality' | 'regulatory' | 'customer' | 'supplier' | 'investigation' | 'recall' | 'other';
export type DispositionType = 'release' | 'scrap' | 'rework' | 'return_to_supplier' | 'downgrade' | 'other';

export interface HoldTag {
  id: string;
  organization_id: string;
  hold_tag_number: string;
  status: HoldTagStatus;
  hold_type: HoldType;
  reason: string;
  product_name: string;
  product_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity: number;
  unit_of_measure: string;
  location: string | null;
  facility_id: string | null;
  hold_date: string;
  held_by: string;
  held_by_id: string | null;
  expected_resolution_date: string | null;
  ncr_id: string | null;
  ncr_number: string | null;
  capa_id: string | null;
  capa_number: string | null;
  disposition: DispositionType | null;
  disposition_reason: string | null;
  disposition_date: string | null;
  disposition_by: string | null;
  disposition_by_id: string | null;
  disposition_quantity: number | null;
  released_quantity: number | null;
  scrapped_quantity: number | null;
  reworked_quantity: number | null;
  returned_quantity: number | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type CreateHoldTagInput = Omit<HoldTag, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export interface HoldTagFilters {
  status?: HoldTagStatus;
  holdType?: HoldType;
  facilityId?: string;
  lotNumber?: string;
}

export function useSupabaseHoldTags(filters?: HoldTagFilters) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const holdTagsQuery = useQuery({
    queryKey: ['hold_tags', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseHoldTags] Fetching hold tags with filters:', filters);

      let query = supabase
        .from('hold_tags')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.holdType) {
        query = query.eq('hold_type', filters.holdType);
      }
      if (filters?.facilityId) {
        query = query.eq('facility_id', filters.facilityId);
      }
      if (filters?.lotNumber) {
        query = query.eq('lot_number', filters.lotNumber);
      }

      const { data, error } = await query.order('hold_date', { ascending: false });

      if (error) throw error;
      return (data || []) as HoldTag[];
    },
    enabled: !!organizationId,
  });

  const activeHoldsQuery = useQuery({
    queryKey: ['hold_tags', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseHoldTags] Fetching active holds');

      const { data, error } = await supabase
        .from('hold_tags')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'on_hold')
        .order('hold_date', { ascending: false });

      if (error) throw error;
      return (data || []) as HoldTag[];
    },
    enabled: !!organizationId,
  });

  const overdueHoldsQuery = useQuery({
    queryKey: ['hold_tags', 'overdue', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      console.log('[useSupabaseHoldTags] Fetching overdue holds');

      const { data, error } = await supabase
        .from('hold_tags')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'on_hold')
        .lt('expected_resolution_date', today)
        .order('expected_resolution_date', { ascending: true });

      if (error) throw error;
      return (data || []) as HoldTag[];
    },
    enabled: !!organizationId,
  });

  const createHoldTagMutation = useMutation({
    mutationFn: async (input: CreateHoldTagInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseHoldTags] Creating hold tag:', input.hold_tag_number);

      const { data, error } = await supabase
        .from('hold_tags')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const updateHoldTagMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HoldTag> & { id: string }) => {
      console.log('[useSupabaseHoldTags] Updating hold tag:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const releaseHoldMutation = useMutation({
    mutationFn: async ({ 
      id, 
      releasedBy, 
      releasedById, 
      quantity, 
      reason, 
      notes 
    }: { 
      id: string; 
      releasedBy: string; 
      releasedById?: string; 
      quantity: number; 
      reason?: string; 
      notes?: string;
    }) => {
      console.log('[useSupabaseHoldTags] Releasing hold:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update({
          status: 'released' as HoldTagStatus,
          disposition: 'release' as DispositionType,
          disposition_reason: reason || 'Released per quality review',
          disposition_date: new Date().toISOString(),
          disposition_by: releasedBy,
          disposition_by_id: releasedById || null,
          disposition_quantity: quantity,
          released_quantity: quantity,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const scrapHoldMutation = useMutation({
    mutationFn: async ({ 
      id, 
      scrappedBy, 
      scrappedById, 
      quantity, 
      reason, 
      notes 
    }: { 
      id: string; 
      scrappedBy: string; 
      scrappedById?: string; 
      quantity: number; 
      reason: string; 
      notes?: string;
    }) => {
      console.log('[useSupabaseHoldTags] Scrapping hold:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update({
          status: 'scrapped' as HoldTagStatus,
          disposition: 'scrap' as DispositionType,
          disposition_reason: reason,
          disposition_date: new Date().toISOString(),
          disposition_by: scrappedBy,
          disposition_by_id: scrappedById || null,
          disposition_quantity: quantity,
          scrapped_quantity: quantity,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const reworkHoldMutation = useMutation({
    mutationFn: async ({ 
      id, 
      reworkedBy, 
      reworkedById, 
      quantity, 
      reason, 
      notes 
    }: { 
      id: string; 
      reworkedBy: string; 
      reworkedById?: string; 
      quantity: number; 
      reason: string; 
      notes?: string;
    }) => {
      console.log('[useSupabaseHoldTags] Reworking hold:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update({
          status: 'reworked' as HoldTagStatus,
          disposition: 'rework' as DispositionType,
          disposition_reason: reason,
          disposition_date: new Date().toISOString(),
          disposition_by: reworkedBy,
          disposition_by_id: reworkedById || null,
          disposition_quantity: quantity,
          reworked_quantity: quantity,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const returnToSupplierMutation = useMutation({
    mutationFn: async ({ 
      id, 
      returnedBy, 
      returnedById, 
      quantity, 
      reason, 
      notes 
    }: { 
      id: string; 
      returnedBy: string; 
      returnedById?: string; 
      quantity: number; 
      reason: string; 
      notes?: string;
    }) => {
      console.log('[useSupabaseHoldTags] Returning to supplier:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update({
          status: 'returned' as HoldTagStatus,
          disposition: 'return_to_supplier' as DispositionType,
          disposition_reason: reason,
          disposition_date: new Date().toISOString(),
          disposition_by: returnedBy,
          disposition_by_id: returnedById || null,
          disposition_quantity: quantity,
          returned_quantity: quantity,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const linkNCRMutation = useMutation({
    mutationFn: async ({ id, ncrId, ncrNumber }: { id: string; ncrId: string; ncrNumber: string }) => {
      console.log('[useSupabaseHoldTags] Linking NCR to hold:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update({
          ncr_id: ncrId,
          ncr_number: ncrNumber,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const linkCAPAMutation = useMutation({
    mutationFn: async ({ id, capaId, capaNumber }: { id: string; capaId: string; capaNumber: string }) => {
      console.log('[useSupabaseHoldTags] Linking CAPA to hold:', id);

      const { data, error } = await supabase
        .from('hold_tags')
        .update({
          capa_id: capaId,
          capa_number: capaNumber,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HoldTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const deleteHoldTagMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseHoldTags] Deleting hold tag:', id);

      const { error } = await supabase
        .from('hold_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hold_tags'] });
    },
  });

  const generateHoldTagNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HT-${year}${month}${day}-${random}`;
  };

  const getHoldsByType = (holdType: HoldType) => {
    return holdTagsQuery.data?.filter(hold => hold.hold_type === holdType) || [];
  };

  const getHoldsByStatus = (status: HoldTagStatus) => {
    return holdTagsQuery.data?.filter(hold => hold.status === status) || [];
  };

  const getHoldsByLot = (lotNumber: string) => {
    return holdTagsQuery.data?.filter(hold => hold.lot_number === lotNumber) || [];
  };

  const getHoldsByProduct = (productCode: string) => {
    return holdTagsQuery.data?.filter(hold => hold.product_code === productCode) || [];
  };

  const getHoldsByLocation = (location: string) => {
    return holdTagsQuery.data?.filter(hold => hold.location === location) || [];
  };

  const getHoldStats = () => {
    const holds = holdTagsQuery.data || [];
    const activeHolds = holds.filter(h => h.status === 'on_hold');
    
    return {
      totalActive: activeHolds.length,
      totalQuantityOnHold: activeHolds.reduce((sum, h) => sum + h.quantity, 0),
      byType: {
        quality: activeHolds.filter(h => h.hold_type === 'quality').length,
        regulatory: activeHolds.filter(h => h.hold_type === 'regulatory').length,
        customer: activeHolds.filter(h => h.hold_type === 'customer').length,
        supplier: activeHolds.filter(h => h.hold_type === 'supplier').length,
        investigation: activeHolds.filter(h => h.hold_type === 'investigation').length,
        recall: activeHolds.filter(h => h.hold_type === 'recall').length,
      },
      overdue: (overdueHoldsQuery.data || []).length,
    };
  };

  return {
    holdTags: holdTagsQuery.data || [],
    activeHolds: activeHoldsQuery.data || [],
    overdueHolds: overdueHoldsQuery.data || [],
    isLoading: holdTagsQuery.isLoading,

    createHoldTag: createHoldTagMutation.mutateAsync,
    updateHoldTag: updateHoldTagMutation.mutateAsync,
    releaseHold: releaseHoldMutation.mutateAsync,
    scrapHold: scrapHoldMutation.mutateAsync,
    reworkHold: reworkHoldMutation.mutateAsync,
    returnToSupplier: returnToSupplierMutation.mutateAsync,
    linkNCR: linkNCRMutation.mutateAsync,
    linkCAPA: linkCAPAMutation.mutateAsync,
    deleteHoldTag: deleteHoldTagMutation.mutateAsync,

    generateHoldTagNumber,
    getHoldsByType,
    getHoldsByStatus,
    getHoldsByLot,
    getHoldsByProduct,
    getHoldsByLocation,
    getHoldStats,

    refetch: () => {
      holdTagsQuery.refetch();
      activeHoldsQuery.refetch();
      overdueHoldsQuery.refetch();
    },
  };
}
