import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SafetyFootwearRecord, SafetyFootwearAllowance, FootwearType, SafetyFootwearFormData } from '@/types/ppeManagement';

export function useSafetyFootwearRecords() {
  return useQuery({
    queryKey: ['safety-footwear-records'],
    queryFn: async () => {
      console.log('Fetching safety footwear records...');
      const { data, error } = await supabase
        .from('safety_footwear_records')
        .select('*')
        .order('issue_date', { ascending: false });

      if (error) {
        console.error('Error fetching safety footwear records:', error);
        throw error;
      }

      console.log('Fetched safety footwear records:', data?.length);
      return data as SafetyFootwearRecord[];
    },
  });
}

export function useSafetyFootwearRecord(id: string) {
  return useQuery({
    queryKey: ['safety-footwear-record', id],
    queryFn: async () => {
      console.log('Fetching safety footwear record:', id);
      const { data, error } = await supabase
        .from('safety_footwear_records')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching safety footwear record:', error);
        throw error;
      }

      return data as SafetyFootwearRecord;
    },
    enabled: !!id,
  });
}

export function useFootwearTypes() {
  return useQuery({
    queryKey: ['footwear-types'],
    queryFn: async () => {
      console.log('Fetching footwear types...');
      const { data, error } = await supabase
        .from('footwear_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching footwear types:', error);
        throw error;
      }

      console.log('Fetched footwear types:', data?.length);
      return data as FootwearType[];
    },
  });
}

export function useSafetyFootwearAllowances() {
  return useQuery({
    queryKey: ['safety-footwear-allowances'],
    queryFn: async () => {
      console.log('Fetching safety footwear allowances...');
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('safety_footwear_allowances')
        .select('*')
        .eq('fiscal_year', currentYear)
        .order('employee_name');

      if (error) {
        console.error('Error fetching safety footwear allowances:', error);
        throw error;
      }

      console.log('Fetched safety footwear allowances:', data?.length);
      return data as SafetyFootwearAllowance[];
    },
  });
}

export function useEmployeeFootwearAllowance(employeeId: string) {
  return useQuery({
    queryKey: ['employee-footwear-allowance', employeeId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      console.log('Fetching employee footwear allowance:', employeeId);
      const { data, error } = await supabase
        .from('safety_footwear_allowances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('fiscal_year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching employee footwear allowance:', error);
        throw error;
      }

      return data as SafetyFootwearAllowance | null;
    },
    enabled: !!employeeId,
  });
}

export function useReplacementDueFootwear(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['replacement-due-footwear', daysAhead],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      console.log('Fetching replacement due footwear...');
      const { data, error } = await supabase
        .from('safety_footwear_records')
        .select('*')
        .lte('replacement_due_date', futureDate.toISOString().split('T')[0])
        .neq('condition', 'replaced')
        .order('replacement_due_date', { ascending: true });

      if (error) {
        console.error('Error fetching replacement due footwear:', error);
        throw error;
      }

      return data as SafetyFootwearRecord[];
    },
  });
}

export function useCreateSafetyFootwearRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: SafetyFootwearFormData) => {
      console.log('Creating safety footwear record:', formData);
      const { data, error } = await supabase
        .from('safety_footwear_records')
        .insert([formData])
        .select()
        .single();

      if (error) {
        console.error('Error creating safety footwear record:', error);
        throw error;
      }

      return data as SafetyFootwearRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-records'] });
      queryClient.invalidateQueries({ queryKey: ['replacement-due-footwear'] });
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-allowances'] });
    },
  });
}

export function useUpdateSafetyFootwearRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: SafetyFootwearFormData & { id: string }) => {
      console.log('Updating safety footwear record:', id);
      const { data, error } = await supabase
        .from('safety_footwear_records')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating safety footwear record:', error);
        throw error;
      }

      return data as SafetyFootwearRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-records'] });
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-record', data.id] });
      queryClient.invalidateQueries({ queryKey: ['replacement-due-footwear'] });
    },
  });
}

export function useDeleteSafetyFootwearRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting safety footwear record:', id);
      const { error } = await supabase
        .from('safety_footwear_records')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting safety footwear record:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-records'] });
      queryClient.invalidateQueries({ queryKey: ['replacement-due-footwear'] });
    },
  });
}

export function useCreateFootwearAllowance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SafetyFootwearAllowance, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating footwear allowance:', data);
      const { data: result, error } = await supabase
        .from('safety_footwear_allowances')
        .insert([{
          ...data,
          remaining_amount: data.total_allowance - (data.used_amount || 0),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating footwear allowance:', error);
        throw error;
      }

      return result as SafetyFootwearAllowance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-allowances'] });
    },
  });
}

export function useUpdateFootwearAllowance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SafetyFootwearAllowance> & { id: string }) => {
      console.log('Updating footwear allowance:', id);
      const { data: result, error } = await supabase
        .from('safety_footwear_allowances')
        .update({
          ...data,
          remaining_amount: data.total_allowance && data.used_amount !== undefined
            ? data.total_allowance - data.used_amount
            : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating footwear allowance:', error);
        throw error;
      }

      return result as SafetyFootwearAllowance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-footwear-allowances'] });
    },
  });
}
