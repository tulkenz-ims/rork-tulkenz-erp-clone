/**
 * contexts/BrandKitContext.tsx
 * Reads the brand kit set in TulKenz Brandz and applies it on top of the active theme.
 * Brand kit is stored per-organization in the brand_kits table.
 */

import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

export type BrandKit = {
  id: string;
  organization_id: string;
  brand_name: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_tertiary: string | null;
  logo_url: string | null;
  font_family: 'sans' | 'mono' | 'serif';
  base_theme: 'clean_light' | 'classic' | 'ghost_protocol' | 'hud_cyan';
  dashboard_layout: {
    widgets: {
      id: string;
      type: string;
      order: number;
      visible: boolean;
      size: string;
    }[];
  };
  visible_modules: string[];
  dept_colors: Record<string, string>;
  updated_at: string;
};

export const DEFAULT_DEPT_COLORS: Record<string, string> = {
  maintenance:  '#2266DD',
  sanitation:   '#00AA55',
  production:   '#EE9900',
  quality:      '#AA44BB',
  safety:       '#EE3344',
  hr:           '#EE4499',
  warehouse:    '#44BB44',
  projects:     '#00BBAA',
};

export const DEFAULT_BRAND_KIT: Omit<BrandKit, 'id' | 'organization_id' | 'updated_at'> = {
  brand_name: null,
  brand_primary: '#2266DD',
  brand_secondary: '#EE9900',
  brand_tertiary: '#00AA55',
  logo_url: null,
  font_family: 'sans',
  base_theme: 'hud_cyan',
  dashboard_layout: {
    widgets: [
      { id: 'stat_row',      type: 'stat_row',      order: 1, visible: true, size: 'full'   },
      { id: 'quick_actions', type: 'quick_actions', order: 2, visible: true, size: 'medium' },
      { id: 'compliance',    type: 'compliance',    order: 3, visible: true, size: 'medium' },
      { id: 'line_status',   type: 'line_status',   order: 4, visible: true, size: 'full'   },
      { id: 'task_feed',     type: 'task_feed',     order: 5, visible: true, size: 'full'   },
      { id: 'alerts',        type: 'alerts',        order: 6, visible: true, size: 'medium' },
    ],
  },
  visible_modules: [
    'dashboard', 'task_feed', 'time_clock', 'cmms', 'inventory',
    'documents', 'labor', 'procurement', 'approvals', 'quality',
    'safety', 'sanitation', 'production', 'compliance', 'hr', 'reports',
  ],
  dept_colors: DEFAULT_DEPT_COLORS,
};

export const [BrandKitProvider, useBrandKit] = createContextHook(() => {
  const { userProfile } = useUser();
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organization_id) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('brand_kits')
          .select('*')
          .eq('organization_id', userProfile.organization_id)
          .single();

        if (error || !data) {
          console.log('[BrandKit] No brand kit found, using defaults');
          setBrandKit(null);
        } else {
          console.log('[BrandKit] ✅ Loaded brand kit for org:', userProfile.organization_id);
          setBrandKit(data as BrandKit);
        }
      } catch (e) {
        console.error('[BrandKit] Error loading brand kit:', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userProfile?.organization_id]);

  // Merged kit — falls back to defaults for any missing fields
  const kit = useMemo(() => ({
    ...DEFAULT_BRAND_KIT,
    ...brandKit,
  }), [brandKit]);

  // Dept color helper — returns the brand color for a department key
  const getDeptColor = (dept: string): string => {
    const key = dept.toLowerCase();
    return kit.dept_colors?.[key] || DEFAULT_DEPT_COLORS[key] || '#888888';
  };

  // Module visibility helper
  const isModuleVisible = (moduleKey: string): boolean => {
    if (!kit.visible_modules || kit.visible_modules.length === 0) return true;
    return kit.visible_modules.includes(moduleKey);
  };

  // Widget visibility helper
  const isWidgetVisible = (widgetId: string): boolean => {
    const widget = kit.dashboard_layout?.widgets?.find(w => w.id === widgetId);
    return widget ? widget.visible : true;
  };

  // Sorted visible widgets for dashboard layout
  const dashboardWidgets = useMemo(() => {
    return (kit.dashboard_layout?.widgets || [])
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order);
  }, [kit.dashboard_layout]);

  return {
    brandKit: kit,
    isLoading,
    hasBrandKit: !!brandKit,
    getDeptColor,
    isModuleVisible,
    isWidgetVisible,
    dashboardWidgets,
  };
});
