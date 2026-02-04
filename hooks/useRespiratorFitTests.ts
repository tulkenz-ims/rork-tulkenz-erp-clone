import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RespiratorFitTest, RespiratorType, RespiratorFitTestFormData } from '@/types/ppeManagement';

export function useRespiratorFitTests() {
  return useQuery({
    queryKey: ['respirator-fit-tests'],
    queryFn: async () => {
      console.log('Fetching respirator fit tests...');
      const { data, error } = await supabase
        .from('respirator_fit_tests')
        .select('*')
        .order('test_date', { ascending: false });

      if (error) {
        console.error('Error fetching respirator fit tests:', error);
        throw error;
      }

      console.log('Fetched respirator fit tests:', data?.length);
      return data as RespiratorFitTest[];
    },
  });
}

export function useRespiratorFitTest(id: string) {
  return useQuery({
    queryKey: ['respirator-fit-test', id],
    queryFn: async () => {
      console.log('Fetching respirator fit test:', id);
      const { data, error } = await supabase
        .from('respirator_fit_tests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching respirator fit test:', error);
        throw error;
      }

      return data as RespiratorFitTest;
    },
    enabled: !!id,
  });
}

export function useRespiratorTypes() {
  return useQuery({
    queryKey: ['respirator-types'],
    queryFn: async () => {
      console.log('Fetching respirator types...');
      const { data, error } = await supabase
        .from('respirator_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching respirator types:', error);
        throw error;
      }

      console.log('Fetched respirator types:', data?.length);
      return data as RespiratorType[];
    },
  });
}

export function useExpiringFitTests(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['expiring-fit-tests', daysAhead],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      console.log('Fetching expiring fit tests...');
      const { data, error } = await supabase
        .from('respirator_fit_tests')
        .select('*')
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .gte('expiration_date', new Date().toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });

      if (error) {
        console.error('Error fetching expiring fit tests:', error);
        throw error;
      }

      return data as RespiratorFitTest[];
    },
  });
}

export function useCreateRespiratorFitTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: RespiratorFitTestFormData) => {
      console.log('Creating respirator fit test:', formData);
      const { data, error } = await supabase
        .from('respirator_fit_tests')
        .insert([formData])
        .select()
        .single();

      if (error) {
        console.error('Error creating respirator fit test:', error);
        throw error;
      }

      return data as RespiratorFitTest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respirator-fit-tests'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-fit-tests'] });
    },
  });
}

export function useUpdateRespiratorFitTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: RespiratorFitTestFormData & { id: string }) => {
      console.log('Updating respirator fit test:', id);
      const { data, error } = await supabase
        .from('respirator_fit_tests')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating respirator fit test:', error);
        throw error;
      }

      return data as RespiratorFitTest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['respirator-fit-tests'] });
      queryClient.invalidateQueries({ queryKey: ['respirator-fit-test', data.id] });
      queryClient.invalidateQueries({ queryKey: ['expiring-fit-tests'] });
    },
  });
}

export function useDeleteRespiratorFitTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting respirator fit test:', id);
      const { error } = await supabase
        .from('respirator_fit_tests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting respirator fit test:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respirator-fit-tests'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-fit-tests'] });
    },
  });
}
