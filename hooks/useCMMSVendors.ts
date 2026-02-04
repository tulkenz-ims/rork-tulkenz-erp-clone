import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  Vendor,
  VendorStatus,
  VendorType,
  VendorContact,
  VendorAddress,
  VendorCertification,
  VendorInsurance,
  VendorContract,
  ContractStatus,
  ContractSLA,
  ContractContact,
  ContractFacility,
  ContractAttachment,
  ContractAmendment,
  ContractPerformanceReview,
  WarrantyTracking,
  WarrantyStatus,
  WarrantyClaim,
  WarrantyContact,
  WarrantyAttachment,
  generateVendorNumber,
  generateContractNumber,
  generateWarrantyNumber,
  generateClaimNumber,
} from '@/types/cmms';

// =============================================================================
// VENDOR HOOKS
// =============================================================================

export function useVendorsQuery(options?: {
  enabled?: boolean;
  status?: VendorStatus | VendorStatus[];
  type?: VendorType | VendorType[];
  isPreferred?: boolean;
  category?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'vendors', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_vendors')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.type) {
        if (Array.isArray(options.type)) {
          query = query.in('type', options.type);
        } else {
          query = query.eq('type', options.type);
        }
      }

      if (options?.isPreferred !== undefined) {
        query = query.eq('is_preferred_vendor', options.isPreferred);
      }

      if (options?.category) {
        query = query.contains('categories', [options.category]);
      }

      query = query.order('name', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useVendorsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useVendorsQuery] Fetched:', data?.length || 0, 'vendors');
      return (data || []).map(mapVendorFromDB) as Vendor[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveVendors() {
  return useVendorsQuery({ status: 'active' });
}

export function usePreferredVendors() {
  return useVendorsQuery({ status: 'active', isPreferred: true });
}

export function usePartsSuppliers() {
  return useVendorsQuery({ status: 'active', type: 'parts_supplier' });
}

export function useContractors() {
  return useVendorsQuery({ status: 'active', type: 'contractor' });
}

export function useVendorById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'vendors', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_vendors')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useVendorById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useVendorById] Fetched vendor:', id);
      return mapVendorFromDB(data) as Vendor;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateVendor(options?: {
  onSuccess?: (data: Vendor) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendor: Omit<Vendor, 'id' | 'vendorNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const vendorNumber = generateVendorNumber();

      const { data, error } = await supabase
        .from('cmms_vendors')
        .insert({
          organization_id: organizationId,
          vendor_number: vendorNumber,
          name: vendor.name,
          legal_name: vendor.legalName || null,
          type: vendor.type,
          status: vendor.status || 'pending_approval',
          tax_id: vendor.taxId || null,
          duns_number: vendor.dunsNumber || null,
          website: vendor.website || null,
          primary_contact: vendor.primaryContact,
          contacts: vendor.contacts || [],
          addresses: vendor.addresses || [],
          payment_terms: vendor.paymentTerms || null,
          payment_method: vendor.paymentMethod || null,
          currency: vendor.currency || 'USD',
          tax_exempt: vendor.taxExempt || false,
          tax_exempt_number: vendor.taxExemptNumber || null,
          certifications: vendor.certifications || [],
          insurance_coverage: vendor.insuranceCoverage || [],
          rating: vendor.rating || null,
          performance_score: vendor.performanceScore || null,
          categories: vendor.categories || [],
          notes: vendor.notes || null,
          is_preferred_vendor: vendor.isPreferredVendor || false,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateVendor] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateVendor] Created vendor:', data?.id);
      return mapVendorFromDB(data) as Vendor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendors'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateVendor] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateVendor(options?: {
  onSuccess?: (data: Vendor) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Vendor> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.legalName !== undefined) dbUpdates.legal_name = updates.legalName;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.taxId !== undefined) dbUpdates.tax_id = updates.taxId;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.primaryContact !== undefined) dbUpdates.primary_contact = updates.primaryContact;
      if (updates.contacts !== undefined) dbUpdates.contacts = updates.contacts;
      if (updates.addresses !== undefined) dbUpdates.addresses = updates.addresses;
      if (updates.paymentTerms !== undefined) dbUpdates.payment_terms = updates.paymentTerms;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.certifications !== undefined) dbUpdates.certifications = updates.certifications;
      if (updates.insuranceCoverage !== undefined) dbUpdates.insurance_coverage = updates.insuranceCoverage;
      if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
      if (updates.performanceScore !== undefined) dbUpdates.performance_score = updates.performanceScore;
      if (updates.categories !== undefined) dbUpdates.categories = updates.categories;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.isPreferredVendor !== undefined) dbUpdates.is_preferred_vendor = updates.isPreferredVendor;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;

      const { data, error } = await supabase
        .from('cmms_vendors')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateVendor] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateVendor] Updated vendor:', id);
      return mapVendorFromDB(data) as Vendor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendors'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateVendor] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveVendor(options?: {
  onSuccess?: (data: Vendor) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateVendor(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'active',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

export function useSuspendVendor(options?: {
  onSuccess?: (data: Vendor) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateVendor(options);

  return useMutation({
    mutationFn: async (id: string) => {
      return updateMutation.mutateAsync({
        id,
        updates: { status: 'suspended' },
      });
    },
  });
}

export function useDeleteVendor(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');

      const { error } = await supabase
        .from('cmms_vendors')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteVendor] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteVendor] Deleted vendor:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendors'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteVendor] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// VENDOR CONTRACTS HOOKS
// =============================================================================

export function useVendorContractsQuery(options?: {
  enabled?: boolean;
  status?: ContractStatus | ContractStatus[];
  vendorId?: string;
  type?: string;
  expiringWithinDays?: number;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'vendorContracts', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_vendor_contracts')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
        query = query
          .eq('status', 'active')
          .lte('expiry_date', futureDate.toISOString().split('T')[0])
          .gte('expiry_date', new Date().toISOString().split('T')[0]);
      }

      query = query.order('expiry_date', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useVendorContractsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useVendorContractsQuery] Fetched:', data?.length || 0, 'vendor contracts');
      return (data || []).map(mapVendorContractFromDB) as VendorContract[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveContracts() {
  return useVendorContractsQuery({ status: 'active' });
}

export function useExpiringContracts(days: number = 30) {
  return useVendorContractsQuery({ expiringWithinDays: days });
}

export function useContractsByVendor(vendorId: string | undefined | null) {
  return useVendorContractsQuery({
    vendorId: vendorId || undefined,
    enabled: !!vendorId,
  });
}

export function useVendorContractById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'vendorContracts', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_vendor_contracts')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useVendorContractById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useVendorContractById] Fetched vendor contract:', id);
      return mapVendorContractFromDB(data) as VendorContract;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateVendorContract(options?: {
  onSuccess?: (data: VendorContract) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: Omit<VendorContract, 'id' | 'contractNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const contractNumber = generateContractNumber();

      const { data, error } = await supabase
        .from('cmms_vendor_contracts')
        .insert({
          organization_id: organizationId,
          contract_number: contractNumber,
          vendor_id: contract.vendorId,
          vendor_name: contract.vendorName,
          vendor_number: contract.vendorNumber,
          name: contract.name,
          description: contract.description || null,
          type: contract.type,
          type_name: contract.typeName,
          status: contract.status || 'draft',
          effective_date: contract.effectiveDate,
          expiry_date: contract.expiryDate,
          renewal_date: contract.renewalDate || null,
          auto_renewal: contract.autoRenewal || false,
          renewal_term_months: contract.renewalTermMonths || null,
          notification_days: contract.notificationDays || 30,
          total_value: contract.totalValue || null,
          annual_value: contract.annualValue || null,
          spent_to_date: contract.spentToDate || 0,
          remaining_value: contract.remainingValue || null,
          payment_terms: contract.paymentTerms || null,
          scope: contract.scope,
          deliverables: contract.deliverables || null,
          sla_metrics: contract.slaMetrics || [],
          contacts: contract.contacts || [],
          facilities: contract.facilities || [],
          attachments: contract.attachments || [],
          amendment_history: contract.amendmentHistory || [],
          performance_reviews: contract.performanceReviews || [],
          created_by: contract.createdBy,
          created_by_name: contract.createdByName,
          notes: contract.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateVendorContract] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateVendorContract] Created vendor contract:', data?.id);
      return mapVendorContractFromDB(data) as VendorContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendorContracts'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateVendorContract] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateVendorContract(options?: {
  onSuccess?: (data: VendorContract) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VendorContract> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate;
      if (updates.renewalDate !== undefined) dbUpdates.renewal_date = updates.renewalDate;
      if (updates.autoRenewal !== undefined) dbUpdates.auto_renewal = updates.autoRenewal;
      if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;
      if (updates.annualValue !== undefined) dbUpdates.annual_value = updates.annualValue;
      if (updates.spentToDate !== undefined) dbUpdates.spent_to_date = updates.spentToDate;
      if (updates.remainingValue !== undefined) dbUpdates.remaining_value = updates.remainingValue;
      if (updates.scope !== undefined) dbUpdates.scope = updates.scope;
      if (updates.deliverables !== undefined) dbUpdates.deliverables = updates.deliverables;
      if (updates.slaMetrics !== undefined) dbUpdates.sla_metrics = updates.slaMetrics;
      if (updates.contacts !== undefined) dbUpdates.contacts = updates.contacts;
      if (updates.facilities !== undefined) dbUpdates.facilities = updates.facilities;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.amendmentHistory !== undefined) dbUpdates.amendment_history = updates.amendmentHistory;
      if (updates.performanceReviews !== undefined) dbUpdates.performance_reviews = updates.performanceReviews;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.terminatedBy !== undefined) dbUpdates.terminated_by = updates.terminatedBy;
      if (updates.terminatedByName !== undefined) dbUpdates.terminated_by_name = updates.terminatedByName;
      if (updates.terminatedAt !== undefined) dbUpdates.terminated_at = updates.terminatedAt;
      if (updates.terminationReason !== undefined) dbUpdates.termination_reason = updates.terminationReason;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('cmms_vendor_contracts')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateVendorContract] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateVendorContract] Updated vendor contract:', id);
      return mapVendorContractFromDB(data) as VendorContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendorContracts'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateVendorContract] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveContract(options?: {
  onSuccess?: (data: VendorContract) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateVendorContract(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'active',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

export function useTerminateContract(options?: {
  onSuccess?: (data: VendorContract) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateVendorContract(options);

  return useMutation({
    mutationFn: async ({ id, terminatedBy, terminatedByName, reason }: { id: string; terminatedBy: string; terminatedByName: string; reason: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'cancelled',
          terminatedBy,
          terminatedByName,
          terminatedAt: new Date().toISOString(),
          terminationReason: reason,
        },
      });
    },
  });
}

export function useAddContractAmendment(options?: {
  onSuccess?: (data: VendorContract) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, amendment }: { contractId: string; amendment: Omit<ContractAmendment, 'id'> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: contract, error: fetchError } = await supabase
        .from('cmms_vendor_contracts')
        .select('amendment_history, total_value')
        .eq('id', contractId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const newAmendment: ContractAmendment = {
        ...amendment,
        id: `AMD-${Date.now()}`,
      };

      const updatedHistory = [...(contract.amendment_history || []), newAmendment];
      const newTotalValue = (contract.total_value || 0) + (amendment.valueChange || 0);

      const { data, error } = await supabase
        .from('cmms_vendor_contracts')
        .update({
          amendment_history: updatedHistory,
          total_value: newTotalValue,
        })
        .eq('id', contractId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      console.log('[useAddContractAmendment] Added amendment to contract:', contractId);
      return mapVendorContractFromDB(data) as VendorContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendorContracts'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useAddContractAmendment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useAddPerformanceReview(options?: {
  onSuccess?: (data: VendorContract) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, review }: { contractId: string; review: Omit<ContractPerformanceReview, 'id'> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: contract, error: fetchError } = await supabase
        .from('cmms_vendor_contracts')
        .select('performance_reviews')
        .eq('id', contractId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const newReview: ContractPerformanceReview = {
        ...review,
        id: `REV-${Date.now()}`,
      };

      const updatedReviews = [...(contract.performance_reviews || []), newReview];

      const { data, error } = await supabase
        .from('cmms_vendor_contracts')
        .update({ performance_reviews: updatedReviews })
        .eq('id', contractId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      console.log('[useAddPerformanceReview] Added review to contract:', contractId);
      return mapVendorContractFromDB(data) as VendorContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'vendorContracts'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useAddPerformanceReview] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// WARRANTY TRACKING HOOKS
// =============================================================================

export function useWarrantiesQuery(options?: {
  enabled?: boolean;
  status?: WarrantyStatus | WarrantyStatus[];
  vendorId?: string;
  equipmentId?: string;
  facilityId?: string;
  expiringWithinDays?: number;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'warranties', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_warranty_tracking')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.vendorId) {
        query = query.eq('vendor_id', options.vendorId);
      }

      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
        query = query
          .eq('status', 'active')
          .lte('warranty_end_date', futureDate.toISOString().split('T')[0])
          .gte('warranty_end_date', new Date().toISOString().split('T')[0]);
      }

      query = query.order('warranty_end_date', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useWarrantiesQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useWarrantiesQuery] Fetched:', data?.length || 0, 'warranties');
      return (data || []).map(mapWarrantyFromDB) as WarrantyTracking[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveWarranties() {
  return useWarrantiesQuery({ status: 'active' });
}

export function useExpiringWarranties(days: number = 30) {
  return useWarrantiesQuery({ expiringWithinDays: days });
}

export function useWarrantiesByEquipment(equipmentId: string | undefined | null) {
  return useWarrantiesQuery({
    equipmentId: equipmentId || undefined,
    enabled: !!equipmentId,
  });
}

export function useWarrantyById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'warranties', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_warranty_tracking')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useWarrantyById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useWarrantyById] Fetched warranty:', id);
      return mapWarrantyFromDB(data) as WarrantyTracking;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateWarranty(options?: {
  onSuccess?: (data: WarrantyTracking) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warranty: Omit<WarrantyTracking, 'id' | 'warrantyNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const warrantyNumber = generateWarrantyNumber();

      const { data, error } = await supabase
        .from('cmms_warranty_tracking')
        .insert({
          organization_id: organizationId,
          warranty_number: warrantyNumber,
          facility_id: warranty.facilityId,
          facility_name: warranty.facilityName,
          equipment_id: warranty.equipmentId,
          equipment_name: warranty.equipmentName,
          equipment_tag: warranty.equipmentTag,
          serial_number: warranty.serialNumber || null,
          vendor_id: warranty.vendorId,
          vendor_name: warranty.vendorName,
          type: warranty.type,
          type_name: warranty.typeName,
          status: warranty.status || 'active',
          purchase_date: warranty.purchaseDate,
          install_date: warranty.installDate || null,
          warranty_start_date: warranty.warrantyStartDate,
          warranty_end_date: warranty.warrantyEndDate,
          coverage_description: warranty.coverageDescription,
          exclusions: warranty.exclusions || null,
          limitations: warranty.limitations || null,
          labor_included: warranty.laborIncluded,
          parts_included: warranty.partsIncluded,
          onsite_service: warranty.onsiteService,
          response_time: warranty.responseTime || null,
          deductible: warranty.deductible || null,
          max_claim_amount: warranty.maxClaimAmount || null,
          purchase_price: warranty.purchasePrice || null,
          warranty_cost: warranty.warrantyCost || null,
          claims: warranty.claims || [],
          contacts: warranty.contacts || [],
          attachments: warranty.attachments || [],
          notes: warranty.notes || null,
          notification_days: warranty.notificationDays || 30,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateWarranty] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateWarranty] Created warranty:', data?.id);
      return mapWarrantyFromDB(data) as WarrantyTracking;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'warranties'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateWarranty] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateWarranty(options?: {
  onSuccess?: (data: WarrantyTracking) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarrantyTracking> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.warrantyEndDate !== undefined) dbUpdates.warranty_end_date = updates.warrantyEndDate;
      if (updates.coverageDescription !== undefined) dbUpdates.coverage_description = updates.coverageDescription;
      if (updates.exclusions !== undefined) dbUpdates.exclusions = updates.exclusions;
      if (updates.limitations !== undefined) dbUpdates.limitations = updates.limitations;
      if (updates.claims !== undefined) dbUpdates.claims = updates.claims;
      if (updates.contacts !== undefined) dbUpdates.contacts = updates.contacts;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.notificationDays !== undefined) dbUpdates.notification_days = updates.notificationDays;

      const { data, error } = await supabase
        .from('cmms_warranty_tracking')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateWarranty] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateWarranty] Updated warranty:', id);
      return mapWarrantyFromDB(data) as WarrantyTracking;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'warranties'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateWarranty] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useSubmitWarrantyClaim(options?: {
  onSuccess?: (data: WarrantyTracking) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warrantyId, claim }: { warrantyId: string; claim: Omit<WarrantyClaim, 'id' | 'claimNumber'> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: warranty, error: fetchError } = await supabase
        .from('cmms_warranty_tracking')
        .select('claims')
        .eq('id', warrantyId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const newClaim: WarrantyClaim = {
        ...claim,
        id: `CLM-${Date.now()}`,
        claimNumber: generateClaimNumber(),
      };

      const updatedClaims = [...(warranty.claims || []), newClaim];

      const { data, error } = await supabase
        .from('cmms_warranty_tracking')
        .update({
          claims: updatedClaims,
          status: 'claimed',
        })
        .eq('id', warrantyId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      console.log('[useSubmitWarrantyClaim] Submitted claim for warranty:', warrantyId);
      return mapWarrantyFromDB(data) as WarrantyTracking;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'warranties'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useSubmitWarrantyClaim] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateWarrantyClaim(options?: {
  onSuccess?: (data: WarrantyTracking) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warrantyId, claimId, updates }: { warrantyId: string; claimId: string; updates: Partial<WarrantyClaim> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data: warranty, error: fetchError } = await supabase
        .from('cmms_warranty_tracking')
        .select('claims')
        .eq('id', warrantyId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const updatedClaims = (warranty.claims || []).map((claim: WarrantyClaim) =>
        claim.id === claimId ? { ...claim, ...updates } : claim
      );

      const { data, error } = await supabase
        .from('cmms_warranty_tracking')
        .update({ claims: updatedClaims })
        .eq('id', warrantyId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      console.log('[useUpdateWarrantyClaim] Updated claim:', claimId);
      return mapWarrantyFromDB(data) as WarrantyTracking;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'warranties'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateWarrantyClaim] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS - DB MAPPING
// =============================================================================

function mapVendorFromDB(data: Record<string, unknown>): Vendor {
  return {
    id: data.id as string,
    vendorNumber: data.vendor_number as string,
    organizationId: data.organization_id as string,
    name: data.name as string,
    legalName: data.legal_name as string | undefined,
    type: data.type as VendorType,
    typeName: getVendorTypeName(data.type as VendorType),
    status: data.status as VendorStatus,
    taxId: data.tax_id as string | undefined,
    dunsNumber: data.duns_number as string | undefined,
    website: data.website as string | undefined,
    primaryContact: data.primary_contact as VendorContact,
    contacts: (data.contacts || []) as VendorContact[],
    addresses: (data.addresses || []) as VendorAddress[],
    paymentTerms: data.payment_terms as string | undefined,
    paymentMethod: data.payment_method as Vendor['paymentMethod'],
    currency: data.currency as string,
    taxExempt: data.tax_exempt as boolean,
    taxExemptNumber: data.tax_exempt_number as string | undefined,
    certifications: (data.certifications || []) as VendorCertification[],
    insuranceCoverage: (data.insurance_coverage || []) as VendorInsurance[],
    rating: data.rating as number | undefined,
    performanceScore: data.performance_score as number | undefined,
    categories: (data.categories || []) as string[],
    notes: data.notes as string | undefined,
    isPreferredVendor: data.is_preferred_vendor as boolean,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapVendorContractFromDB(data: Record<string, unknown>): VendorContract {
  return {
    id: data.id as string,
    contractNumber: data.contract_number as string,
    organizationId: data.organization_id as string,
    vendorId: data.vendor_id as string,
    vendorName: data.vendor_name as string,
    vendorNumber: data.vendor_number as string,
    name: data.name as string,
    description: data.description as string | undefined,
    type: data.type as VendorContract['type'],
    typeName: data.type_name as string,
    status: data.status as ContractStatus,
    effectiveDate: data.effective_date as string,
    expiryDate: data.expiry_date as string,
    renewalDate: data.renewal_date as string | undefined,
    autoRenewal: data.auto_renewal as boolean,
    renewalTermMonths: data.renewal_term_months as number | undefined,
    notificationDays: data.notification_days as number,
    totalValue: data.total_value as number | undefined,
    annualValue: data.annual_value as number | undefined,
    spentToDate: data.spent_to_date as number,
    remainingValue: data.remaining_value as number | undefined,
    paymentTerms: data.payment_terms as string | undefined,
    scope: data.scope as string,
    deliverables: data.deliverables as string | undefined,
    slaMetrics: (data.sla_metrics || []) as ContractSLA[],
    contacts: (data.contacts || []) as ContractContact[],
    facilities: (data.facilities || []) as ContractFacility[],
    attachments: (data.attachments || []) as ContractAttachment[],
    amendmentHistory: (data.amendment_history || []) as ContractAmendment[],
    performanceReviews: (data.performance_reviews || []) as ContractPerformanceReview[],
    createdBy: data.created_by as string,
    createdByName: data.created_by_name as string,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    terminatedBy: data.terminated_by as string | undefined,
    terminatedByName: data.terminated_by_name as string | undefined,
    terminatedAt: data.terminated_at as string | undefined,
    terminationReason: data.termination_reason as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapWarrantyFromDB(data: Record<string, unknown>): WarrantyTracking {
  return {
    id: data.id as string,
    warrantyNumber: data.warranty_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    equipmentId: data.equipment_id as string,
    equipmentName: data.equipment_name as string,
    equipmentTag: data.equipment_tag as string,
    serialNumber: data.serial_number as string | undefined,
    vendorId: data.vendor_id as string,
    vendorName: data.vendor_name as string,
    type: data.type as WarrantyTracking['type'],
    typeName: data.type_name as string,
    status: data.status as WarrantyStatus,
    purchaseDate: data.purchase_date as string,
    installDate: data.install_date as string | undefined,
    warrantyStartDate: data.warranty_start_date as string,
    warrantyEndDate: data.warranty_end_date as string,
    coverageDescription: data.coverage_description as string,
    exclusions: data.exclusions as string | undefined,
    limitations: data.limitations as string | undefined,
    laborIncluded: data.labor_included as boolean,
    partsIncluded: data.parts_included as boolean,
    onsiteService: data.onsite_service as boolean,
    responseTime: data.response_time as string | undefined,
    deductible: data.deductible as number | undefined,
    maxClaimAmount: data.max_claim_amount as number | undefined,
    purchasePrice: data.purchase_price as number | undefined,
    warrantyCost: data.warranty_cost as number | undefined,
    claims: (data.claims || []) as WarrantyClaim[],
    contacts: (data.contacts || []) as WarrantyContact[],
    attachments: (data.attachments || []) as WarrantyAttachment[],
    notes: data.notes as string | undefined,
    notificationDays: data.notification_days as number,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function getVendorTypeName(type: VendorType): string {
  const typeNames: Record<VendorType, string> = {
    parts_supplier: 'Parts Supplier',
    contractor: 'Contractor',
    service_provider: 'Service Provider',
    equipment_vendor: 'Equipment Vendor',
    other: 'Other',
  };
  return typeNames[type] || type;
}
