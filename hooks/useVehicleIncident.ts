import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type VehicleType = 'forklift' | 'pallet_jack' | 'order_picker' | 'reach_truck' | 'company_vehicle' | 'delivery_truck' | 'golf_cart' | 'scissor_lift' | 'other';
export type IncidentType = 'collision_object' | 'collision_vehicle' | 'collision_person' | 'tip_over' | 'load_drop' | 'pedestrian_near_miss' | 'mechanical_failure' | 'operator_injury' | 'property_damage' | 'other';
export type SeverityLevel = 'near_miss' | 'minor' | 'moderate' | 'serious' | 'severe';

export interface VehicleIncident {
  id: string;
  report_number: string;
  date: string;
  time: string;
  location: string;
  specific_location: string;
  department: string;
  vehicle_type: VehicleType;
  vehicle_id: string;
  operator_name: string;
  operator_id: string;
  operator_certified: boolean;
  certification_date: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  description: string;
  injuries_occurred: boolean;
  injury_details: string;
  property_damage: boolean;
  damage_details: string;
  estimated_cost: string;
  witnesses: string;
  pre_shift_completed: boolean;
  speed_appropriate: boolean;
  load_secured: boolean;
  visibility_adequate: boolean;
  contributing_factors: string;
  immediate_actions: string;
  corrective_actions: string;
  photos_attached: boolean;
  police_notified: boolean;
  police_report_number: string;
  reported_by: string;
  reported_by_id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
}

export interface VehicleIncidentFormData {
  date: string;
  time: string;
  location: string;
  specific_location: string;
  department: string;
  vehicle_type: VehicleType | '';
  vehicle_id: string;
  operator_name: string;
  operator_id: string;
  operator_certified: boolean;
  certification_date: string;
  incident_type: IncidentType | '';
  severity: SeverityLevel | '';
  description: string;
  injuries_occurred: boolean;
  injury_details: string;
  property_damage: boolean;
  damage_details: string;
  estimated_cost: string;
  witnesses: string;
  pre_shift_completed: boolean;
  speed_appropriate: boolean;
  load_secured: boolean;
  visibility_adequate: boolean;
  contributing_factors: string;
  immediate_actions: string;
  corrective_actions: string;
  photos_attached: boolean;
  police_notified: boolean;
  police_report_number: string;
  notes: string;
}

const generateReportNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VI-${year}${month}-${random}`;
};

export function useVehicleIncidents() {
  return useQuery({
    queryKey: ['vehicle-incidents'],
    queryFn: async () => {
      console.log('[useVehicleIncident] Fetching vehicle incidents');
      const { data, error } = await supabase
        .from('vehicle_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useVehicleIncident] Error fetching incidents:', error);
        throw error;
      }

      console.log('[useVehicleIncident] Fetched incidents:', data?.length);
      return data as VehicleIncident[];
    },
  });
}

export function useCreateVehicleIncident() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: VehicleIncidentFormData) => {
      console.log('[useVehicleIncident] Creating vehicle incident');
      
      const incident = {
        report_number: generateReportNumber(),
        date: formData.date,
        time: formData.time,
        location: formData.location,
        specific_location: formData.specific_location,
        department: formData.department,
        vehicle_type: formData.vehicle_type,
        vehicle_id: formData.vehicle_id,
        operator_name: formData.operator_name,
        operator_id: formData.operator_id,
        operator_certified: formData.operator_certified,
        certification_date: formData.certification_date,
        incident_type: formData.incident_type,
        severity: formData.severity,
        description: formData.description,
        injuries_occurred: formData.injuries_occurred,
        injury_details: formData.injury_details,
        property_damage: formData.property_damage,
        damage_details: formData.damage_details,
        estimated_cost: formData.estimated_cost,
        witnesses: formData.witnesses,
        pre_shift_completed: formData.pre_shift_completed,
        speed_appropriate: formData.speed_appropriate,
        load_secured: formData.load_secured,
        visibility_adequate: formData.visibility_adequate,
        contributing_factors: formData.contributing_factors,
        immediate_actions: formData.immediate_actions,
        corrective_actions: formData.corrective_actions,
        photos_attached: formData.photos_attached,
        police_notified: formData.police_notified,
        police_report_number: formData.police_report_number,
        reported_by: user?.email || 'Unknown',
        reported_by_id: user?.id || '',
        status: 'pending_approval',
        submitted_at: new Date().toISOString(),
        notes: formData.notes,
      };

      const { data, error } = await supabase
        .from('vehicle_incidents')
        .insert(incident)
        .select()
        .single();

      if (error) {
        console.error('[useVehicleIncident] Error creating incident:', error);
        throw error;
      }

      console.log('[useVehicleIncident] Incident created:', data.report_number);
      return data as VehicleIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-incidents'] });
    },
  });
}

export function useUpdateVehicleIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VehicleIncident> }) => {
      console.log('[useVehicleIncident] Updating incident:', id);
      
      const { data, error } = await supabase
        .from('vehicle_incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useVehicleIncident] Error updating incident:', error);
        throw error;
      }

      return data as VehicleIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-incidents'] });
    },
  });
}
