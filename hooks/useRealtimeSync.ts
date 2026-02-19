/**
 * useRealtimeSync - Subscribe to Supabase Realtime changes and auto-invalidate React Query cache
 * 
 * Usage:
 *   // In any component - subscribe to a single table
 *   useRealtimeSync('emergency_events', [['emergency_events']]);
 * 
 *   // Subscribe to a table with multiple query key prefixes to invalidate
 *   useRealtimeSync('work_orders', [['work_orders'], ['notifications']]);
 * 
 *   // With a callback for immediate UI updates (e.g., fire alarm banner)
 *   useRealtimeSync('emergency_events', [['emergency_events']], {
 *     onInsert: (payload) => showEmergencyBanner(payload.new),
 *     onUpdate: (payload) => updateEmergencyStatus(payload.new),
 *   });
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type ChangePayload = RealtimePostgresChangesPayload<{ [key: string]: any }>;

interface RealtimeSyncOptions {
  /** Called immediately on INSERT before cache invalidation */
  onInsert?: (payload: ChangePayload) => void;
  /** Called immediately on UPDATE before cache invalidation */
  onUpdate?: (payload: ChangePayload) => void;
  /** Called immediately on DELETE before cache invalidation */
  onDelete?: (payload: ChangePayload) => void;
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /** Optional filter - only react to rows matching this column/value */
  filter?: string;
  /** Debounce invalidation in ms to batch rapid changes (default: 300) */
  debounceMs?: number;
}

export function useRealtimeSync(
  table: string,
  queryKeyPrefixes: string[][],
  options: RealtimeSyncOptions = {}
) {
  const queryClient = useQueryClient();
  const {
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
    filter,
    debounceMs = 300,
  } = options;

  // Use refs to avoid re-subscribing on every render
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });
  callbacksRef.current = { onInsert, onUpdate, onDelete };

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = filter
      ? `realtime-${table}-${filter}`
      : `realtime-${table}`;

    const subscriptionConfig: any = {
      event: '*',
      schema: 'public',
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        (payload: ChangePayload) => {
          // Fire immediate callbacks for urgent UI updates
          const { onInsert, onUpdate, onDelete } = callbacksRef.current;
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }

          // Debounced cache invalidation to batch rapid changes
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            queryKeyPrefixes.forEach(prefix => {
              queryClient.invalidateQueries({ queryKey: prefix });
            });
          }, debounceMs);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Subscribed to ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] ❌ Error subscribing to ${table}`);
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
      console.log(`[Realtime] 🔌 Unsubscribed from ${table}`);
    };
  }, [table, enabled, filter, debounceMs, queryClient]);
  // Note: queryKeyPrefixes intentionally excluded from deps to avoid re-subscribing
  // The invalidation always uses the latest prefixes via closure
}

/**
 * Pre-configured table → query key mappings for common tables.
 * Used by RealtimeProvider to set up app-wide subscriptions.
 */
export const REALTIME_TABLE_MAP: Record<string, string[][]> = {
  // Emergency & Safety - highest priority for cross-device sync
  emergency_events: [['emergency_events']],
  fire_drill_entries: [['emergency_events'], ['safety_emergency_records']],
  evacuation_drill_entries: [['emergency_events'], ['safety_emergency_records']],
  safety_incidents: [['safety_incidents']],

  // Task Feed - the communication backbone
  task_feed_posts: [['task_feed_posts'], ['task_feed_posts_with_tasks'], ['task_feed_post_detail'], ['task_feed_post_by_number']],
  task_feed_department_tasks: [['task_feed_department_tasks'], ['task_feed_department_tasks_for_post'], ['task_feed_posts_with_tasks']],
  task_feed_form_links: [['task_feed_form_links'], ['task_feed_post_detail']],

  // Work Orders
  work_orders: [['work_orders']],

  // Notifications
  notifications: [['notifications'], ['notifications_count']],

  // Time tracking
  time_entries: [['active-time-entry'], ['time-entries']],
  time_punches: [['time-punches'], ['active-time-entry'], ['all-employees-clock-status']],

  // Inventory alerts
  low_stock_alerts: [['low_stock_alerts'], ['maintenance_alerts']],
  maintenance_alerts: [['maintenance_alerts']],

  // Departments & Locations (settings sync)
  departments: [['departments']],
  locations: [['locations']],
  facilities: [['facilities']],

  // Production
  production_runs: [['production_runs']],
  downtime_events: [['downtime_events']],

  // Sanitation
  sanitation_tasks: [['sanitation_tasks']],
  room_sessions: [['active-room-sessions'], ['room_sessions']],
};

export default useRealtimeSync;
