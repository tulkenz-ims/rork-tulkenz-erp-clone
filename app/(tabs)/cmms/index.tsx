import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock, AlertTriangle, ChevronRight, ChevronDown, ChevronUp,
  Cog, Calendar, Package, ClipboardList, ShieldCheck, BarChart3,
  Truck, CalendarClock, AlertCircle, TrendingUp, TrendingDown,
  Activity, CheckCircle2, PlayCircle, Zap, Plus, AlertOctagon,
  Inbox, Wrench, Building2, Factory,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useWorkOrdersQuery, useWorkOrderMetrics } from '@/hooks/useSupabaseWorkOrders';
import { useEquipmentQuery, useEquipmentMetrics } from '@/hooks/useSupabaseEquipment';
import { usePMSchedulesQuery, usePMScheduleMetrics } from '@/hooks/useSupabasePMSchedules';
import { usePMWorkOrdersQuery } from '@/hooks/useSupabasePMWorkOrders';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { supabase } from '@/lib/supabase';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

// ── Department codes ───────────────────────────────────────────
const DEPT = {
  MAINTENANCE:            '1001',
  PRODUCTION_MAINTENANCE: '1001P',
  FACILITY_MAINTENANCE:   '1001F',
};

// ── Production location codes (determines routing) ─────────────
const PRODUCTION_LOCATION_CODES = ['PR1','PR2','PA1','PO1','PO2','PO3','PW1','BB1','SB1'];

const CMMS_CATEGORIES = [
  { id: 'workorders',  title: 'Work Order Management',   icon: ClipboardList,  color: '#3B82F6', forms: [
    { id: 'workorders',    title: 'All Work Orders',         route: '/cmms/workorders'    },
    { id: 'newworkorder',  title: 'Create New Work Order',   route: '/cmms/newworkorder'  },
    { id: 'correctivemo',  title: 'Corrective Maintenance',  route: '/cmms/correctivemo'  },
    { id: 'wohistory',     title: 'Work Order History',      route: '/cmms/wohistory'     },
  ]},
  { id: 'preventive',  title: 'Preventive Maintenance',  icon: CalendarClock,  color: '#10B981', forms: [
    { id: 'pmschedule',    title: 'PM Schedule',             route: '/cmms/pmschedule'    },
    { id: 'pmcalendar',    title: 'PM Calendar',             route: '/cmms/pmcalendar'    },
    { id: 'pmtasks',       title: 'PM Task Library',         route: '/cmms/pmtasks'       },
    { id: 'pmtemplates',   title: 'PM Templates',            route: '/cmms/pmtemplates'   },
  ]},
  { id: 'equipment',   title: 'Equipment Management',    icon: Cog,            color: '#8B5CF6', forms: [
    { id: 'equipmentlist',      title: 'Equipment List',       route: '/cmms/equipmentlist'      },
    { id: 'equipmentregistry',  title: 'Equipment Registry',   route: '/cmms/equipmentregistry'  },
    { id: 'equipmenthierarchy', title: 'Equipment Hierarchy',  route: '/cmms/equipmenthierarchy' },
    { id: 'equipmenthistory',   title: 'Equipment History',    route: '/cmms/equipmenthistory'   },
    { id: 'equipmentdowntime',  title: 'Equipment Downtime',   route: '/cmms/equipmentdowntime'  },
  ]},
  { id: 'mroinventory', title: 'MRO Parts',              icon: Package,        color: '#EC4899', forms: [
    { id: 'partslist',   title: 'MRO Parts & Supplies',   route: '/cmms/partslist'  },
    { id: 'whereused',   title: 'Where-Used Analysis',    route: '/cmms/whereused'  },
    { id: 'stocklevels', title: 'MRO Stock Levels',       route: '/cmms/stocklevels'},
  ]},
  { id: 'vendors',     title: 'Vendors',                 icon: Truck,          color: '#0891B2', forms: [
    { id: 'vendorlist',  title: 'Vendor List',            route: '/cmms/vendorlist' },
  ]},
  { id: 'failure',     title: 'Failure Analysis',        icon: AlertCircle,    color: '#EF4444', forms: [
    { id: 'failurecodes',       title: 'Failure Codes',         route: '/cmms/failurecodes'       },
    { id: 'failureanalysis',    title: 'Failure Analysis',      route: '/cmms/failureanalysis'    },
    { id: 'rootcauseanalysis',  title: 'Root Cause Analysis',   route: '/cmms/rootcauseanalysis'  },
    { id: 'mtbfanalysis',       title: 'MTBF Analysis',         route: '/cmms/mtbfanalysis'       },
    { id: 'mttranalysis',       title: 'MTTR Analysis',         route: '/cmms/mttranalysis'       },
  ]},
  { id: 'safety',      title: 'Safety & Compliance',     icon: ShieldCheck,    color: '#DC2626', forms: [
    { id: 'lotoprocedures',       title: 'LOTO Procedures',         route: '/cmms/lotoprocedures'       },
    { id: 'safetypermits',        title: 'Safety Permits',          route: '/cmms/safetypermits'        },
    { id: 'pperequirements',      title: 'PPE Requirements',        route: '/cmms/pperequirements'      },
    { id: 'safetychecklist',      title: 'Safety Checklist',        route: '/cmms/safetychecklist'      },
    { id: 'hazardassessment',     title: 'Hazard Assessment',       route: '/cmms/hazardassessment'     },
    { id: 'regulatorycompliance', title: 'Regulatory Compliance',   route: '/cmms/regulatorycompliance' },
  ]},
  { id: 'reports',     title: 'Reports & Analytics',     icon: BarChart3,      color: '#7C3AED', forms: [
    { id: 'kpidashboard',  title: 'KPI Dashboard',    route: '/cmms/kpidashboard'  },
    { id: 'downtimereport',title: 'Downtime Report',  route: '/cmms/downtimereport'},
  ]},
];

export default function CMMSScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing]             = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllActivity, setShowAllActivity]   = useState(false);

  const { data: workOrders = [],  isLoading: woLoading,  error: woError,  refetch: refetchWO  } = useWorkOrdersQuery();
  const { data: equipment = [],   isLoading: eqLoading,  error: eqError,  refetch: refetchEq  } = useEquipmentQuery();
  const { data: pmSchedules = [], isLoading: pmLoading,  error: pmError,  refetch: refetchPM  } = usePMSchedulesQuery({ active: true });
  const { data: pmWorkOrders = [],                                         refetch: refetchPMWO} = usePMWorkOrdersQuery();
  const { data: woMetrics,                                                 refetch: refetchWOMetrics } = useWorkOrderMetrics();
  const { data: eqMetrics,                                                 refetch: refetchEqMetrics } = useEquipmentMetrics();
  const { data: pmMetrics,                                                 refetch: refetchPMMetrics } = usePMScheduleMetrics();

  const isLoading = woLoading || eqLoading || pmLoading;
  const hasError  = woError || eqError || pmError;

  const orgContext     = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const facilityId     = orgContext?.facilityId     || '';
  const { user }       = useUser();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWO(), refetchEq(), refetchPM(), refetchPMWO(), refetchWOMetrics(), refetchEqMetrics(), refetchPMMetrics()]);
    setRefreshing(false);
  }, [refetchWO, refetchEq, refetchPM, refetchPMWO, refetchWOMetrics, refetchEqMetrics, refetchPMMetrics]);

  const handleFormPress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }, [router]);

  const toggleCategory = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Stats ──────────────────────────────────────────────────
  const woStats = useMemo(() => {
    if (woMetrics) return { open: woMetrics.open, inProgress: woMetrics.inProgress, completed: woMetrics.completed, overdue: woMetrics.overdue, critical: workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed').length };
    const today = new Date().toISOString().split('T')[0];
    return {
      open:       workOrders.filter(wo => wo.status === 'open').length,
      inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
      completed:  workOrders.filter(wo => wo.status === 'completed').length,
      overdue:    workOrders.filter(wo => ['open','in_progress'].includes(wo.status||'') && wo.due_date && wo.due_date < today).length,
      critical:   workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed').length,
    };
  }, [workOrders, woMetrics]);

  const pmStats = useMemo(() => {
    if (pmMetrics) return { scheduled: pmMetrics.active||0, overdue: pmMetrics.overdue||0, completed: pmMetrics.completedThisMonth||0, complianceRate: pmMetrics.complianceRate||100 };
    const today = new Date().toISOString().split('T')[0];
    const total = pmSchedules.length;
    const overdue = pmSchedules.filter(pm => pm.active && pm.next_due < today).length;
    return { scheduled: pmSchedules.filter(pm => pm.active).length, overdue, completed: pmSchedules.filter(pm => pm.last_completed).length, complianceRate: total > 0 ? Math.round(((total-overdue)/total)*100) : 100 };
  }, [pmSchedules, pmMetrics]);

  const equipmentStats = useMemo(() => {
    if (eqMetrics) return { operational: eqMetrics.operational, down: eqMetrics.down, maintenance: eqMetrics.needsMaintenance, total: eqMetrics.total, uptimeRate: eqMetrics.total > 0 ? Math.round((eqMetrics.operational/eqMetrics.total)*100) : 100 };
    const operational = equipment.filter(e => e.status === 'operational').length;
    const down = equipment.filter(e => e.status === 'down').length;
    const total = equipment.length;
    return { operational, down, maintenance: equipment.filter(e => e.status === 'needs_maintenance').length, total, uptimeRate: total > 0 ? Math.round((operational/total)*100) : 100 };
  }, [equipment, eqMetrics]);

  const upcomingPMs = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return pmSchedules
      .filter(pm => pm.active && pm.next_due)
      .map(pm => {
        const due = new Date(pm.next_due); due.setHours(0,0,0,0);
        const daysUntil = Math.ceil((due.getTime()-today.getTime())/(1000*60*60*24));
        return { id: pm.id, name: pm.name, equipment: pm.equipment_name||'Unknown', dueDate: pm.next_due, daysUntil, priority: (pm.priority||'medium') as string };
      })
      .filter(pm => !isNaN(pm.daysUntil) && pm.daysUntil >= -7 && pm.daysUntil <= 14)
      .sort((a,b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);
  }, [pmSchedules]);

  const getPriorityColor = (p: string) => ({ critical:'#DC2626', high:'#F59E0B', medium:'#3B82F6', low:'#10B981' }[p] || '#6B7280');

  // ── Work order creation helpers (unchanged from original) ──
  const handleCreateFullWorkOrder = useCallback(async (task: TaskFeedDepartmentTask, completionData: any): Promise<string|null> => {
    try {
      if (!organizationId) return null;
      const woNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase.from('work_orders').insert({
        organization_id: organizationId, work_order_number: woNumber,
        title: `Task Feed WO: ${task.postNumber}`, description: `Source: Task Feed - ${task.postNumber}\n\nWork Performed: ${completionData.workPerformed}\n\nAction Taken: ${completionData.actionTaken}`,
        status: 'completed', priority: 'medium', type: 'corrective', source: 'task_feed', source_id: task.postId,
        department: DEPT.MAINTENANCE, facility_id: facilityId||null, assigned_to: user?.id||null,
        completed_at: new Date().toISOString(), actual_hours: completionData.laborHours ? parseFloat(completionData.laborHours) : null,
      }).select('id').single();
      if (error) return null;
      return data.id;
    } catch { return null; }
  }, [organizationId, facilityId, user]);

  const handleCreateOpenWorkOrder = useCallback(async (task: TaskFeedDepartmentTask & { post?: any }): Promise<string|null> => {
    try {
      if (!organizationId) return null;
      const woNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase.from('work_orders').insert({
        organization_id: organizationId, work_order_number: woNumber,
        title: `[${task.postNumber}] ${task.post?.template_name||'Work Order'}`, equipment: 'N/A',
        description: `Source: Task Feed - ${task.postNumber}`,
        status: 'open', priority: 'medium', type: 'corrective', source: 'request', source_id: task.postId,
        department: DEPT.MAINTENANCE, department_name: 'Maintenance', facility_id: facilityId||null,
        assigned_to: user?.id||null, due_date: new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0],
        safety: {}, tasks: [], attachments: [],
      }).select('id').single();
      if (error) return null;
      return data.id;
    } catch { return null; }
  }, [organizationId, facilityId, user]);

  const handleTaskCompleted = useCallback((task: TaskFeedDepartmentTask) => { refetchWO(); }, [refetchWO]);

  if (isLoading && workOrders.length === 0 && !hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left','right']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading CMMS...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left','right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Critical Alert Banner ──────────────────────────── */}
        {(woStats.critical > 0 || equipmentStats.down > 0) && (
          <Pressable style={[styles.alertBanner, { backgroundColor: '#DC262615', borderColor: '#DC2626' }]} onPress={() => handleFormPress('/cmms/workorders')}>
            <AlertOctagon size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#DC2626' }]}>Attention Required</Text>
              <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
                {woStats.critical > 0 && `${woStats.critical} critical WO${woStats.critical > 1 ? 's' : ''}`}
                {woStats.critical > 0 && equipmentStats.down > 0 && ' · '}
                {equipmentStats.down > 0 && `${equipmentStats.down} equipment down`}
              </Text>
            </View>
            <ChevronRight size={18} color="#DC2626" />
          </Pressable>
        )}

        {/* ── Work Order Status ──────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Work Order Status</Text>
            <Pressable onPress={() => handleFormPress('/cmms/workorders')}>
              <Text style={[styles.linkText, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.statusGrid}>
            {[
              { label: 'Open',        value: woStats.open,       color: '#3B82F6', icon: Clock        },
              { label: 'In Progress', value: woStats.inProgress, color: '#F59E0B', icon: PlayCircle   },
              { label: 'Overdue',     value: woStats.overdue,    color: '#EF4444', icon: AlertTriangle },
              { label: 'Completed',   value: woStats.completed,  color: '#10B981', icon: CheckCircle2 },
            ].map(s => {
              const Icon = s.icon;
              return (
                <Pressable key={s.label} style={[styles.statusTile, { backgroundColor: s.color + '15' }]} onPress={() => handleFormPress('/cmms/workorders')}>
                  <Icon size={18} color={s.color} />
                  <Text style={[styles.statusValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Equipment & PM row ─────────────────────────────── */}
        <View style={styles.dualRow}>
          <View style={[styles.halfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.halfCardHeader}><Cog size={15} color="#8B5CF6" /><Text style={[styles.halfCardTitle, { color: colors.text }]}>Equipment</Text></View>
            <View style={styles.healthBar}>
              <View style={[styles.healthSeg, { backgroundColor: '#10B981', flex: equipmentStats.operational }]} />
              <View style={[styles.healthSeg, { backgroundColor: '#F59E0B', flex: equipmentStats.maintenance }]} />
              <View style={[styles.healthSeg, { backgroundColor: '#EF4444', flex: Math.max(equipmentStats.down, 0.01) }]} />
            </View>
            <View style={styles.healthLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10B981' }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>{equipmentStats.operational} Up</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>{equipmentStats.down} Down</Text></View>
            </View>
            <Text style={[styles.uptimeText, { color: colors.text }]}><Text style={{ fontWeight: '700', fontSize: 16 }}>{equipmentStats.uptimeRate}%</Text> Uptime</Text>
          </View>
          <View style={[styles.halfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.halfCardHeader}><CalendarClock size={15} color="#10B981" /><Text style={[styles.halfCardTitle, { color: colors.text }]}>PM Status</Text></View>
            <Text style={[styles.pmBigNum, { color: '#10B981' }]}>{pmStats.complianceRate}%</Text>
            <Text style={[styles.pmBigLabel, { color: colors.textSecondary }]}>Compliance</Text>
            <View style={styles.pmRow}>
              <View style={styles.pmStat}><Text style={[styles.pmStatVal, { color: colors.text }]}>{pmStats.scheduled}</Text><Text style={[styles.pmStatLbl, { color: colors.textSecondary }]}>Scheduled</Text></View>
              <View style={styles.pmStat}><Text style={[styles.pmStatVal, { color: pmStats.overdue > 0 ? '#EF4444' : colors.text }]}>{pmStats.overdue}</Text><Text style={[styles.pmStatLbl, { color: colors.textSecondary }]}>Overdue</Text></View>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════ */}
        {/* PRODUCTION MAINTENANCE INBOX                          */}
        {/* dept 1001P — production floor equipment only          */}
        {/* ══════════════════════════════════════════════════════ */}
        <View style={[styles.deptSection, { borderColor: '#F59E0B40', backgroundColor: '#F59E0B08' }]}>
          <View style={styles.deptSectionHeader}>
            <View style={[styles.deptIcon, { backgroundColor: '#F59E0B20' }]}>
              <Factory size={16} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deptSectionTitle, { color: '#F59E0B' }]}>Production Maintenance</Text>
              <Text style={[styles.deptSectionSub, { color: colors.textSecondary }]}>
                PR1 · PR2 · PA1 · PO1–3 · PW1 · BB1 · SB1
              </Text>
            </View>
            <Pressable onPress={() => handleFormPress('/cmms/workorders')}>
              <Text style={[styles.linkText, { color: '#F59E0B' }]}>All WOs</Text>
            </Pressable>
          </View>
          <View style={styles.twoPaneRow}>
            <View style={[styles.pane, { borderColor: '#EF444430' }]}>
              <View style={[styles.paneHeader, { backgroundColor: '#EF444412' }]}>
                <AlertTriangle size={14} color="#EF4444" />
                <Text style={[styles.paneHeaderText, { color: '#EF4444' }]}>Reactive</Text>
              </View>
              <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <TaskFeedInbox
                  departmentCode={DEPT.PRODUCTION_MAINTENANCE}
                  moduleColor="#EF4444"
                  workOrderTypeFilter="reactive"
                  onTaskCompleted={handleTaskCompleted}
                  createFullWorkOrder={handleCreateFullWorkOrder}
                  createOpenWorkOrder={handleCreateOpenWorkOrder}
                  requiresFullWorkOrder
                  maxVisible={20}
                  showHeader={false}
                />
              </ScrollView>
            </View>
            <View style={[styles.pane, { borderColor: '#F59E0B30' }]}>
              <View style={[styles.paneHeader, { backgroundColor: '#F59E0B12' }]}>
                <Wrench size={14} color="#F59E0B" />
                <Text style={[styles.paneHeaderText, { color: '#F59E0B' }]}>Preventive</Text>
              </View>
              <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <TaskFeedInbox
                  departmentCode={DEPT.PRODUCTION_MAINTENANCE}
                  moduleColor="#F59E0B"
                  workOrderTypeFilter="preventive"
                  onTaskCompleted={handleTaskCompleted}
                  createFullWorkOrder={handleCreateFullWorkOrder}
                  createOpenWorkOrder={handleCreateOpenWorkOrder}
                  requiresFullWorkOrder
                  maxVisible={20}
                  showHeader={false}
                />
              </ScrollView>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════ */}
        {/* FACILITY MAINTENANCE INBOX                            */}
        {/* dept 1001F — building systems, service requests       */}
        {/* ══════════════════════════════════════════════════════ */}
        <View style={[styles.deptSection, { borderColor: '#3B82F640', backgroundColor: '#3B82F608' }]}>
          <View style={styles.deptSectionHeader}>
            <View style={[styles.deptIcon, { backgroundColor: '#3B82F620' }]}>
              <Building2 size={16} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deptSectionTitle, { color: '#3B82F6' }]}>Facility Maintenance</Text>
              <Text style={[styles.deptSectionSub, { color: colors.textSecondary }]}>
                Building systems · Service requests · Non-production assets
              </Text>
            </View>
            <Pressable onPress={() => handleFormPress('/cmms/workorders')}>
              <Text style={[styles.linkText, { color: '#3B82F6' }]}>All WOs</Text>
            </Pressable>
          </View>
          <View style={styles.twoPaneRow}>
            <View style={[styles.pane, { borderColor: '#EF444430' }]}>
              <View style={[styles.paneHeader, { backgroundColor: '#EF444412' }]}>
                <AlertTriangle size={14} color="#EF4444" />
                <Text style={[styles.paneHeaderText, { color: '#EF4444' }]}>Reactive</Text>
              </View>
              <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <TaskFeedInbox
                  departmentCode={DEPT.FACILITY_MAINTENANCE}
                  moduleColor="#EF4444"
                  workOrderTypeFilter="reactive"
                  onTaskCompleted={handleTaskCompleted}
                  createFullWorkOrder={handleCreateFullWorkOrder}
                  createOpenWorkOrder={handleCreateOpenWorkOrder}
                  requiresFullWorkOrder
                  maxVisible={20}
                  showHeader={false}
                />
              </ScrollView>
            </View>
            <View style={[styles.pane, { borderColor: '#3B82F630' }]}>
              <View style={[styles.paneHeader, { backgroundColor: '#3B82F612' }]}>
                <Wrench size={14} color="#3B82F6" />
                <Text style={[styles.paneHeaderText, { color: '#3B82F6' }]}>Preventive</Text>
              </View>
              <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <TaskFeedInbox
                  departmentCode={DEPT.FACILITY_MAINTENANCE}
                  moduleColor="#3B82F6"
                  workOrderTypeFilter="preventive"
                  onTaskCompleted={handleTaskCompleted}
                  createFullWorkOrder={handleCreateFullWorkOrder}
                  createOpenWorkOrder={handleCreateOpenWorkOrder}
                  requiresFullWorkOrder
                  maxVisible={20}
                  showHeader={false}
                />
              </ScrollView>
            </View>
          </View>
        </View>

        {/* ── Upcoming PMs ───────────────────────────────────── */}
        {upcomingPMs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}><Calendar size={16} color="#10B981" /><Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming PMs</Text></View>
              <Pressable onPress={() => handleFormPress('/cmms/pmcalendar')}><Text style={[styles.linkText, { color: colors.primary }]}>Calendar</Text></Pressable>
            </View>
            {upcomingPMs.map((pm, i) => (
              <Pressable key={pm.id} style={[styles.pmRow2, i < upcomingPMs.length-1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => handleFormPress('/cmms/pmschedule')}>
                <View style={[styles.dueBadge, { backgroundColor: getPriorityColor(pm.priority) + '20' }]}>
                  <Text style={[styles.dueBadgeText, { color: getPriorityColor(pm.priority) }]}>
                    {pm.daysUntil === 0 ? 'Today' : pm.daysUntil === 1 ? 'Tomorrow' : pm.daysUntil < 0 ? `${Math.abs(pm.daysUntil)}d ago` : `${pm.daysUntil}d`}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pmName, { color: colors.text }]}>{pm.name}</Text>
                  <Text style={[styles.pmEquip, { color: colors.textSecondary }]}>{pm.equipment}</Text>
                </View>
                <ChevronRight size={15} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Quick Actions ──────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Create Work Order', icon: AlertTriangle, color: '#F59E0B', route: '/(tabs)/taskfeed'    },
            { label: 'PM Schedule',       icon: Calendar,      color: '#10B981', route: '/cmms/pmschedule'    },
            { label: 'Equipment',         icon: Cog,           color: '#8B5CF6', route: '/cmms/equipmentlist' },
            { label: 'MRO Parts',         icon: Package,       color: '#EC4899', route: '/cmms/partslist'     },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <Pressable key={i} style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleFormPress(a.route)}>
                <View style={[styles.quickIcon, { backgroundColor: a.color + '18' }]}><Icon size={22} color={a.color} /></View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── CMMS Module Categories ─────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>CMMS Modules</Text>
        {CMMS_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isExpanded = expandedCategories.has(cat.id);
          return (
            <View key={cat.id} style={styles.catWrap}>
              <Pressable style={[styles.catHeader, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => toggleCategory(cat.id)}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}><Icon size={20} color={cat.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
                  <Text style={[styles.catCount, { color: colors.textSecondary }]}>{cat.forms.length} modules</Text>
                </View>
                {isExpanded ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
              </Pressable>
              {isExpanded && (
                <View style={[styles.catForms, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {cat.forms.map((f, i) => (
                    <Pressable key={f.id} style={[styles.formRow, i < cat.forms.length-1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => handleFormPress(f.route)}>
                      <Text style={[styles.formTitle, { color: colors.text }]}>{f.title}</Text>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  scroll:     { flex: 1 },
  content:    { padding: 16, gap: 12 },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:{ fontSize: 14, fontWeight: '500' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  alertTitle:  { fontSize: 14, fontWeight: '600' },
  alertSub:    { fontSize: 12, marginTop: 2 },

  card:       { borderRadius: 12, padding: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:  { fontSize: 15, fontWeight: '600' },
  linkText:   { fontSize: 13, fontWeight: '500' },

  statusGrid: { flexDirection: 'row', gap: 8 },
  statusTile: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10 },
  statusValue:{ fontSize: 20, fontWeight: '700', marginTop: 6 },
  statusLabel:{ fontSize: 10, fontWeight: '500', marginTop: 2 },

  dualRow:    { flexDirection: 'row', gap: 10 },
  halfCard:   { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  halfCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  halfCardTitle:  { fontSize: 13, fontWeight: '600' },
  healthBar:  { width: '100%', height: 7, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  healthSeg:  { height: '100%' },
  healthLegend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11 },
  uptimeText: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  pmBigNum:   { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  pmBigLabel: { fontSize: 11, textAlign: 'center', marginBottom: 8 },
  pmRow:      { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  pmStat:     { alignItems: 'center' },
  pmStatVal:  { fontSize: 16, fontWeight: '600' },
  pmStatLbl:  { fontSize: 10 },

  // Dept sections
  deptSection:     { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  deptSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  deptIcon:        { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  deptSectionTitle:{ fontSize: 14, fontWeight: '700' },
  deptSectionSub:  { fontSize: 10, marginTop: 2 },
  twoPaneRow:      { flexDirection: 'row', padding: 10, gap: 8 },
  pane:            { flex: 1, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  paneHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 5 },
  paneHeaderText:  { fontSize: 12, fontWeight: '700' },
  paneScroll:      { maxHeight: 340 },

  pmRow2:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  dueBadge:   { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, minWidth: 62, alignItems: 'center' },
  dueBadgeText: { fontSize: 11, fontWeight: '600' },
  pmName:     { fontSize: 13, fontWeight: '500' },
  pmEquip:    { fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard:  { width: '48%', flexGrow: 1, borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600', flex: 1 },

  catWrap:    { marginBottom: 8 },
  catHeader:  { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  catIcon:    { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catTitle:   { fontSize: 14, fontWeight: '600' },
  catCount:   { fontSize: 11, marginTop: 1 },
  catForms:   { marginTop: 4, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  formRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 },
  formTitle:  { fontSize: 13, fontWeight: '500' },
});
