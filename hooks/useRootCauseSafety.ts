import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AnalysisMethod = '5_whys' | 'fishbone' | 'fault_tree' | 'pareto' | 'fmea' | 'barrier' | 'taproot' | 'other';
export type ContributingCategory = 'people' | 'process' | 'equipment' | 'materials' | 'environment' | 'management';
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export interface ContributingFactor {
  id: string;
  category: ContributingCategory;
  description: string;
  is_root_cause: boolean;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  responsible_party: string;
  due_date: string;
  priority: ActionPriority;
  status: ActionStatus;
}

export interface RootCauseAnalysis {
  id: string;
  analysis_number: string;
  date: string;
  incident_reference: string;
  incident_date: string;
  incident_type: string;
  problem_statement: string;
  analysis_method: AnalysisMethod;
  analysis_team: string[];
  contributing_factors: ContributingFactor[];
  root_causes: string[];
  five_whys: string[];
  corrective_actions: CorrectiveAction[];
  preventive_actions: string[];
  verification_method: string;
  verification_date: string;
  lessons_learned: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';
  submitted_at: string | null;
  submitted_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface RootCauseFormData {
  incident_reference: string;
  incident_date: string;
  incident_type: string;
  problem_statement: string;
  analysis_method: AnalysisMethod | '';
  analysis_team: string;
  contributing_factors: ContributingFactor[];
  five_whys: string[];
  root_causes: string;
  corrective_actions: CorrectiveAction[];
  preventive_actions: string;
  verification_method: string;
  verification_date: string;
  lessons_learned: string;
}

const generateAnalysisNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCA-${year}${month}-${random}`;
};

export function useRootCauseAnalyses() {
  return useQuery({
    queryKey: ['root-cause-analyses'],
    queryFn: async () => {
      console.log('[useRootCauseSafety] Fetching root cause analyses');
      const { data, error } = await supabase
        .from('root_cause_analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useRootCauseSafety] Error fetching analyses:', error);
        throw error;
      }

      console.log('[useRootCauseSafety] Fetched analyses:', data?.length);
      return data as RootCauseAnalysis[];
    },
  });
}

export function useCreateRootCauseAnalysis() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: RootCauseFormData) => {
      console.log('[useRootCauseSafety] Creating root cause analysis');
      
      const analysis = {
        analysis_number: generateAnalysisNumber(),
        date: new Date().toISOString().split('T')[0],
        incident_reference: formData.incident_reference,
        incident_date: formData.incident_date,
        incident_type: formData.incident_type,
        problem_statement: formData.problem_statement,
        analysis_method: formData.analysis_method,
        analysis_team: formData.analysis_team.split(',').map(t => t.trim()).filter(t => t),
        contributing_factors: formData.contributing_factors,
        root_causes: formData.root_causes.split('\n').map(r => r.trim()).filter(r => r),
        five_whys: formData.five_whys.filter(w => w.trim()),
        corrective_actions: formData.corrective_actions,
        preventive_actions: formData.preventive_actions.split('\n').map(p => p.trim()).filter(p => p),
        verification_method: formData.verification_method,
        verification_date: formData.verification_date,
        lessons_learned: formData.lessons_learned,
        status: 'pending_approval',
        submitted_at: new Date().toISOString(),
        submitted_by: user?.email || 'Unknown',
      };

      const { data, error } = await supabase
        .from('root_cause_analyses')
        .insert(analysis)
        .select()
        .single();

      if (error) {
        console.error('[useRootCauseSafety] Error creating analysis:', error);
        throw error;
      }

      console.log('[useRootCauseSafety] Analysis created:', data.analysis_number);
      return data as RootCauseAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['root-cause-analyses'] });
    },
  });
}

export function useUpdateRootCauseAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RootCauseAnalysis> }) => {
      console.log('[useRootCauseSafety] Updating analysis:', id);
      
      const { data, error } = await supabase
        .from('root_cause_analyses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useRootCauseSafety] Error updating analysis:', error);
        throw error;
      }

      return data as RootCauseAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['root-cause-analyses'] });
    },
  });
}
