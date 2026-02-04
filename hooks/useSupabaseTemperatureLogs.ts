import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type TemperatureLogType = 'cooler' | 'freezer' | 'hot_holding' | 'receiving' | 'cooking' | 'cooling' | 'ambient' | 'storage' | 'transport';
export type TemperatureUnit = 'F' | 'C';

export interface TemperatureLog {
  id: string;
  organization_id: string;
  log_type: TemperatureLogType;
  location_name: string;
  location_id: string | null;
  equipment_name: string | null;
  equipment_id: string | null;
  reading_date: string;
  reading_time: string;
  temperature: number;
  temperature_unit: TemperatureUnit;
  min_limit: number | null;
  max_limit: number | null;
  is_within_limits: boolean | null;
  out_of_range: boolean;
  corrective_action: string | null;
  corrective_action_taken_by: string | null;
  corrective_action_time: string | null;
  recorded_by: string;
  recorded_by_id: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  notes: string | null;
  created_at: string;
}

type CreateTemperatureLogInput = Omit<TemperatureLog, 'id' | 'organization_id' | 'created_at'>;

export interface TemperatureLogFilters {
  logType?: TemperatureLogType;
  locationName?: string;
  equipmentId?: string;
  startDate?: string;
  endDate?: string;
  outOfRangeOnly?: boolean;
}

export function useSupabaseTemperatureLogs(filters?: TemperatureLogFilters) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const temperatureLogsQuery = useQuery({
    queryKey: ['temperature_logs', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseTemperatureLogs] Fetching temperature logs with filters:', filters);

      let query = supabase
        .from('temperature_logs')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.logType) {
        query = query.eq('log_type', filters.logType);
      }
      if (filters?.locationName) {
        query = query.eq('location_name', filters.locationName);
      }
      if (filters?.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }
      if (filters?.startDate) {
        query = query.gte('reading_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('reading_date', filters.endDate);
      }
      if (filters?.outOfRangeOnly) {
        query = query.eq('out_of_range', true);
      }

      const { data, error } = await query.order('reading_date', { ascending: false }).order('reading_time', { ascending: false });

      if (error) throw error;
      return (data || []) as TemperatureLog[];
    },
    enabled: !!organizationId,
  });

  const todaysLogsQuery = useQuery({
    queryKey: ['temperature_logs', 'today', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      console.log('[useSupabaseTemperatureLogs] Fetching today\'s logs');

      const { data, error } = await supabase
        .from('temperature_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('reading_date', today)
        .order('reading_time', { ascending: false });

      if (error) throw error;
      return (data || []) as TemperatureLog[];
    },
    enabled: !!organizationId,
  });

  const outOfRangeLogsQuery = useQuery({
    queryKey: ['temperature_logs', 'out_of_range', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseTemperatureLogs] Fetching out-of-range logs');

      const { data, error } = await supabase
        .from('temperature_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('out_of_range', true)
        .order('reading_date', { ascending: false })
        .order('reading_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as TemperatureLog[];
    },
    enabled: !!organizationId,
  });

  const createTemperatureLogMutation = useMutation({
    mutationFn: async (input: CreateTemperatureLogInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseTemperatureLogs] Creating temperature log for:', input.location_name);

      const isWithinLimits = input.min_limit !== null && input.max_limit !== null
        ? input.temperature >= input.min_limit && input.temperature <= input.max_limit
        : null;

      const outOfRange = isWithinLimits === false;

      const { data, error } = await supabase
        .from('temperature_logs')
        .insert({
          organization_id: organizationId,
          ...input,
          is_within_limits: isWithinLimits,
          out_of_range: outOfRange,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TemperatureLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
    },
  });

  const addCorrectiveActionMutation = useMutation({
    mutationFn: async ({ id, correctiveAction, takenBy }: { id: string; correctiveAction: string; takenBy: string }) => {
      console.log('[useSupabaseTemperatureLogs] Adding corrective action to log:', id);

      const { data, error } = await supabase
        .from('temperature_logs')
        .update({
          corrective_action: correctiveAction,
          corrective_action_taken_by: takenBy,
          corrective_action_time: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TemperatureLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
    },
  });

  const verifyLogMutation = useMutation({
    mutationFn: async ({ id, verifiedBy, verifiedById }: { id: string; verifiedBy: string; verifiedById?: string }) => {
      console.log('[useSupabaseTemperatureLogs] Verifying log:', id);

      const { data, error } = await supabase
        .from('temperature_logs')
        .update({
          verified_by: verifiedBy,
          verified_by_id: verifiedById || null,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TemperatureLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseTemperatureLogs] Deleting log:', id);

      const { error } = await supabase
        .from('temperature_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature_logs'] });
    },
  });

  const getLogsByLocation = (locationName: string) => {
    return temperatureLogsQuery.data?.filter(log => log.location_name === locationName) || [];
  };

  const getLogsByType = (logType: TemperatureLogType) => {
    return temperatureLogsQuery.data?.filter(log => log.log_type === logType) || [];
  };

  const getLogsByDateRange = (startDate: string, endDate: string) => {
    return temperatureLogsQuery.data?.filter(log => 
      log.reading_date >= startDate && log.reading_date <= endDate
    ) || [];
  };

  const getUnverifiedLogs = () => {
    return temperatureLogsQuery.data?.filter(log => !log.verified_by) || [];
  };

  const getLogsNeedingCorrectiveAction = () => {
    return temperatureLogsQuery.data?.filter(log => 
      log.out_of_range && !log.corrective_action
    ) || [];
  };

  const getLocationStats = (locationName: string, days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const logs = temperatureLogsQuery.data?.filter(log => 
      log.location_name === locationName && log.reading_date >= cutoffStr
    ) || [];

    if (logs.length === 0) return null;

    const temps = logs.map(log => log.temperature);
    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((a, b) => a + b, 0) / temps.length,
      count: logs.length,
      outOfRangeCount: logs.filter(l => l.out_of_range).length,
    };
  };

  const convertTemperature = (temp: number, from: TemperatureUnit, to: TemperatureUnit): number => {
    if (from === to) return temp;
    if (from === 'F' && to === 'C') return (temp - 32) * 5 / 9;
    return (temp * 9 / 5) + 32;
  };

  return {
    logs: temperatureLogsQuery.data || [],
    todaysLogs: todaysLogsQuery.data || [],
    outOfRangeLogs: outOfRangeLogsQuery.data || [],
    isLoading: temperatureLogsQuery.isLoading,

    createLog: createTemperatureLogMutation.mutateAsync,
    addCorrectiveAction: addCorrectiveActionMutation.mutateAsync,
    verifyLog: verifyLogMutation.mutateAsync,
    deleteLog: deleteLogMutation.mutateAsync,

    getLogsByLocation,
    getLogsByType,
    getLogsByDateRange,
    getUnverifiedLogs,
    getLogsNeedingCorrectiveAction,
    getLocationStats,
    convertTemperature,

    refetch: () => {
      temperatureLogsQuery.refetch();
      todaysLogsQuery.refetch();
      outOfRangeLogsQuery.refetch();
    },
  };
}
