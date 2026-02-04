import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type RecyclingCategory = 'bulb' | 'battery' | 'metal' | 'cardboard' | 'paper' | 'toner' | 'oil' | 'grease' | 'aerosol' | 'solvent';

export interface BulbRecord {
  id: string;
  organization_id: string;
  date_shipped: string;
  bulb_size: string;
  bulb_type: string;
  quantity: number;
  tracking_number: string | null;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface BatteryRecord {
  id: string;
  organization_id: string;
  date: string;
  battery_type: string;
  quantity: number;
  weight: number | null;
  pickup_delivery: 'pickup' | 'delivery';
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface MetalRecord {
  id: string;
  organization_id: string;
  date: string;
  metal_type: string;
  weight: number;
  receipt_number: string | null;
  amount_received: number;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface CardboardRecord {
  id: string;
  organization_id: string;
  date_picked_up: string;
  weight: number;
  receipt_number: string | null;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaperRecord {
  id: string;
  organization_id: string;
  date_picked_up: string;
  weight: number;
  company_name: string | null;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface TonerRecord {
  id: string;
  organization_id: string;
  date_shipped: string;
  cartridge_type: string;
  quantity: number;
  tracking_number: string | null;
  certificate_number: string | null;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface OilRecord {
  id: string;
  organization_id: string;
  date: string;
  oil_type: string;
  quantity_gallons: number;
  container_type: string;
  manifest_number: string | null;
  vendor_name: string | null;
  disposal_method: string;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface GreaseRecord {
  id: string;
  organization_id: string;
  date: string;
  grease_type: string;
  weight: number;
  container_type: string;
  manifest_number: string | null;
  vendor_name: string | null;
  disposal_method: string;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface AerosolRecord {
  id: string;
  organization_id: string;
  date: string;
  aerosol_type: string;
  quantity: number;
  hazard_class: string;
  manifest_number: string | null;
  vendor_name: string | null;
  disposal_method: string;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface SolventRecord {
  id: string;
  organization_id: string;
  date: string;
  solvent_type: string;
  quantity_gallons: number;
  hazard_class: string;
  manifest_number: string | null;
  vendor_name: string | null;
  disposal_method: string;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface RecyclingFile {
  id: string;
  organization_id: string;
  record_type: RecyclingCategory;
  record_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface RecyclingMetrics {
  bulbsShipped: number;
  bulbsWithCertificate: number;
  batteryDisposals: number;
  totalBatteries: number;
  metalPickups: number;
  totalMetalWeight: number;
  totalMetalRevenue: number;
  cardboardPickups: number;
  totalCardboardWeight: number;
  paperPickups: number;
  totalPaperWeight: number;
  tonerShipments: number;
  totalTonerCartridges: number;
  oilDisposals: number;
  totalOilGallons: number;
  greaseDisposals: number;
  totalGreaseWeight: number;
  aerosolDisposals: number;
  totalAerosols: number;
  solventDisposals: number;
  totalSolventGallons: number;
}

export interface RecyclingCategoryInfo {
  key: RecyclingCategory;
  label: string;
  color: string;
  icon: string;
}

export interface CategoryAggregation {
  category: RecyclingCategory;
  label: string;
  color: string;
  icon: string;
  recordCount: number;
  totalQuantity: number;
  totalWeight: number;
  totalRevenue: number;
  lastActivityDate: string | null;
  certificateCount: number;
  pendingCount: number;
}

type CreateBulbInput = Omit<BulbRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateBatteryInput = Omit<BatteryRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateMetalInput = Omit<MetalRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateCardboardInput = Omit<CardboardRecord, 'id' | 'organization_id' | 'created_at'>;
type CreatePaperInput = Omit<PaperRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateTonerInput = Omit<TonerRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateOilInput = Omit<OilRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateGreaseInput = Omit<GreaseRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateAerosolInput = Omit<AerosolRecord, 'id' | 'organization_id' | 'created_at'>;
type CreateSolventInput = Omit<SolventRecord, 'id' | 'organization_id' | 'created_at'>;

const RECYCLING_CATEGORIES: RecyclingCategoryInfo[] = [
  { key: 'bulb', label: 'Bulbs', color: '#4A90E2', icon: 'Lightbulb' },
  { key: 'battery', label: 'Batteries', color: '#7ED321', icon: 'Battery' },
  { key: 'metal', label: 'Metal', color: '#F5A623', icon: 'Hammer' },
  { key: 'cardboard', label: 'Cardboard', color: '#8B4513', icon: 'Package' },
  { key: 'paper', label: 'Paper', color: '#3498DB', icon: 'FileText' },
  { key: 'toner', label: 'Toner/Ink', color: '#9B59B6', icon: 'Printer' },
  { key: 'oil', label: 'Used Oil', color: '#1A1A1A', icon: 'Droplet' },
  { key: 'grease', label: 'Grease/Lubricants', color: '#6B7280', icon: 'Wrench' },
  { key: 'aerosol', label: 'Aerosols', color: '#EF4444', icon: 'Wind' },
  { key: 'solvent', label: 'Solvents/Chemicals', color: '#F59E0B', icon: 'FlaskConical' },
];

export function useSupabaseRecycling() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Bulb Records
  const bulbsQuery = useQuery({
    queryKey: ['recycling', 'bulbs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching bulb records');
      
      const { data, error } = await supabase
        .from('recycling_bulbs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date_shipped', { ascending: false });

      if (error) throw error;
      return (data || []) as BulbRecord[];
    },
    enabled: !!organizationId,
  });

  // Battery Records
  const batteriesQuery = useQuery({
    queryKey: ['recycling', 'batteries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching battery records');
      
      const { data, error } = await supabase
        .from('recycling_batteries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as BatteryRecord[];
    },
    enabled: !!organizationId,
  });

  // Metal Records
  const metalQuery = useQuery({
    queryKey: ['recycling', 'metal', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching metal records');
      
      const { data, error } = await supabase
        .from('recycling_metal')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as MetalRecord[];
    },
    enabled: !!organizationId,
  });

  // Cardboard Records
  const cardboardQuery = useQuery({
    queryKey: ['recycling', 'cardboard', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching cardboard records');
      
      const { data, error } = await supabase
        .from('recycling_cardboard')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date_picked_up', { ascending: false });

      if (error) throw error;
      return (data || []) as CardboardRecord[];
    },
    enabled: !!organizationId,
  });

  // Paper Records
  const paperQuery = useQuery({
    queryKey: ['recycling', 'paper', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching paper records');
      
      const { data, error } = await supabase
        .from('recycling_paper')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date_picked_up', { ascending: false });

      if (error) throw error;
      return (data || []) as PaperRecord[];
    },
    enabled: !!organizationId,
  });

  // Toner Records
  const tonerQuery = useQuery({
    queryKey: ['recycling', 'toner', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching toner records');
      
      const { data, error } = await supabase
        .from('recycling_toner')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date_shipped', { ascending: false });

      if (error) throw error;
      return (data || []) as TonerRecord[];
    },
    enabled: !!organizationId,
  });

  // Oil Records
  const oilQuery = useQuery({
    queryKey: ['recycling', 'oil', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching oil records');
      
      const { data, error } = await supabase
        .from('recycling_oil')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as OilRecord[];
    },
    enabled: !!organizationId,
  });

  // Grease Records
  const greaseQuery = useQuery({
    queryKey: ['recycling', 'grease', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching grease records');
      
      const { data, error } = await supabase
        .from('recycling_grease')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as GreaseRecord[];
    },
    enabled: !!organizationId,
  });

  // Aerosol Records
  const aerosolQuery = useQuery({
    queryKey: ['recycling', 'aerosol', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching aerosol records');
      
      const { data, error } = await supabase
        .from('recycling_aerosol')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as AerosolRecord[];
    },
    enabled: !!organizationId,
  });

  // Solvent Records
  const solventQuery = useQuery({
    queryKey: ['recycling', 'solvent', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching solvent records');
      
      const { data, error } = await supabase
        .from('recycling_solvent')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as SolventRecord[];
    },
    enabled: !!organizationId,
  });

  // Files
  const filesQuery = useQuery({
    queryKey: ['recycling', 'files', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecycling] Fetching recycling files');
      
      const { data, error } = await supabase
        .from('recycling_files')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RecyclingFile[];
    },
    enabled: !!organizationId,
  });

  // Mutations
  const createBulbMutation = useMutation({
    mutationFn: async (input: CreateBulbInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating bulb record:', input);

      const { data, error } = await supabase
        .from('recycling_bulbs')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as BulbRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'bulbs'] });
    },
  });

  const createBatteryMutation = useMutation({
    mutationFn: async (input: CreateBatteryInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating battery record:', input);

      const { data, error } = await supabase
        .from('recycling_batteries')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as BatteryRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'batteries'] });
    },
  });

  const createMetalMutation = useMutation({
    mutationFn: async (input: CreateMetalInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating metal record:', input);

      const { data, error } = await supabase
        .from('recycling_metal')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as MetalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'metal'] });
    },
  });

  const createCardboardMutation = useMutation({
    mutationFn: async (input: CreateCardboardInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating cardboard record:', input);

      const { data, error } = await supabase
        .from('recycling_cardboard')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as CardboardRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'cardboard'] });
    },
  });

  const createPaperMutation = useMutation({
    mutationFn: async (input: CreatePaperInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating paper record:', input);

      const { data, error } = await supabase
        .from('recycling_paper')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as PaperRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'paper'] });
    },
  });

  const createTonerMutation = useMutation({
    mutationFn: async (input: CreateTonerInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating toner record:', input);

      const { data, error } = await supabase
        .from('recycling_toner')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as TonerRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'toner'] });
    },
  });

  const createOilMutation = useMutation({
    mutationFn: async (input: CreateOilInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating oil record:', input);

      const { data, error } = await supabase
        .from('recycling_oil')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as OilRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'oil'] });
    },
  });

  const createGreaseMutation = useMutation({
    mutationFn: async (input: CreateGreaseInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating grease record:', input);

      const { data, error } = await supabase
        .from('recycling_grease')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as GreaseRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'grease'] });
    },
  });

  const createAerosolMutation = useMutation({
    mutationFn: async (input: CreateAerosolInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating aerosol record:', input);

      const { data, error } = await supabase
        .from('recycling_aerosol')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as AerosolRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'aerosol'] });
    },
  });

  const createSolventMutation = useMutation({
    mutationFn: async (input: CreateSolventInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Creating solvent record:', input);

      const { data, error } = await supabase
        .from('recycling_solvent')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SolventRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'solvent'] });
    },
  });

  const updateBulbMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BulbRecord> & { id: string }) => {
      console.log('[useSupabaseRecycling] Updating bulb record:', id);

      const { data, error } = await supabase
        .from('recycling_bulbs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BulbRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'bulbs'] });
    },
  });

  const updateBatteryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BatteryRecord> & { id: string }) => {
      console.log('[useSupabaseRecycling] Updating battery record:', id);

      const { data, error } = await supabase
        .from('recycling_batteries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BatteryRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'batteries'] });
    },
  });

  const updateMetalMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MetalRecord> & { id: string }) => {
      console.log('[useSupabaseRecycling] Updating metal record:', id);

      const { data, error } = await supabase
        .from('recycling_metal')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MetalRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'metal'] });
    },
  });

  const updateCardboardMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CardboardRecord> & { id: string }) => {
      console.log('[useSupabaseRecycling] Updating cardboard record:', id);

      const { data, error } = await supabase
        .from('recycling_cardboard')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CardboardRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'cardboard'] });
    },
  });

  const updatePaperMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaperRecord> & { id: string }) => {
      console.log('[useSupabaseRecycling] Updating paper record:', id);

      const { data, error } = await supabase
        .from('recycling_paper')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PaperRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'paper'] });
    },
  });

  const updateTonerMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TonerRecord> & { id: string }) => {
      console.log('[useSupabaseRecycling] Updating toner record:', id);

      const { data, error } = await supabase
        .from('recycling_toner')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TonerRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'toner'] });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async ({ category, id }: { category: RecyclingCategory; id: string }) => {
      console.log('[useSupabaseRecycling] Deleting record:', category, id);

      const tableMap: Record<RecyclingCategory, string> = {
        bulb: 'recycling_bulbs',
        battery: 'recycling_batteries',
        metal: 'recycling_metal',
        cardboard: 'recycling_cardboard',
        paper: 'recycling_paper',
        toner: 'recycling_toner',
        oil: 'recycling_oil',
        grease: 'recycling_grease',
        aerosol: 'recycling_aerosol',
        solvent: 'recycling_solvent',
      };

      const { error } = await supabase
        .from(tableMap[category])
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling'] });
    },
  });

  const addFileMutation = useMutation({
    mutationFn: async (input: Omit<RecyclingFile, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecycling] Adding file:', input);

      const { data, error } = await supabase
        .from('recycling_files')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as RecyclingFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'files'] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      console.log('[useSupabaseRecycling] Deleting file:', fileId);

      const { error } = await supabase
        .from('recycling_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycling', 'files'] });
    },
  });

  // Compute metrics
  const metrics: RecyclingMetrics = {
    bulbsShipped: bulbsQuery.data?.reduce((sum, r) => sum + r.quantity, 0) || 0,
    bulbsWithCertificate: bulbsQuery.data?.filter(r => r.certificate_number).length || 0,
    batteryDisposals: batteriesQuery.data?.length || 0,
    totalBatteries: batteriesQuery.data?.reduce((sum, r) => sum + r.quantity, 0) || 0,
    metalPickups: metalQuery.data?.length || 0,
    totalMetalWeight: metalQuery.data?.reduce((sum, r) => sum + r.weight, 0) || 0,
    totalMetalRevenue: metalQuery.data?.reduce((sum, r) => sum + r.amount_received, 0) || 0,
    cardboardPickups: cardboardQuery.data?.length || 0,
    totalCardboardWeight: cardboardQuery.data?.reduce((sum, r) => sum + r.weight, 0) || 0,
    paperPickups: paperQuery.data?.length || 0,
    totalPaperWeight: paperQuery.data?.reduce((sum, r) => sum + r.weight, 0) || 0,
    tonerShipments: tonerQuery.data?.length || 0,
    totalTonerCartridges: tonerQuery.data?.reduce((sum, r) => sum + r.quantity, 0) || 0,
    oilDisposals: oilQuery.data?.length || 0,
    totalOilGallons: oilQuery.data?.reduce((sum, r) => sum + r.quantity_gallons, 0) || 0,
    greaseDisposals: greaseQuery.data?.length || 0,
    totalGreaseWeight: greaseQuery.data?.reduce((sum, r) => sum + r.weight, 0) || 0,
    aerosolDisposals: aerosolQuery.data?.length || 0,
    totalAerosols: aerosolQuery.data?.reduce((sum, r) => sum + r.quantity, 0) || 0,
    solventDisposals: solventQuery.data?.length || 0,
    totalSolventGallons: solventQuery.data?.reduce((sum, r) => sum + r.quantity_gallons, 0) || 0,
  };

  // Category-based aggregations
  const categoryAggregations: CategoryAggregation[] = RECYCLING_CATEGORIES.map((cat) => {
    const getCategoryData = (): {
      records: { quantity?: number; weight?: number | null; amount_received?: number; certificate_number?: string | null }[];
      dateField: string;
      dates: string[];
    } => {
      switch (cat.key) {
        case 'bulb':
          return {
            records: bulbsQuery.data || [],
            dateField: 'date_shipped',
            dates: (bulbsQuery.data || []).map(r => r.date_shipped),
          };
        case 'battery':
          return {
            records: batteriesQuery.data || [],
            dateField: 'date',
            dates: (batteriesQuery.data || []).map(r => r.date),
          };
        case 'metal':
          return {
            records: metalQuery.data || [],
            dateField: 'date',
            dates: (metalQuery.data || []).map(r => r.date),
          };
        case 'cardboard':
          return {
            records: cardboardQuery.data || [],
            dateField: 'date_picked_up',
            dates: (cardboardQuery.data || []).map(r => r.date_picked_up),
          };
        case 'paper':
          return {
            records: paperQuery.data || [],
            dateField: 'date_picked_up',
            dates: (paperQuery.data || []).map(r => r.date_picked_up),
          };
        case 'toner':
          return {
            records: tonerQuery.data || [],
            dateField: 'date_shipped',
            dates: (tonerQuery.data || []).map(r => r.date_shipped),
          };
        case 'oil':
          return {
            records: oilQuery.data || [],
            dateField: 'date',
            dates: (oilQuery.data || []).map(r => r.date),
          };
        case 'grease':
          return {
            records: greaseQuery.data || [],
            dateField: 'date',
            dates: (greaseQuery.data || []).map(r => r.date),
          };
        case 'aerosol':
          return {
            records: aerosolQuery.data || [],
            dateField: 'date',
            dates: (aerosolQuery.data || []).map(r => r.date),
          };
        case 'solvent':
          return {
            records: solventQuery.data || [],
            dateField: 'date',
            dates: (solventQuery.data || []).map(r => r.date),
          };
        default:
          return { records: [], dateField: '', dates: [] };
      }
    };

    const { records, dates } = getCategoryData();
    const sortedDates = dates.filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      category: cat.key,
      label: cat.label,
      color: cat.color,
      icon: cat.icon,
      recordCount: records.length,
      totalQuantity: records.reduce((sum, r) => sum + (r.quantity || 0), 0),
      totalWeight: records.reduce((sum, r) => sum + (r.weight || 0), 0),
      totalRevenue: records.reduce((sum, r) => sum + (r.amount_received || 0), 0),
      lastActivityDate: sortedDates[0] || null,
      certificateCount: records.filter(r => r.certificate_number).length,
      pendingCount: records.filter(r => !r.certificate_number).length,
    };
  });

  // Get category info by key
  const getCategoryInfo = (key: RecyclingCategory): RecyclingCategoryInfo | undefined => {
    return RECYCLING_CATEGORIES.find(c => c.key === key);
  };

  // Get aggregation by category
  const getCategoryAggregation = (key: RecyclingCategory): CategoryAggregation | undefined => {
    return categoryAggregations.find(a => a.category === key);
  };

  return {
    bulbRecords: bulbsQuery.data || [],
    batteryRecords: batteriesQuery.data || [],
    metalRecords: metalQuery.data || [],
    cardboardRecords: cardboardQuery.data || [],
    paperRecords: paperQuery.data || [],
    tonerRecords: tonerQuery.data || [],
    oilRecords: oilQuery.data || [],
    greaseRecords: greaseQuery.data || [],
    aerosolRecords: aerosolQuery.data || [],
    solventRecords: solventQuery.data || [],
    files: filesQuery.data || [],
    metrics,

    // Categories
    categories: RECYCLING_CATEGORIES,
    categoryAggregations,
    getCategoryInfo,
    getCategoryAggregation,

    isLoading: bulbsQuery.isLoading || batteriesQuery.isLoading || metalQuery.isLoading ||
               cardboardQuery.isLoading || paperQuery.isLoading || tonerQuery.isLoading ||
               oilQuery.isLoading || greaseQuery.isLoading || aerosolQuery.isLoading || solventQuery.isLoading,

    createBulb: createBulbMutation.mutateAsync,
    createBattery: createBatteryMutation.mutateAsync,
    createMetal: createMetalMutation.mutateAsync,
    createCardboard: createCardboardMutation.mutateAsync,
    createPaper: createPaperMutation.mutateAsync,
    createToner: createTonerMutation.mutateAsync,
    createOil: createOilMutation.mutateAsync,
    createGrease: createGreaseMutation.mutateAsync,
    createAerosol: createAerosolMutation.mutateAsync,
    createSolvent: createSolventMutation.mutateAsync,

    updateBulb: updateBulbMutation.mutateAsync,
    updateBattery: updateBatteryMutation.mutateAsync,
    updateMetal: updateMetalMutation.mutateAsync,
    updateCardboard: updateCardboardMutation.mutateAsync,
    updatePaper: updatePaperMutation.mutateAsync,
    updateToner: updateTonerMutation.mutateAsync,

    deleteRecord: deleteRecordMutation.mutateAsync,
    addFile: addFileMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,

    refetch: () => {
      bulbsQuery.refetch();
      batteriesQuery.refetch();
      metalQuery.refetch();
      cardboardQuery.refetch();
      paperQuery.refetch();
      tonerQuery.refetch();
      oilQuery.refetch();
      greaseQuery.refetch();
      aerosolQuery.refetch();
      solventQuery.refetch();
      filesQuery.refetch();
    },
  };
}
