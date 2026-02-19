/**
 * RealtimeProvider - Sets up Supabase Realtime subscriptions at app level
 * 
 * Subscribes to critical tables so all devices get live updates.
 * Add this inside QueryClientProvider and UserProvider in _layout.tsx.
 * 
 * To enable Realtime on a table:
 *   Supabase Dashboard → Database → Replication → Enable the table
 * 
 * Tables enabled here (add to Supabase Replication):
 *   - emergency_events
 *   - fire_drill_entries
 *   - task_feed_posts
 *   - task_feed_department_tasks
 *   - work_orders
 *   - notifications
 *   - time_entries
 *   - time_punches
 *   - sanitation_tasks
 *   - room_sessions
 *   - production_runs
 *   - downtime_events
 *   - low_stock_alerts
 *   - maintenance_alerts
 */

import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { REALTIME_TABLE_MAP } from '@/hooks/useRealtimeSync';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Which tables to subscribe to at app level
// These are the ones that need cross-device sync the most
const APP_LEVEL_TABLES = [
  // 🚨 Emergency - fire drills, evacuations
  'emergency_events',
  'fire_drill_entries',
  'evacuation_drill_entries',

  // 📋 Task Feed - posts, department tasks, form links
  'task_feed_posts',
  'task_feed_department_tasks',
  'task_feed_form_links',

  // 🔧 Work Orders
  'work_orders',

  // 🔔 Notifications
  'notifications',

  // ⏰ Time tracking
  'time_entries',
  'time_punches',

  // 🧹 Sanitation / Room sessions
  'sanitation_tasks',
  'room_sessions',

  // 🏭 Production
  'production_runs',
  'downtime_events',

  // 📦 Inventory alerts
  'low_stock_alerts',
  'maintenance_alerts',
];

interface RealtimeContextValue {
  /** Number of active realtime subscriptions */
  activeSubscriptions: number;
  /** Whether all subscriptions are connected */
  isConnected: boolean;
  /** List of subscribed tables */
  subscribedTables: string[];
}

const RealtimeContext = createContext<RealtimeContextValue>({
  activeSubscriptions: 0,
  isConnected: false,
  subscribedTables: [],
});

export const useRealtimeStatus = () => useContext(RealtimeContext);

interface RealtimeProviderProps {
  children: React.ReactNode;
  /** Override which tables to subscribe to (default: APP_LEVEL_TABLES) */
  tables?: string[];
  /** Disable all subscriptions (useful for debugging) */
  disabled?: boolean;
}

export function RealtimeProvider({ 
  children, 
  tables = APP_LEVEL_TABLES,
  disabled = false,
}: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (disabled) return;

    // Clean up any existing channels first
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];
    let connectedCount = 0;

    const channels = tables.map(table => {
      const queryKeyPrefixes = REALTIME_TABLE_MAP[table] || [[table]];

      const channel = supabase
        .channel(`app-realtime-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (_payload) => {
            // Debounce per table to batch rapid changes
            if (debounceTimers.current[table]) {
              clearTimeout(debounceTimers.current[table]);
            }

            debounceTimers.current[table] = setTimeout(() => {
              queryKeyPrefixes.forEach(prefix => {
                queryClient.invalidateQueries({ queryKey: prefix });
              });
            }, 300);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            connectedCount++;
            setActiveCount(connectedCount);
            if (connectedCount === tables.length) {
              setIsConnected(true);
              console.log(`[Realtime] ✅ All ${tables.length} tables connected`);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.warn(`[Realtime] ❌ Failed to subscribe to ${table}`);
          } else if (status === 'CLOSED') {
            connectedCount = Math.max(0, connectedCount - 1);
            setActiveCount(connectedCount);
            if (connectedCount === 0) {
              setIsConnected(false);
            }
          }
        });

      return channel;
    });

    channelsRef.current = channels;
    console.log(`[Realtime] 🔌 Subscribing to ${tables.length} tables...`);

    return () => {
      // Clear all debounce timers
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};

      // Remove all channels
      channels.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
      setActiveCount(0);
      setIsConnected(false);
      console.log('[Realtime] 🔌 All subscriptions cleaned up');
    };
  }, [disabled, queryClient]); // tables intentionally stable

  const contextValue: RealtimeContextValue = {
    activeSubscriptions: activeCount,
    isConnected,
    subscribedTables: tables,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export default RealtimeProvider;
