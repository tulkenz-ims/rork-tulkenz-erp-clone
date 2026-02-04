import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables } from '@/lib/supabase';
import {
  SharedMaterialGroup,
  SharedMaterialEntry,
  InterUnitTransfer,
  INVENTORY_DEPARTMENTS,
} from '@/constants/inventoryDepartmentCodes';

type Material = Tables['materials'];
type InventoryHistory = Tables['inventory_history'];

export interface SharedMaterialsStats {
  totalGroups: number;
  totalLinkedMaterials: number;
  totalValue: number;
  pendingTransfers: number;
  departmentsInvolved: number;
}

export function useSharedMaterialGroupsQuery() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['shared-material-groups', organizationId],
    queryFn: async (): Promise<SharedMaterialGroup[]> => {
      if (!organizationId) return [];

      const { data: materials, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('classification', 'shared')
        .eq('status', 'active')
        .order('manufacturer_part_number', { ascending: true });

      if (error) {
        console.error('[useSharedMaterialGroupsQuery] Error:', error);
        throw new Error(error.message);
      }

      const groupedByOEM = new Map<string, Material[]>();
      (materials || []).forEach((mat: Material) => {
        const oemKey = mat.manufacturer_part_number || mat.vendor_part_number || mat.sku;
        if (!groupedByOEM.has(oemKey)) {
          groupedByOEM.set(oemKey, []);
        }
        groupedByOEM.get(oemKey)!.push(mat);
      });

      const groups: SharedMaterialGroup[] = [];
      groupedByOEM.forEach((mats, oemPartNumber) => {
        if (mats.length > 1) {
          const linkedMaterials: SharedMaterialEntry[] = mats.map((mat, index) => ({
            materialNumber: mat.material_number,
            departmentCode: mat.inventory_department,
            departmentName: INVENTORY_DEPARTMENTS[mat.inventory_department]?.name || `Dept ${mat.inventory_department}`,
            onHand: Number(mat.on_hand) || 0,
            location: mat.location || 'N/A',
            unitCost: Number(mat.unit_price) || 0,
            isPrimary: index === 0,
          }));

          const totalOnHand = linkedMaterials.reduce((sum, m) => sum + m.onHand, 0);
          const totalValue = linkedMaterials.reduce((sum, m) => sum + (m.onHand * m.unitCost), 0);

          groups.push({
            id: `SHARED-${oemPartNumber}-${mats[0].id.slice(0, 8)}`,
            name: mats[0].name,
            description: mats[0].description || undefined,
            oemPartNumber,
            manufacturer: mats[0].manufacturer || undefined,
            manufacturerPartNumber: mats[0].manufacturer_part_number || undefined,
            linkedMaterials,
            totalOnHand,
            totalValue,
            status: 'active',
            createdAt: mats[0].created_at,
            createdBy: 'System',
            updatedAt: mats[0].updated_at,
          });
        }
      });

      console.log('[useSharedMaterialGroupsQuery] Found', groups.length, 'shared material groups');
      return groups;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInterUnitTransfersQuery() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['inter-unit-transfers', organizationId],
    queryFn: async (): Promise<InterUnitTransfer[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('action', 'transfer')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useInterUnitTransfersQuery] Error:', error);
        throw new Error(error.message);
      }

      const transfers: InterUnitTransfer[] = (data || []).map((record: InventoryHistory) => {
        const notes = record.notes || '';
        const parsedData = parseTransferNotes(notes);
        
        return {
          id: record.id,
          timestamp: record.created_at,
          sharedGroupId: parsedData.sharedGroupId || '',
          fromMaterialNumber: parsedData.fromMaterialNumber || record.material_sku,
          toMaterialNumber: parsedData.toMaterialNumber || '',
          fromDepartment: parsedData.fromDepartment || 0,
          toDepartment: parsedData.toDepartment || 0,
          quantity: Math.abs(Number(record.quantity_change)) || 0,
          unitCost: parsedData.unitCost || 0,
          totalValue: parsedData.totalValue || 0,
          status: parseTransferStatus(record.reason || ''),
          requestedBy: record.performed_by,
          approvedBy: parsedData.approvedBy,
          completedAt: parsedData.status === 'completed' ? record.created_at : undefined,
          notes: parsedData.transferNotes,
          referenceNumber: parsedData.referenceNumber || `IUT-${record.id.slice(0, 8)}`,
        };
      });

      console.log('[useInterUnitTransfersQuery] Found', transfers.length, 'transfers');
      return transfers;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

function parseTransferNotes(notes: string): {
  sharedGroupId?: string;
  fromMaterialNumber?: string;
  toMaterialNumber?: string;
  fromDepartment?: number;
  toDepartment?: number;
  unitCost?: number;
  totalValue?: number;
  approvedBy?: string;
  status?: string;
  transferNotes?: string;
  referenceNumber?: string;
} {
  try {
    if (notes.startsWith('{')) {
      return JSON.parse(notes);
    }
  } catch (e) {
    // Not JSON, return empty
  }
  return { transferNotes: notes };
}

function parseTransferStatus(reason: string): InterUnitTransfer['status'] {
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes('completed') || lowerReason.includes('complete')) return 'completed';
  if (lowerReason.includes('approved')) return 'approved';
  if (lowerReason.includes('rejected')) return 'rejected';
  if (lowerReason.includes('cancelled') || lowerReason.includes('canceled')) return 'cancelled';
  if (lowerReason.includes('pending')) return 'pending';
  return 'completed';
}

export function useCreateInterUnitTransfer(options?: {
  onSuccess?: (transfer: InterUnitTransfer) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sharedGroupId: string;
      fromMaterial: { id: string; materialNumber: string; name: string; sku: string; onHand: number };
      toMaterial: { id: string; materialNumber: string; departmentCode: number };
      quantity: number;
      unitCost: number;
      requestedBy: string;
      notes?: string;
    }): Promise<InterUnitTransfer> => {
      if (!organizationId) throw new Error('No organization selected');

      const { sharedGroupId, fromMaterial, toMaterial, quantity, unitCost, requestedBy, notes } = params;
      const fromDept = parseInt(fromMaterial.materialNumber.charAt(0), 10);
      const toDept = parseInt(toMaterial.materialNumber.charAt(0), 10);
      const totalValue = quantity * unitCost;
      const referenceNumber = `IUT-${fromDept}${toDept}-${Date.now().toString().slice(-6)}`;

      const transferData = {
        sharedGroupId,
        fromMaterialNumber: fromMaterial.materialNumber,
        toMaterialNumber: toMaterial.materialNumber,
        fromDepartment: fromDept,
        toDepartment: toDept,
        unitCost,
        totalValue,
        status: 'pending',
        transferNotes: notes,
        referenceNumber,
      };

      const { data: historyRecord, error: historyError } = await supabase
        .from('inventory_history')
        .insert({
          organization_id: organizationId,
          material_id: fromMaterial.id,
          material_name: fromMaterial.name,
          material_sku: fromMaterial.sku,
          action: 'transfer',
          quantity_before: fromMaterial.onHand,
          quantity_after: fromMaterial.onHand - quantity,
          quantity_change: -quantity,
          reason: 'Inter-Unit Transfer - pending',
          performed_by: requestedBy,
          notes: JSON.stringify(transferData),
        })
        .select()
        .single();

      if (historyError) {
        console.error('[useCreateInterUnitTransfer] Error creating history:', historyError);
        throw new Error(historyError.message);
      }

      const transfer: InterUnitTransfer = {
        id: historyRecord.id,
        timestamp: historyRecord.created_at,
        sharedGroupId,
        fromMaterialNumber: fromMaterial.materialNumber,
        toMaterialNumber: toMaterial.materialNumber,
        fromDepartment: fromDept,
        toDepartment: toDept,
        quantity,
        unitCost,
        totalValue,
        status: 'pending',
        requestedBy,
        notes,
        referenceNumber,
      };

      console.log('[useCreateInterUnitTransfer] Created transfer:', transfer.referenceNumber);
      return transfer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inter-unit-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_history'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateInterUnitTransfer] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveTransfer(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { transferId: string; approvedBy: string }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: existing, error: fetchError } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('id', params.transferId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const parsedNotes = parseTransferNotes(existing.notes || '');
      const updatedNotes = {
        ...parsedNotes,
        status: 'approved',
        approvedBy: params.approvedBy,
      };

      const { error: updateError } = await supabase
        .from('inventory_history')
        .update({
          reason: 'Inter-Unit Transfer - approved',
          notes: JSON.stringify(updatedNotes),
        })
        .eq('id', params.transferId)
        .eq('organization_id', organizationId);

      if (updateError) throw new Error(updateError.message);

      console.log('[useApproveTransfer] Approved transfer:', params.transferId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-unit-transfers'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useApproveTransfer] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useRejectTransfer(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { transferId: string; rejectedBy: string; reason?: string }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: existing, error: fetchError } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('id', params.transferId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const parsedNotes = parseTransferNotes(existing.notes || '');
      const updatedNotes = {
        ...parsedNotes,
        status: 'rejected',
        rejectedBy: params.rejectedBy,
        rejectionReason: params.reason,
      };

      const { error: updateError } = await supabase
        .from('inventory_history')
        .update({
          reason: 'Inter-Unit Transfer - rejected',
          notes: JSON.stringify(updatedNotes),
        })
        .eq('id', params.transferId)
        .eq('organization_id', organizationId);

      if (updateError) throw new Error(updateError.message);

      console.log('[useRejectTransfer] Rejected transfer:', params.transferId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-unit-transfers'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useRejectTransfer] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useCompleteTransfer(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { transferId: string; completedBy: string }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: existing, error: fetchError } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('id', params.transferId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const parsedNotes = parseTransferNotes(existing.notes || '');

      const { data: fromMaterial, error: fromError } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('material_number', parsedNotes.fromMaterialNumber)
        .single();

      if (fromError) {
        console.warn('[useCompleteTransfer] Could not find from material:', parsedNotes.fromMaterialNumber);
      }

      const { data: toMaterial, error: toError } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('material_number', parsedNotes.toMaterialNumber)
        .single();

      if (toError) {
        console.warn('[useCompleteTransfer] Could not find to material:', parsedNotes.toMaterialNumber);
      }

      const quantity = Math.abs(Number(existing.quantity_change)) || 0;

      if (fromMaterial) {
        const newFromOnHand = Math.max(0, Number(fromMaterial.on_hand) - quantity);
        await supabase
          .from('materials')
          .update({ on_hand: newFromOnHand })
          .eq('id', fromMaterial.id)
          .eq('organization_id', organizationId);
      }

      if (toMaterial) {
        const newToOnHand = Number(toMaterial.on_hand) + quantity;
        await supabase
          .from('materials')
          .update({ on_hand: newToOnHand })
          .eq('id', toMaterial.id)
          .eq('organization_id', organizationId);

        await supabase.from('inventory_history').insert({
          organization_id: organizationId,
          material_id: toMaterial.id,
          material_name: toMaterial.name,
          material_sku: toMaterial.sku,
          action: 'transfer',
          quantity_before: toMaterial.on_hand,
          quantity_after: newToOnHand,
          quantity_change: quantity,
          reason: 'Inter-Unit Transfer - received',
          performed_by: params.completedBy,
          notes: JSON.stringify({
            ...parsedNotes,
            receivedFrom: parsedNotes.fromMaterialNumber,
          }),
        });
      }

      const updatedNotes = {
        ...parsedNotes,
        status: 'completed',
        completedBy: params.completedBy,
        completedAt: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('inventory_history')
        .update({
          reason: 'Inter-Unit Transfer - completed',
          notes: JSON.stringify(updatedNotes),
        })
        .eq('id', params.transferId)
        .eq('organization_id', organizationId);

      if (updateError) throw new Error(updateError.message);

      console.log('[useCompleteTransfer] Completed transfer:', params.transferId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inter-unit-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['shared-material-groups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_history'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useCompleteTransfer] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSharedMaterialsStats() {
  const { data: groups = [] } = useSharedMaterialGroupsQuery();
  const { data: transfers = [] } = useInterUnitTransfersQuery();

  const stats: SharedMaterialsStats = {
    totalGroups: groups.length,
    totalLinkedMaterials: groups.reduce((sum, g) => sum + g.linkedMaterials.length, 0),
    totalValue: groups.reduce((sum, g) => sum + g.totalValue, 0),
    pendingTransfers: transfers.filter(t => t.status === 'pending' || t.status === 'approved').length,
    departmentsInvolved: new Set(
      groups.flatMap(g => g.linkedMaterials.map(m => m.departmentCode))
    ).size,
  };

  return stats;
}

export function usePendingTransfers() {
  const { data: transfers = [] } = useInterUnitTransfersQuery();
  return transfers.filter(t => t.status === 'pending');
}

export function useTransfersForGroup(groupId: string) {
  const { data: transfers = [] } = useInterUnitTransfersQuery();
  return transfers.filter(t => t.sharedGroupId === groupId);
}

export function useMaterialByMaterialNumber(materialNumber: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['material', 'byMaterialNumber', materialNumber, organizationId],
    queryFn: async () => {
      if (!organizationId || !materialNumber) return null;

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('material_number', materialNumber)
        .single();

      if (error) {
        console.error('[useMaterialByMaterialNumber] Error:', error);
        return null;
      }

      return data as Material;
    },
    enabled: !!organizationId && !!materialNumber,
    staleTime: 1000 * 60 * 5,
  });
}
