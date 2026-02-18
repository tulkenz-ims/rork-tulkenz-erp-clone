import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

// ── Types ──────────────────────────────────────────────────────

export interface SDSSheet {
  id: string;
  organization_id: string;

  // Identification & Numbering
  sds_number: number;               // Cabinet position number (1, 2, 3...)
  product_name: string;              // Chemical / product name
  manufacturer: string;              // Vendor / manufacturer
  product_code: string | null;       // Manufacturer's product code

  // Department & Cabinet
  department_code: string;           // 1001=Maintenance, 1002=Sanitation, 1003=Production, 1004=Quality, 1005=Safety
  department_name: string;
  cabinet_name: string;              // e.g., "Food Grade", "Sanitation Chemicals", "Maintenance"
  cabinet_location: string | null;   // Physical location: "Building A, Room 102"

  // File
  file_url: string;                  // URL to uploaded SDS PDF
  file_name: string;                 // Original file name
  file_size: number | null;          // Bytes

  // Hazard quick-reference (optional, for table display)
  signal_word: string | null;        // 'Danger' | 'Warning' | 'None'
  hazard_level: string | null;       // 'high' | 'medium' | 'low'
  pictogram_codes: string[] | null;  // GHS01-GHS09

  // Status & Dates
  status: 'active' | 'inactive' | 'archived' | 'draft';
  revision_date: string | null;
  expiration_date: string | null;

  // QR Code
  qr_code_url: string | null;       // Generated QR code image URL (or generated client-side)

  // Notes
  notes: string | null;
  emergency_phone: string | null;

  // Audit
  created_by_id: string | null;
  created_by_name: string | null;
  updated_by_id: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSDSSheetInput {
  sds_number: number;
  product_name: string;
  manufacturer: string;
  product_code?: string;
  department_code: string;
  department_name: string;
  cabinet_name: string;
  cabinet_location?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  signal_word?: string;
  hazard_level?: string;
  pictogram_codes?: string[];
  status?: 'active' | 'inactive' | 'archived' | 'draft';
  revision_date?: string;
  expiration_date?: string;
  notes?: string;
  emergency_phone?: string;
}

export interface UpdateSDSSheetInput {
  id: string;
  sds_number?: number;
  product_name?: string;
  manufacturer?: string;
  product_code?: string;
  department_code?: string;
  department_name?: string;
  cabinet_name?: string;
  cabinet_location?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  signal_word?: string;
  hazard_level?: string;
  pictogram_codes?: string[];
  status?: 'active' | 'inactive' | 'archived' | 'draft';
  revision_date?: string;
  expiration_date?: string;
  notes?: string;
  emergency_phone?: string;
}

// ── Query Keys ─────────────────────────────────────────────────

const KEYS = {
  all: ['sds_sheets'] as const,
  list: (orgId: string) => [...KEYS.all, 'list', orgId] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  byDepartment: (orgId: string, deptCode: string) => [...KEYS.all, 'dept', orgId, deptCode] as const,
  byCabinet: (orgId: string, cabinet: string) => [...KEYS.all, 'cabinet', orgId, cabinet] as const,
  nextNumber: (orgId: string, cabinet: string) => [...KEYS.all, 'nextNum', orgId, cabinet] as const,
};

// ── Queries ────────────────────────────────────────────────────

/** Fetch all SDS sheets for the organization */
export function useSDSSheetsQuery(filters?: {
  departmentCode?: string;
  cabinetName?: string;
  status?: string;
  search?: string;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: [...KEYS.list(organizationId), filters],
    queryFn: async () => {
      let query = supabase
        .from('sds_sheets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('department_code', { ascending: true })
        .order('cabinet_name', { ascending: true })
        .order('sds_number', { ascending: true });

      if (filters?.departmentCode) {
        query = query.eq('department_code', filters.departmentCode);
      }
      if (filters?.cabinetName) {
        query = query.eq('cabinet_name', filters.cabinetName);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(
          `product_name.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%,product_code.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SDSSheet[];
    },
    enabled: !!organizationId,
  });
}

/** Fetch a single SDS sheet by ID */
export function useSDSSheetDetailQuery(id: string | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('sds_sheets')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      if (error) throw error;
      return data as SDSSheet;
    },
    enabled: !!id && !!organizationId,
  });
}

/** Get next available SDS number for a cabinet */
export function useNextSDSNumber(cabinetName: string | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: KEYS.nextNumber(organizationId, cabinetName || ''),
    queryFn: async () => {
      if (!cabinetName) return 1;
      const { data, error } = await supabase
        .from('sds_sheets')
        .select('sds_number')
        .eq('organization_id', organizationId)
        .eq('cabinet_name', cabinetName)
        .order('sds_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return 1;
      return (data[0].sds_number || 0) + 1;
    },
    enabled: !!organizationId && !!cabinetName,
  });
}

/** Get unique cabinet names for the organization */
export function useSDSCabinetsQuery() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: [...KEYS.all, 'cabinets', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sds_sheets')
        .select('cabinet_name, department_code, department_name')
        .eq('organization_id', organizationId)
        .order('cabinet_name');

      if (error) throw error;

      // Dedupe cabinet names
      const seen = new Set<string>();
      const cabinets: { cabinet_name: string; department_code: string; department_name: string }[] = [];
      (data || []).forEach((row: any) => {
        if (!seen.has(row.cabinet_name)) {
          seen.add(row.cabinet_name);
          cabinets.push(row);
        }
      });
      return cabinets;
    },
    enabled: !!organizationId,
  });
}

// ── Mutations ──────────────────────────────────────────────────

/** Create a new SDS sheet */
export function useCreateSDSSheet(options?: {
  onSuccess?: (data: SDSSheet) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: CreateSDSSheetInput) => {
      const { data, error } = await supabase
        .from('sds_sheets')
        .insert({
          organization_id: organizationId,
          sds_number: input.sds_number,
          product_name: input.product_name,
          manufacturer: input.manufacturer,
          product_code: input.product_code || null,
          department_code: input.department_code,
          department_name: input.department_name,
          cabinet_name: input.cabinet_name,
          cabinet_location: input.cabinet_location || null,
          file_url: input.file_url,
          file_name: input.file_name,
          file_size: input.file_size || null,
          signal_word: input.signal_word || null,
          hazard_level: input.hazard_level || null,
          pictogram_codes: input.pictogram_codes || null,
          status: input.status || 'active',
          revision_date: input.revision_date || null,
          expiration_date: input.expiration_date || null,
          notes: input.notes || null,
          emergency_phone: input.emergency_phone || null,
          created_by_id: user?.id || null,
          created_by_name: user ? `${user.first_name} ${user.last_name}` : null,
          updated_by_id: user?.id || null,
          updated_by_name: user ? `${user.first_name} ${user.last_name}` : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SDSSheet;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/** Update an existing SDS sheet */
export function useUpdateSDSSheet(options?: {
  onSuccess?: (data: SDSSheet) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: UpdateSDSSheetInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('sds_sheets')
        .update({
          ...updates,
          updated_by_id: user?.id || null,
          updated_by_name: user ? `${user.first_name} ${user.last_name}` : null,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data as SDSSheet;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/** Delete an SDS sheet */
export function useDeleteSDSSheet(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sds_sheets')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

// ── Upload Helper ──────────────────────────────────────────────

/** Upload SDS PDF to Supabase Storage and return public URL */
export async function uploadSDSFile(
  organizationId: string,
  file: { uri: string; name: string; type: string },
): Promise<{ url: string; fileName: string; fileSize: number }> {
  const ext = file.name.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const storagePath = `${organizationId}/sds/${timestamp}_${file.name}`;

  // Fetch the file as blob
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('sds-documents')
    .upload(storagePath, blob, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('sds-documents')
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    fileName: file.name,
    fileSize: blob.size,
  };
}

// ── Helpers ────────────────────────────────────────────────────

/** Build the QR code content URL for an SDS sheet */
export function getSDSViewUrl(sdsId: string, baseUrl?: string): string {
  const base = baseUrl || 'https://app.tulkenz.com';
  return `${base}/sds/${sdsId}`;
}

/** GHS pictogram labels */
export const GHS_PICTOGRAMS: Record<string, { label: string; description: string }> = {
  GHS01: { label: 'Exploding Bomb', description: 'Explosives, self-reactives, organic peroxides' },
  GHS02: { label: 'Flame', description: 'Flammable gases, aerosols, liquids, solids' },
  GHS03: { label: 'Flame Over Circle', description: 'Oxidizing gases, liquids, solids' },
  GHS04: { label: 'Gas Cylinder', description: 'Compressed, liquefied, dissolved gases' },
  GHS05: { label: 'Corrosion', description: 'Corrosive to metals, skin corrosion, eye damage' },
  GHS06: { label: 'Skull & Crossbones', description: 'Acute toxicity (fatal or toxic)' },
  GHS07: { label: 'Exclamation Mark', description: 'Irritant, narcotic, hazardous to ozone' },
  GHS08: { label: 'Health Hazard', description: 'Carcinogen, respiratory sensitizer, mutagenicity' },
  GHS09: { label: 'Environment', description: 'Aquatic toxicity' },
};

/** Signal word colors */
export function getSignalWordColor(signalWord: string | null): string {
  switch (signalWord?.toLowerCase()) {
    case 'danger': return '#DC2626';
    case 'warning': return '#F59E0B';
    default: return '#10B981';
  }
}

/** Hazard level colors */
export function getHazardLevelColor(level: string | null): string {
  switch (level?.toLowerCase()) {
    case 'high': return '#DC2626';
    case 'medium': return '#F59E0B';
    case 'low': return '#10B981';
    default: return '#6B7280';
  }
}
