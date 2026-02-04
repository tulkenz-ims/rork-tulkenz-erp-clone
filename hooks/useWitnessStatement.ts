import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type WitnessRelation = 'direct_witness' | 'indirect_witness' | 'first_responder' | 'supervisor' | 'coworker' | 'visitor' | 'other';
export type ObservationType = 'visual' | 'auditory' | 'both' | 'aftermath_only';

export interface WitnessStatement {
  id: string;
  statement_number: string;
  date: string;
  time_taken: string;
  incident_reference: string;
  incident_date: string;
  incident_time: string;
  incident_location: string;
  witness_name: string;
  witness_employee_id: string;
  witness_department: string;
  witness_job_title: string;
  witness_phone: string;
  witness_email: string;
  witness_relation: WitnessRelation;
  observation_type: ObservationType;
  witness_location: string;
  distance_from_incident: string;
  what_observed: string;
  sequence_of_events: string;
  people_involved: string;
  actions_taken: string;
  conditions_at_time: string;
  contributing_factors: string;
  injuries_observed: string;
  damage_observed: string;
  additional_info: string;
  previous_similar_incidents: boolean;
  previous_incidents_details: string;
  safety_suggestions: string;
  willing_to_provide_more_info: boolean;
  witness_signature_confirmed: boolean;
  signature_date: string;
  statement_taker: string;
  statement_taker_id: string;
  status: 'draft' | 'pending_review' | 'reviewed' | 'archived';
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface WitnessStatementFormData {
  incident_reference: string;
  incident_date: string;
  incident_time: string;
  incident_location: string;
  witness_name: string;
  witness_employee_id: string;
  witness_department: string;
  witness_job_title: string;
  witness_phone: string;
  witness_email: string;
  witness_relation: WitnessRelation | '';
  observation_type: ObservationType | '';
  witness_location: string;
  distance_from_incident: string;
  what_observed: string;
  sequence_of_events: string;
  people_involved: string;
  actions_taken: string;
  conditions_at_time: string;
  contributing_factors: string;
  injuries_observed: string;
  damage_observed: string;
  additional_info: string;
  previous_similar_incidents: boolean;
  previous_incidents_details: string;
  safety_suggestions: string;
  willing_to_provide_more_info: boolean;
  witness_signature_confirmed: boolean;
}

const generateStatementNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WS-${year}${month}-${random}`;
};

export function useWitnessStatements() {
  return useQuery({
    queryKey: ['witness-statements'],
    queryFn: async () => {
      console.log('[useWitnessStatement] Fetching witness statements');
      const { data, error } = await supabase
        .from('witness_statements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useWitnessStatement] Error fetching statements:', error);
        throw error;
      }

      console.log('[useWitnessStatement] Fetched statements:', data?.length);
      return data as WitnessStatement[];
    },
  });
}

export function useCreateWitnessStatement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: WitnessStatementFormData) => {
      console.log('[useWitnessStatement] Creating witness statement');
      
      const statement = {
        statement_number: generateStatementNumber(),
        date: new Date().toISOString().split('T')[0],
        time_taken: new Date().toTimeString().slice(0, 5),
        incident_reference: formData.incident_reference,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time,
        incident_location: formData.incident_location,
        witness_name: formData.witness_name,
        witness_employee_id: formData.witness_employee_id,
        witness_department: formData.witness_department,
        witness_job_title: formData.witness_job_title,
        witness_phone: formData.witness_phone,
        witness_email: formData.witness_email,
        witness_relation: formData.witness_relation,
        observation_type: formData.observation_type,
        witness_location: formData.witness_location,
        distance_from_incident: formData.distance_from_incident,
        what_observed: formData.what_observed,
        sequence_of_events: formData.sequence_of_events,
        people_involved: formData.people_involved,
        actions_taken: formData.actions_taken,
        conditions_at_time: formData.conditions_at_time,
        contributing_factors: formData.contributing_factors,
        injuries_observed: formData.injuries_observed,
        damage_observed: formData.damage_observed,
        additional_info: formData.additional_info,
        previous_similar_incidents: formData.previous_similar_incidents,
        previous_incidents_details: formData.previous_incidents_details,
        safety_suggestions: formData.safety_suggestions,
        willing_to_provide_more_info: formData.willing_to_provide_more_info,
        witness_signature_confirmed: formData.witness_signature_confirmed,
        signature_date: new Date().toISOString().split('T')[0],
        statement_taker: user?.email || 'Unknown',
        statement_taker_id: user?.id || '',
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('witness_statements')
        .insert(statement)
        .select()
        .single();

      if (error) {
        console.error('[useWitnessStatement] Error creating statement:', error);
        throw error;
      }

      console.log('[useWitnessStatement] Statement created:', data.statement_number);
      return data as WitnessStatement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['witness-statements'] });
    },
  });
}

export function useUpdateWitnessStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WitnessStatement> }) => {
      console.log('[useWitnessStatement] Updating statement:', id);
      
      const { data, error } = await supabase
        .from('witness_statements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useWitnessStatement] Error updating statement:', error);
        throw error;
      }

      return data as WitnessStatement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['witness-statements'] });
    },
  });
}
