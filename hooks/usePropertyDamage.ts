import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type DamageType = 'equipment' | 'facility' | 'vehicle' | 'machinery' | 'tools' | 'inventory' | 'infrastructure' | 'other';
export type SeverityLevel = 'minor' | 'moderate' | 'major' | 'critical';
export type CauseType = 'operator_error' | 'equipment_failure' | 'weather' | 'collision' | 'fire' | 'water' | 'vandalism' | 'wear_tear' | 'other';

export interface PropertyDamageReport {
  id: string;
  report_number: string;
  date: string;
  time: string;
  location: string;
  specific_location: string;
  department: string;
  damage_type: DamageType;
  severity: SeverityLevel;
  item_damaged: string;
  asset_id: string;
  description: string;
  cause: CauseType;
  cause_description: string;
  personnel_involved: string;
  witnesses: string;
  estimated_cost: string;
  photos_attached: boolean;
  immediate_actions: string;
  repair_required: boolean;
  equipment_operational: boolean;
  reported_by: string;
  reported_by_id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
}

export interface PropertyDamageFormData {
  date: string;
  time: string;
  location: string;
  specific_location: string;
  department: string;
  damage_type: DamageType | '';
  severity: SeverityLevel | '';
  item_damaged: string;
  asset_id: string;
  description: string;
  cause: CauseType | '';
  cause_description: string;
  personnel_involved: string;
  witnesses: string;
  estimated_cost: string;
  photos_attached: boolean;
  immediate_actions: string;
  repair_required: boolean;
  equipment_operational: boolean;
  notes: string;
}

const generateReportNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PD-${year}${month}-${random}`;
};

export function usePropertyDamageReports() {
  return useQuery({
    queryKey: ['property-damage-reports'],
    queryFn: async () => {
      console.log('[usePropertyDamage] Fetching property damage reports');
      const { data, error } = await supabase
        .from('property_damage_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[usePropertyDamage] Error fetching reports:', error);
        throw error;
      }

      console.log('[usePropertyDamage] Fetched reports:', data?.length);
      return data as PropertyDamageReport[];
    },
  });
}

export function useCreatePropertyDamageReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: PropertyDamageFormData) => {
      console.log('[usePropertyDamage] Creating property damage report');
      
      const report = {
        report_number: generateReportNumber(),
        date: formData.date,
        time: formData.time,
        location: formData.location,
        specific_location: formData.specific_location,
        department: formData.department,
        damage_type: formData.damage_type,
        severity: formData.severity,
        item_damaged: formData.item_damaged,
        asset_id: formData.asset_id,
        description: formData.description,
        cause: formData.cause,
        cause_description: formData.cause_description,
        personnel_involved: formData.personnel_involved,
        witnesses: formData.witnesses,
        estimated_cost: formData.estimated_cost,
        photos_attached: formData.photos_attached,
        immediate_actions: formData.immediate_actions,
        repair_required: formData.repair_required,
        equipment_operational: formData.equipment_operational,
        reported_by: user?.email || 'Unknown',
        reported_by_id: user?.id || '',
        status: 'pending_approval',
        submitted_at: new Date().toISOString(),
        notes: formData.notes,
      };

      const { data, error } = await supabase
        .from('property_damage_reports')
        .insert(report)
        .select()
        .single();

      if (error) {
        console.error('[usePropertyDamage] Error creating report:', error);
        throw error;
      }

      console.log('[usePropertyDamage] Report created:', data.report_number);
      return data as PropertyDamageReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-damage-reports'] });
    },
  });
}

export function useUpdatePropertyDamageReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PropertyDamageReport> }) => {
      console.log('[usePropertyDamage] Updating report:', id);
      
      const { data, error } = await supabase
        .from('property_damage_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[usePropertyDamage] Error updating report:', error);
        throw error;
      }

      return data as PropertyDamageReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-damage-reports'] });
    },
  });
}
