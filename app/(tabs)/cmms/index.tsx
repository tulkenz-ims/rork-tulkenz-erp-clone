import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cog,
  Calendar,
  Package,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  Truck,
  CalendarClock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  PlayCircle,
  Zap,
  Plus,
  AlertOctagon,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkOrdersQuery, useWorkOrderMetrics } from '@/hooks/useSupabaseWorkOrders';
import { useEquipmentQuery, useEquipmentMetrics } from '@/hooks/useSupabaseEquipment';
import { usePMSchedulesQuery, usePMScheduleMetrics } from '@/hooks/useSupabasePMSchedules';
import { usePMWorkOrdersQuery, usePMWorkOrderMetrics } from '@/hooks/useSupabasePMWorkOrders';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { supabase } from '@/lib/supabase';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

interface WorkOrderCompletionData {
  workPerformed: string;
  actionTaken: string;
  completionPhotos: string[];
  partsUsed: string;
  laborHours: string;
  additionalNotes: string;
  rootCause?: string;
  preventiveAction?: string;
}

interface FormItem {
  id: string;
  title: string;
  route: string;
}

interface FormCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  forms: FormItem[];
}

const CMMS_CATEGORIES: FormCategory[] = [
  {
    id: 'workorders',
    title: 'Work Order Management',
    icon: ClipboardList,
    color: '#3B82F6',
    forms: [
      { id: 'workorders', title: 'All Work Orders', route: '/cmms/workorders' },
      { id: 'newworkorder', title: 'Create New Work Order', route: '/cmms/newworkorder' },
      { id: 'correctivemo', title: 'Corrective Maintenance', route: '/cmms/correctivemo' },
      { id: 'wohistory', title: 'Work Order History', route: '/cmms/wohistory' },
    ],
  },
  {
    id: 'preventive',
    title: 'Preventive Maintenance',
    icon: CalendarClock,
    color: '#10B981',
    forms: [
      { id: 'pmschedule', title: 'PM Schedule', route: '/cmms/pmschedule' },
      { id: 'pmcalendar', title: 'PM Calendar', route: '/cmms/pmcalendar' },
      { id: 'pmtasks', title: 'PM Task Library', route: '/cmms/pmtasks' },
      { id: 'pmtemplates', title: 'PM Templates', route: '/cmms/pmtemplates' },
    ],
  },
  {
    id: 'equipment',
    title: 'Equipment Management',
    icon: Cog,
    color: '#8B5CF6',
    forms: [
      { id: 'equipmentlist', title: 'Equipment List', route: '/cmms/equipmentlist' },
      { id: 'equipmentregistry', title: 'Equipment Registry', route: '/cmms/equipmentregistry' },
      { id: 'equipmenthierarchy', title: 'Equipment Hierarchy', route: '/cmms/equipmenthierarchy' },
      { id: 'equipmenthistory', title: 'Equipment History', route: '/cmms/equipmenthistory' },
      { id: 'equipmentdowntime', title: 'Equipment Downtime', route: '/cmms/equipmentdowntime' },
    ],
  },
  {
    id: 'mroinventory',
    title: 'MRO Parts',
    icon: Package,
    color: '#EC4899',
    forms: [
      { id: 'partslist', title: 'MRO Parts & Supplies', route: '/cmms/partslist' },
      { id: 'whereused', title: 'Where-Used Analysis', route: '/cmms/whereused' },
      { id: 'stocklevels', title: 'MRO Stock Levels', route: '/cmms/stocklevels' },
    ],
  },
  {
    id: 'vendors',
    title: 'Vendors',
    icon: Truck,
    color: '#0891B2',
    forms: [
      { id: 'vendorlist', title: 'Vendor List', route: '/cmms/vendorlist' },
    ],
  },
  {
    id: 'failure',
    title: 'Failure Analysis',
    icon: AlertCircle,
    color: '#EF4444',
    forms: [
      { id: 'failurecodes', title: 'Failure Codes', route: '/cmms/failurecodes' },
      { id: 'failureanalysis', title: 'Failure Analysis', route: '/cmms/failureanalysis' },
      { id: 'rootcauseanalysis', title: 'Root Cause Analysis', route: '/cmms/rootcauseanalysis' },
      { id: 'mtbfanalysis', title: 'MTBF Analysis', route: '/cmms/mtbfanalysis' },
      { id: 'mttranalysis', title: 'MTTR Analysis', route: '/cmms/mttranalysis' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Compliance',
    icon: ShieldCheck,
    color: '#DC2626',
    forms: [
      { id: 'lotoprocedures', title: 'LOTO Procedures', route: '/cmms/lotoprocedures' },
      { id: 'safetypermits', title: 'Safety Permits', route: '/cmms/safetypermits' },
      { id: 'pperequirements', title: 'PPE Requirements', route: '/cmms/pperequirements' },
      { id: 'safetychecklist', title: 'Safety Checklist', route: '/cmms/safetychecklist' },
      { id: 'hazardassessment', title: 'Hazard Assessment', route: '/cmms/hazardassessment' },
      { id: 'regulatorycompliance', title: 'Regulatory Compliance', route: '/cmms/regulatorycompliance' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    icon: BarChart3,
    color: '#7C3AED',
    forms: [
      { id: 'kpidashboard', title: 'KPI Dashboard', route: '/cmms/kpidashboard' },
      { id: 'downtimereport', title: 'Downtime Report', route: '/cmms/downtimereport' },
    ],
  },
];

interface RecentActivity {
  id: string;
  type: 'wo_created' | 'wo_completed' | 'wo_started' | 'pm_completed' | 'equipment_down' | 'equipment_up';
  title: string;
  description: string;
  time: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface UpcomingPM {
  id: string;
  name: string;
  equipment: string;
  dueDate: string;
  daysUntil: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export default function CMMSScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllActivity, setShowAllActivity] = useState(false);

  const { data: workOrders = [], isLoading: woLoading, error: woError, refetch: refetchWO } = useWorkOrdersQuery();
  const { data: equipment = [], isLoading: eqLoading, error: eqError, refetch: refetchEq } = useEquipmentQuery();
  const { data: pmSchedules = [], isLoading: pmLoading, error: pmError, refetch: refetchPM } = usePMSchedulesQuery({ active: true });
  const { data: pmWorkOrders = [], refetch: refetchPMWO } = usePMWorkOrdersQuery();
  const { data: woMetrics, refetch: refetchWOMetrics } = useWorkOrderMetrics();
  const { data: eqMetrics, refetch: refetchEqMetrics } = useEquipmentMetrics();
  const { data: pmMetrics, refetch: refetchPMMetrics } = usePMScheduleMetrics();

  // Log any errors for debugging
  React.useEffect(() => {
    if (woError) console.error('[CMMSScreen] Work Order Error:', woError);
    if (eqError) console.error('[CMMSScreen] Equipment Error:', eqError);
    if (pmError) console.error('[CMMSScreen] PM Schedule Error:', pmError);
  }, [woError, eqError, pmError]);

  const isLoading = woLoading || eqLoading || pmLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[CMMSScreen] Refreshing data...');
    await Promise.all([
      refetchWO(),
      refetchEq(),
      refetchPM(),
      refetchPMWO(),
      refetchWOMetrics(),
      refetchEqMetrics(),
      refetchPMMetrics(),
    ]);
    setRefreshing(false);
    console.log('[CMMSScreen] Refresh complete');
  }, [refetchWO, refetchEq, refetchPM, refetchPMWO, refetchWOMetrics, refetchEqMetrics, refetchPMMetrics]);

  const handleFormPress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }, [router]);

  const toggleCategory = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  // Work Order Statistics from Supabase
  const woStats = useMemo(() => {
    if (woMetrics) {
      const critical = workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed').length;
      return {
        open: woMetrics.open,
        inProgress: woMetrics.inProgress,
        completed: woMetrics.completed,
        overdue: woMetrics.overdue,
        critical,
        total: woMetrics.total,
      };
    }
    const open = workOrders.filter(wo => wo.status === 'open').length;
    const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
    const completed = workOrders.filter(wo => wo.status === 'completed').length;
    const today = new Date().toISOString().split('T')[0];
    const overdue = workOrders.filter(wo => 
      ['open', 'in_progress'].includes(wo.status || '') && 
      wo.due_date && wo.due_date < today
    ).length;
    const critical = workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed').length;
    const total = workOrders.length;
    return { open, inProgress, completed, overdue, critical, total };
  }, [workOrders, woMetrics]);

  // PM Statistics from Supabase
  const pmStats = useMemo(() => {
    if (pmMetrics) {
      const rate = typeof pmMetrics.complianceRate === 'number' && !isNaN(pmMetrics.complianceRate) 
        ? pmMetrics.complianceRate 
        : 100;
      return {
        scheduled: pmMetrics.active || 0,
        overdue: pmMetrics.overdue || 0,
        completed: pmMetrics.completedThisMonth || 0,
        total: pmMetrics.total || 0,
        complianceRate: rate,
      };
    }
    const today = new Date().toISOString().split('T')[0];
    const scheduled = pmSchedules.filter(pm => pm.active).length;
    const overdue = pmSchedules.filter(pm => pm.active && pm.next_due < today).length;
    const completed = pmSchedules.filter(pm => pm.last_completed).length;
    const total = pmSchedules.length;
    const complianceRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
    return { scheduled, overdue, completed, total, complianceRate };
  }, [pmSchedules, pmMetrics]);

  // Equipment Statistics from Supabase
  const equipmentStats = useMemo(() => {
    if (eqMetrics) {
      const total = eqMetrics.total || 1;
      const uptimeRate = total > 0 ? Math.round((eqMetrics.operational / total) * 100) : 100;
      return {
        operational: eqMetrics.operational,
        down: eqMetrics.down,
        maintenance: eqMetrics.needsMaintenance,
        total: eqMetrics.total,
        uptimeRate,
      };
    }
    const operational = equipment.filter(e => e.status === 'operational').length;
    const down = equipment.filter(e => e.status === 'down').length;
    const maintenance = equipment.filter(e => e.status === 'needs_maintenance').length;
    const total = equipment.length;
    const uptimeRate = total > 0 ? Math.round((operational / total) * 100) : 100;
    return { operational, down, maintenance, total, uptimeRate };
  }, [equipment, eqMetrics]);

  // KPIs calculated from actual Supabase data
  const kpis = useMemo(() => ({
    mttr: { value: 0, unit: 'hrs', trend: 0, label: 'MTTR' },
    mtbf: { value: 0, unit: 'hrs', trend: 0, label: 'MTBF' },
    wrenchTime: { value: 0, unit: '%', trend: 0, label: 'Wrench Time' },
    pmCompliance: { value: pmStats.complianceRate, unit: '%', trend: 0, label: 'PM Compliance' },
    backlog: { value: woStats.open + woStats.inProgress, unit: 'WOs', trend: 0, label: 'Backlog' },
    firstTimeFixRate: { value: 0, unit: '%', trend: 0, label: 'First Time Fix' },
  }), [pmStats.complianceRate, woStats.open, woStats.inProgress]);

  // Recent Activity Feed - derived from Supabase data
  const recentActivity: RecentActivity[] = useMemo(() => {
    const activities: RecentActivity[] = [];
    const now = new Date();
    
    const formatTimeAgo = (dateStr: string | null | undefined) => {
      if (!dateStr) return 'Unknown';
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // Add work order activities from Supabase
    workOrders.slice(0, 20).forEach(wo => {
      if (wo.status === 'completed' && wo.completed_at) {
        activities.push({
          id: `wo-comp-${wo.id}`,
          type: 'wo_completed',
          title: `WO Completed`,
          description: wo.title || 'Work Order',
          time: formatTimeAgo(wo.completed_at),
          priority: wo.priority as 'low' | 'medium' | 'high' | 'critical',
          _sortDate: new Date(wo.completed_at).getTime(),
        } as RecentActivity & { _sortDate: number });
      } else if (wo.status === 'in_progress' && wo.started_at) {
        activities.push({
          id: `wo-start-${wo.id}`,
          type: 'wo_started',
          title: `WO Started`,
          description: wo.title || 'Work Order',
          time: formatTimeAgo(wo.started_at),
          priority: wo.priority as 'low' | 'medium' | 'high' | 'critical',
          _sortDate: new Date(wo.started_at).getTime(),
        } as RecentActivity & { _sortDate: number });
      } else if (wo.status === 'open' && wo.created_at) {
        activities.push({
          id: `wo-create-${wo.id}`,
          type: 'wo_created',
          title: `WO Created`,
          description: wo.title || 'Work Order',
          time: formatTimeAgo(wo.created_at),
          priority: wo.priority as 'low' | 'medium' | 'high' | 'critical',
          _sortDate: new Date(wo.created_at).getTime(),
        } as RecentActivity & { _sortDate: number });
      }
    });

    // Add PM work order activities from Supabase
    pmWorkOrders.slice(0, 10).forEach(pm => {
      if (pm.status === 'completed' && pm.completed_at) {
        activities.push({
          id: `pm-comp-${pm.id}`,
          type: 'pm_completed',
          title: 'PM Completed',
          description: `${pm.title || 'PM'} - ${pm.equipment || 'Equipment'}`,
          time: formatTimeAgo(pm.completed_at),
          _sortDate: new Date(pm.completed_at).getTime(),
        } as RecentActivity & { _sortDate: number });
      }
    });

    // Add equipment down events from Supabase
    equipment.forEach(eq => {
      if (eq.status === 'down') {
        activities.push({
          id: `eq-down-${eq.id}`,
          type: 'equipment_down',
          title: 'Equipment Down',
          description: `${eq.name} - ${eq.location || 'Unknown location'}`,
          time: 'Current',
          priority: 'high',
          _sortDate: now.getTime(),
        } as RecentActivity & { _sortDate: number });
      }
    });

    // Sort by date and return top 10
    return activities
      .sort((a, b) => ((b as any)._sortDate || 0) - ((a as any)._sortDate || 0))
      .slice(0, 10)
      .map(({ _sortDate, ...rest }: any) => rest as RecentActivity);
  }, [workOrders, pmWorkOrders, equipment]);

  // Upcoming PMs - derived from Supabase PM schedules
  const upcomingPMs: UpcomingPM[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return pmSchedules
      .filter(pm => pm.active && pm.next_due)
      .map(pm => {
        const dueDate = new Date(pm.next_due);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const daysUntil = isNaN(diffTime) ? 999 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          id: pm.id,
          name: pm.name,
          equipment: pm.equipment_name || 'Unknown Equipment',
          dueDate: pm.next_due,
          daysUntil,
          priority: (pm.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        };
      })
      .filter(pm => !isNaN(pm.daysUntil) && pm.daysUntil >= -7 && pm.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);
  }, [pmSchedules]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'wo_completed': return CheckCircle2;
      case 'wo_created': return Plus;
      case 'wo_started': return PlayCircle;
      case 'pm_completed': return Calendar;
      case 'equipment_down': return AlertOctagon;
      case 'equipment_up': return Zap;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string, priority?: string) => {
    if (type === 'equipment_down') return '#EF4444';
    if (type === 'equipment_up') return '#10B981';
    if (type === 'wo_completed' || type === 'pm_completed') return '#10B981';
    if (priority === 'critical') return '#DC2626';
    if (priority === 'high') return '#F59E0B';
    return '#3B82F6';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const quickActions = [
    { label: 'New Work Order', icon: Plus, color: '#3B82F6', route: '/cmms/newworkorder' },
    { label: 'PM Schedule', icon: Calendar, color: '#10B981', route: '/cmms/pmschedule' },
    { label: 'Equipment', icon: Cog, color: '#8B5CF6', route: '/cmms/equipmentlist' },
    { label: 'MRO Parts', icon: Package, color: '#EC4899', route: '/cmms/partslist' },
  ];

  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';
  const { user } = useUser();

  const handleCreateFullWorkOrder = useCallback(async (
    task: TaskFeedDepartmentTask,
    completionData: WorkOrderCompletionData
  ): Promise<string | null> => {
    try {
      if (!organizationId) {
        console.warn('[CMMS] No organization ID available, skipping work order creation');
        return null;
      }
      
      console.log('[CMMS] Creating full work order for task:', task.postNumber);
      
      const workOrderNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
      const completedByName = user ? `${user.first_name} ${user.last_name}` : 'System';
      
      const fullDescription = `**Source:** Task Feed - ${task.postNumber}
**Original Request:** ${task.departmentName} Task

---

**WORK PERFORMED:**
${completionData.workPerformed}

**ACTION TAKEN:**
${completionData.actionTaken}
${completionData.rootCause ? `
**ROOT CAUSE:**
${completionData.rootCause}` : ''}
${completionData.preventiveAction ? `
**PREVENTIVE ACTION:**
${completionData.preventiveAction}` : ''}
${completionData.partsUsed ? `
**PARTS USED:**
${completionData.partsUsed}` : ''}
${completionData.laborHours ? `
**LABOR HOURS:** ${completionData.laborHours}` : ''}
${completionData.additionalNotes ? `
**ADDITIONAL NOTES:**
${completionData.additionalNotes}` : ''}

---
**Completed By:** ${completedByName}
**Completed At:** ${new Date().toLocaleString()}`;

      const laborHoursNum = completionData.laborHours ? parseFloat(completionData.laborHours) : null;
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          organization_id: organizationId,
          work_order_number: workOrderNumber,
          title: `Task Feed WO: ${task.postNumber}`,
          description: fullDescription,
          status: 'completed',
          priority: 'medium',
          type: 'corrective',
          source: 'task_feed',
          source_id: task.postId,
          department: '1001',
          facility_id: facilityId || null,
          assigned_to: user?.id || null,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          actual_hours: laborHoursNum,
          completion_notes: `Work Performed: ${completionData.workPerformed}\n\nAction Taken: ${completionData.actionTaken}${completionData.rootCause ? `\n\nRoot Cause: ${completionData.rootCause}` : ''}${completionData.partsUsed && completionData.partsUsed.length > 0 ? `\n\nParts Used: ${JSON.stringify(completionData.partsUsed)}` : ''}`,
          attachments: completionData.completionPhotos.length > 0 ? completionData.completionPhotos : [],
        })
        .select('id, work_order_number')
        .single();

      if (error) {
        console.error('[CMMS] Error creating work order:', error.message || error.code || 'Unknown error');
        console.error('[CMMS] Error details:', error.details || 'No details');
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('work_orders')
          .insert({
            organization_id: organizationId,
            work_order_number: workOrderNumber,
            title: `Task Feed WO: ${task.postNumber}`,
            description: fullDescription,
            status: 'completed',
            priority: 'medium',
            source: 'task_feed',
            source_id: task.postId,
            department: '1001',
            facility_id: facilityId || null,
            completed_at: new Date().toISOString(),
          })
          .select('id, work_order_number')
          .single();

        if (fallbackError) {
          console.error('[CMMS] Fallback also failed:', fallbackError.message);
          return null;
        }

        console.log('[CMMS] Work order created (fallback):', fallbackData.work_order_number);
        return fallbackData.id;
      }

      console.log('[CMMS] Full work order created:', data.work_order_number);
      return data.id;
    } catch (err: any) {
      console.error('[CMMS] Exception creating work order:', err?.message || 'Unknown exception');
      return null;
    }
  }, [organizationId, facilityId, user]);

  // Create an OPEN work order from Task Feed and return its ID
  // Tech will use the full WorkOrderDetail screen to complete it
  const handleCreateOpenWorkOrder = useCallback(async (
    task: TaskFeedDepartmentTask & { post?: { template_name?: string } }
  ): Promise<string | null> => {
    try {
      if (!organizationId) {
        console.warn('[CMMS] No organization ID available');
        return null;
      }

      const workOrderNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
      const createdByName = user ? `${user.first_name} ${user.last_name}` : 'System';

      const description = `**Source:** Task Feed - ${task.postNumber}\n**Department:** ${task.departmentName || 'Maintenance'}\n**Created by:** ${createdByName}`;

      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          organization_id: organizationId,
          work_order_number: workOrderNumber,
          title: `[${task.postNumber}] ${task.post?.template_name || 'Work Order'}`,
          description,
          status: 'open',
          priority: 'medium',
          type: 'corrective',
          source: 'task_feed',
          source_id: task.postId,
          department: '1001',
          department_name: 'Maintenance',
          facility_id: facilityId || null,
          assigned_to: user?.id || null,
          assigned_name: createdByName,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          safety: {
            lotoRequired: false,
            lotoSteps: [],
            permits: [],
            permitNumbers: {},
            permitExpiry: {},
            ppeRequired: [],
          },
          tasks: [],
          attachments: [],
        })
        .select('id, work_order_number')
        .single();

      if (error) {
        console.error('[CMMS] Error creating open WO:', error);
        return null;
      }

      console.log('[CMMS] Created open work order:', data.work_order_number, data.id);
      return data.id;
    } catch (err) {
      console.error('[CMMS] Error in handleCreateOpenWorkOrder:', err);
      return null;
    }
  }, [organizationId, facilityId, user]);

  const handleTaskCompleted = useCallback((task: TaskFeedDepartmentTask, moduleHistoryId?: string) => {
    console.log('[CMMS] Task completed:', task.postNumber, 'History ID:', moduleHistoryId);
    refetchWO();
  }, [refetchWO]);

  const hasError = woError || eqError || pmError;
  const errorMessage = woError?.message || eqError?.message || pmError?.message || 'Unknown error';

  if (isLoading && workOrders.length === 0 && !hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading CMMS data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasError && workOrders.length === 0 && equipment.length === 0 && pmSchedules.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load Data</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{errorMessage}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Critical Alerts Banner */}
        {(woStats.critical > 0 || equipmentStats.down > 0) && (
          <Pressable
            style={[styles.alertBanner, { backgroundColor: '#DC262615', borderColor: '#DC2626' }]}
            onPress={() => handleFormPress('/cmms/workorders')}
          >
            <View style={styles.alertBannerContent}>
              <AlertOctagon size={20} color="#DC2626" />
              <View style={styles.alertBannerText}>
                <Text style={[styles.alertBannerTitle, { color: '#DC2626' }]}>Attention Required</Text>
                <Text style={[styles.alertBannerDesc, { color: colors.textSecondary }]}>
                  {woStats.critical > 0 && `${woStats.critical} critical WO${woStats.critical > 1 ? 's' : ''}`}
                  {woStats.critical > 0 && equipmentStats.down > 0 && ' • '}
                  {equipmentStats.down > 0 && `${equipmentStats.down} equipment down`}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#DC2626" />
          </Pressable>
        )}

        {/* KPI Dashboard */}
        <View style={styles.kpiSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Metrics</Text>
            <Pressable onPress={() => handleFormPress('/cmms/kpidashboard')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
            <View style={styles.kpiRow}>
              {Object.entries(kpis).map(([key, kpi]) => (
                <View key={key} style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{kpi.label}</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={[styles.kpiValue, { color: colors.text }]}>{kpi.value}</Text>
                    <Text style={[styles.kpiUnit, { color: colors.textSecondary }]}>{kpi.unit}</Text>
                  </View>
                  <View style={styles.kpiTrendRow}>
                    {kpi.trend > 0 ? (
                      <TrendingUp size={12} color="#10B981" />
                    ) : (
                      <TrendingDown size={12} color="#EF4444" />
                    )}
                    <Text style={[styles.kpiTrend, { color: kpi.trend > 0 ? '#10B981' : '#EF4444' }]}>
                      {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Work Order Status Overview */}
        <View style={[styles.statusOverview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>Work Order Status</Text>
            <Pressable onPress={() => handleFormPress('/cmms/workorders')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.statusGrid}>
            <Pressable 
              style={[styles.statusItem, { backgroundColor: '#3B82F615' }]}
              onPress={() => handleFormPress('/cmms/workorders')}
            >
              <Clock size={18} color="#3B82F6" />
              <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.open}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Open</Text>
            </Pressable>
            <Pressable 
              style={[styles.statusItem, { backgroundColor: '#F59E0B15' }]}
              onPress={() => handleFormPress('/cmms/workorders')}
            >
              <PlayCircle size={18} color="#F59E0B" />
              <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.inProgress}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>In Progress</Text>
            </Pressable>
            <Pressable 
              style={[styles.statusItem, { backgroundColor: '#EF444415' }]}
              onPress={() => handleFormPress('/cmms/workorders')}
            >
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.overdue}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Overdue</Text>
            </Pressable>
            <Pressable 
              style={[styles.statusItem, { backgroundColor: '#10B98115' }]}
              onPress={() => handleFormPress('/cmms/wohistory')}
            >
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={[styles.statusValue, { color: colors.text }]}>{woStats.completed}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Completed</Text>
            </Pressable>
          </View>
        </View>

        {/* Equipment Health & PM Status Row */}
        <View style={styles.dualCardRow}>
          <View style={[styles.halfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.halfCardHeader}>
              <Cog size={16} color="#8B5CF6" />
              <Text style={[styles.halfCardTitle, { color: colors.text }]}>Equipment</Text>
            </View>
            <View style={styles.halfCardContent}>
              <View style={styles.healthBar}>
                <View style={[styles.healthSegment, { backgroundColor: '#10B981', flex: equipmentStats.operational }]} />
                <View style={[styles.healthSegment, { backgroundColor: '#F59E0B', flex: equipmentStats.maintenance }]} />
                <View style={[styles.healthSegment, { backgroundColor: '#EF4444', flex: equipmentStats.down || 0.01 }]} />
              </View>
              <View style={styles.healthLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{equipmentStats.operational} Up</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{equipmentStats.down} Down</Text>
                </View>
              </View>
              <Text style={[styles.uptimeText, { color: colors.text }]}>
                <Text style={styles.uptimeValue}>{equipmentStats.uptimeRate}%</Text> Uptime
              </Text>
            </View>
          </View>

          <View style={[styles.halfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.halfCardHeader}>
              <CalendarClock size={16} color="#10B981" />
              <Text style={[styles.halfCardTitle, { color: colors.text }]}>PM Status</Text>
            </View>
            <View style={styles.halfCardContent}>
              <View style={styles.pmCircle}>
                <Text style={[styles.pmCircleValue, { color: '#10B981' }]}>{pmStats.complianceRate}%</Text>
                <Text style={[styles.pmCircleLabel, { color: colors.textSecondary }]}>Compliance</Text>
              </View>
              <View style={styles.pmStats}>
                <View style={styles.pmStatRow}>
                  <Text style={[styles.pmStatValue, { color: colors.text }]}>{pmStats.scheduled}</Text>
                  <Text style={[styles.pmStatLabel, { color: colors.textSecondary }]}>Scheduled</Text>
                </View>
                <View style={styles.pmStatRow}>
                  <Text style={[styles.pmStatValue, { color: pmStats.overdue > 0 ? '#EF4444' : colors.text }]}>{pmStats.overdue}</Text>
                  <Text style={[styles.pmStatLabel, { color: colors.textSecondary }]}>Overdue</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <TaskFeedInbox
          departmentCode="1001"
          moduleColor="#3B82F6"
          onTaskCompleted={handleTaskCompleted}
          createFullWorkOrder={handleCreateFullWorkOrder}
          createOpenWorkOrder={handleCreateOpenWorkOrder}
          requiresFullWorkOrder={true}
          maxVisible={3}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleFormPress(action.route)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                    <IconComponent size={22} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Upcoming PMs */}
        <View style={[styles.upcomingSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Calendar size={18} color="#10B981" />
              <Text style={[styles.sectionTitleInline, { color: colors.text }]}>Upcoming PMs</Text>
            </View>
            <Pressable onPress={() => handleFormPress('/cmms/pmcalendar')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Calendar</Text>
            </Pressable>
          </View>
          {upcomingPMs.map((pm, index) => (
            <Pressable
              key={pm.id}
              style={[styles.upcomingItem, index < upcomingPMs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => handleFormPress('/cmms/pmschedule')}
            >
              <View style={[styles.dueBadge, { backgroundColor: getPriorityColor(pm.priority) + '20' }]}>
                <Text style={[styles.dueBadgeText, { color: getPriorityColor(pm.priority) }]}>
                  {pm.daysUntil === 0 ? 'Today' : pm.daysUntil === 1 ? 'Tomorrow' : pm.daysUntil < 0 ? `${Math.abs(pm.daysUntil)} days ago` : `${pm.daysUntil} days`}
                </Text>
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={[styles.upcomingName, { color: colors.text }]}>{pm.name}</Text>
                <Text style={[styles.upcomingEquipment, { color: colors.textSecondary }]}>{pm.equipment}</Text>
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={[styles.activitySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Activity size={18} color="#3B82F6" />
              <Text style={[styles.sectionTitleInline, { color: colors.text }]}>Recent Activity</Text>
            </View>
            <Pressable onPress={() => setShowAllActivity(!showAllActivity)}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                {showAllActivity ? 'Show Less' : 'Show All'}
              </Text>
            </Pressable>
          </View>
          {(showAllActivity ? recentActivity : recentActivity.slice(0, 4)).map((activity, index) => {
            const IconComponent = getActivityIcon(activity.type);
            const iconColor = getActivityColor(activity.type, activity.priority);
            return (
              <View
                key={activity.id}
                style={[styles.activityItem, index < (showAllActivity ? recentActivity.length : 4) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <View style={[styles.activityIcon, { backgroundColor: iconColor + '15' }]}>
                  <IconComponent size={16} color={iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                  <Text style={[styles.activityDesc, { color: colors.textSecondary }]}>{activity.description}</Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{activity.time}</Text>
              </View>
            );
          })}
        </View>

        {/* CMMS Modules */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>CMMS Modules</Text>

        {CMMS_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <View key={category.id} style={styles.categoryContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.categoryHeader,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                onPress={() => toggleCategory(category.id)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                    <IconComponent size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryTitleContainer}>
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                      {category.forms.length} modules
                    </Text>
                  </View>
                </View>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </Pressable>
              
              {isExpanded && (
                <View style={[styles.formsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {category.forms.map((form, index) => (
                    <Pressable
                      key={form.id}
                      style={({ pressed }) => [
                        styles.formItem,
                        index < category.forms.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handleFormPress(form.route)}
                    >
                      <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  alertBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertBannerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 12,
  },
  alertBannerText: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  alertBannerDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  kpiSection: {
    marginBottom: 16,
  },
  kpiScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  kpiRow: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingRight: 16,
  },
  kpiCard: {
    width: 110,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  kpiValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 2,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  kpiUnit: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  kpiTrendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 6,
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  sectionTitleInline: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  statusOverview: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  statusGrid: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  dualCardRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  halfCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  halfCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  halfCardContent: {
    alignItems: 'center' as const,
  },
  healthBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    flexDirection: 'row' as const,
    overflow: 'hidden' as const,
  },
  healthSegment: {
    height: '100%',
  },
  healthLegend: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  uptimeText: {
    fontSize: 12,
    marginTop: 8,
  },
  uptimeValue: {
    fontWeight: '700' as const,
    fontSize: 16,
  },
  pmCircle: {
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  pmCircleValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  pmCircleLabel: {
    fontSize: 11,
  },
  pmStats: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  pmStatRow: {
    alignItems: 'center' as const,
  },
  pmStatValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pmStatLabel: {
    fontSize: 10,
  },
  quickActionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  quickActionCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  upcomingSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  upcomingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    gap: 12,
  },
  dueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center' as const,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  upcomingEquipment: {
    fontSize: 12,
    marginTop: 2,
  },
  activitySection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  activityDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
  },
  formsContainer: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  formItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 8,
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
