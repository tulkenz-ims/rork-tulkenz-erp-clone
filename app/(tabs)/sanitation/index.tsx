import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles, Calendar, ClipboardList, CheckCircle,
  ChevronRight, Clock, TrendingUp, Bath, Coffee,
  Building2, Footprints, Trash2, Wind, Package,
  ShoppingBag, Wrench, TreePine, GraduationCap,
  FileWarning, AlertTriangle, Inbox, Zap, Factory, Droplets,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSanitationWorkOrders } from '@/hooks/useSupabaseSanitationWorkOrders';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { supabase } from '@/lib/supabase';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

// ── Department codes ───────────────────────────────────────────
const DEPT = {
  SANITATION:            '1002',
  PRODUCTION_SANITATION: '1002P',
  FACILITY_SANITATION:   '1002F',
};

const SANITATION_CATEGORIES = [
  { id: 'chemicals',          title: 'Chemicals & Supplies (6XXXXXX)',        icon: Package,        color: '#10B981', forms: [{ id: 'chemicals',       title: 'View All Chemicals & Supplies',           route: 'chemicals'           }] },
  { id: 'scheduling',         title: 'Master Sanitation Scheduling',          icon: Calendar,       color: '#8B5CF6', forms: [
    { id: 'mss',              title: 'Master Sanitation Schedule (MSS)',       route: 'mss'          },
    { id: 'dailytasks',       title: 'Daily Sanitation Task List',             route: 'dailytasks'   },
    { id: 'weeklytasks',      title: 'Weekly Sanitation Task List',            route: 'weeklytasks'  },
    { id: 'monthlytasks',     title: 'Monthly Sanitation Task List',           route: 'monthlytasks' },
    { id: 'deepclean',        title: 'Quarterly/Annual Deep Clean Schedule',   route: 'deepclean'    },
    { id: 'zonemap',          title: 'Sanitation Zone Map',                    route: 'zonemap'      },
    { id: 'crewassignment',   title: 'Sanitation Crew Assignment Log',         route: 'crewassignment'},
  ]},
  { id: 'restroom',           title: 'Restroom Sanitation',                   icon: Bath,           color: '#3B82F6', forms: [
    { id: 'restroomcleaning',   title: 'Restroom Cleaning Checklist',          route: 'restroomcleaning'   },
    { id: 'restroominspection', title: 'Restroom Inspection Log',              route: 'restroominspection' },
    { id: 'restroomdeepclean',  title: 'Restroom Deep Clean Record',           route: 'restroomdeepclean'  },
    { id: 'restroomsupply',     title: 'Restroom Supply Check Log',            route: 'restroomsupply'     },
  ]},
  { id: 'breakroom',          title: 'Break Room / Locker Room',              icon: Coffee,         color: '#F59E0B', forms: [
    { id: 'breakroomcleaning',    title: 'Break Room Cleaning Checklist',      route: 'breakroomcleaning'    },
    { id: 'breakroomfridge',      title: 'Break Room Refrigerator Cleaning',   route: 'breakroomfridge'      },
    { id: 'microwavecleaning',    title: 'Microwave/Appliance Cleaning',       route: 'microwavecleaning'    },
    { id: 'lockerroomcleaning',   title: 'Locker Room Cleaning Checklist',     route: 'lockerroomcleaning'   },
    { id: 'lockerroominspection', title: 'Locker Room Inspection Log',         route: 'lockerroominspection' },
    { id: 'vendingarea',          title: 'Vending Area Cleaning Log',          route: 'vendingarea'          },
  ]},
  { id: 'office',             title: 'Office & Common Areas',                 icon: Building2,      color: '#10B981', forms: [
    { id: 'officecleaning',    title: 'Office Cleaning Checklist',             route: 'officecleaning'    },
    { id: 'conferenceroom',    title: 'Conference Room Cleaning',              route: 'conferenceroom'    },
    { id: 'lobbycleaning',     title: 'Reception/Lobby Cleaning',              route: 'lobbycleaning'     },
    { id: 'hallwaycleaning',   title: 'Hallway/Corridor Cleaning',             route: 'hallwaycleaning'   },
    { id: 'stairwellcleaning', title: 'Stairwell Cleaning',                   route: 'stairwellcleaning' },
    { id: 'entrancecleaning',  title: 'Entrance/Exit Area Cleaning',           route: 'entrancecleaning'  },
  ]},
  { id: 'floorcare',          title: 'Floor Care',                            icon: Footprints,     color: '#EC4899', forms: [
    { id: 'floormopping',     title: 'Floor Mopping Log',                     route: 'floormopping'     },
    { id: 'floorscrubbing',   title: 'Floor Scrubbing/Buffing Schedule',      route: 'floorscrubbing'   },
    { id: 'floorwaxing',      title: 'Floor Waxing/Stripping Record',         route: 'floorwaxing'      },
    { id: 'carpetcleaning',   title: 'Carpet Cleaning/Shampooing',            route: 'carpetcleaning'   },
    { id: 'floormatcleaning', title: 'Floor Mat Cleaning/Replacement',        route: 'floormatcleaning' },
  ]},
  { id: 'waste',              title: 'Waste & Trash Management',              icon: Trash2,         color: '#6366F1', forms: [
    { id: 'trashremoval',   title: 'Trash Removal Schedule/Log',              route: 'trashremoval'   },
    { id: 'wastecontainer', title: 'Waste Container Cleaning',                route: 'wastecontainer' },
    { id: 'dumpsterarea',   title: 'Dumpster Area Sanitation',                route: 'dumpsterarea'   },
    { id: 'recyclingarea',  title: 'Recycling Area Cleaning',                 route: 'recyclingarea'  },
    { id: 'trashliner',     title: 'Trash Can Liner Replacement',             route: 'trashliner'     },
  ]},
  { id: 'window',             title: 'Window & Glass Cleaning',               icon: Wind,           color: '#0EA5E9', forms: [
    { id: 'windowcleaning',    title: 'Window Cleaning Schedule',             route: 'windowcleaning'    },
    { id: 'glasscleaning',     title: 'Interior Glass/Mirror Cleaning',       route: 'glasscleaning'     },
    { id: 'doorglasscleaning', title: 'Door Glass Cleaning',                  route: 'doorglasscleaning' },
  ]},
  { id: 'facilitysupplies',   title: 'Facility Consumable Supplies',          icon: Package,        color: '#14B8A6', forms: [
    { id: 'toiletpaperinventory',  title: 'Toilet Paper Inventory',           route: 'toiletpaperinventory'  },
    { id: 'papertowerinventory',   title: 'Paper Towel Inventory',            route: 'papertowerinventory'   },
    { id: 'handsoapinventory',     title: 'Hand Soap Inventory',              route: 'handsoapinventory'     },
    { id: 'sanitizerinventory',    title: 'Hand Sanitizer Inventory',         route: 'sanitizerinventory'    },
    { id: 'trashlinerinventory',   title: 'Trash Liner Inventory',            route: 'trashlinerinventory'   },
    { id: 'airfreshenerinventory', title: 'Air Freshener Inventory',          route: 'airfreshenerinventory' },
  ]},
  { id: 'productionsupplies', title: 'Production Consumable Supplies',        icon: ShoppingBag,    color: '#F97316', forms: [
    { id: 'gloveinventory',       title: 'Glove Inventory Log',              route: 'gloveinventory'       },
    { id: 'hairnetinventory',     title: 'Hairnet Inventory Log',            route: 'hairnetinventory'     },
    { id: 'beardnetinventory',    title: 'Beard Net Inventory',              route: 'beardnetinventory'    },
    { id: 'shoecoverinventory',   title: 'Shoe/Boot Cover Inventory',        route: 'shoecoverinventory'   },
    { id: 'towelinventory',       title: 'Towel Inventory Log',              route: 'towelinventory'       },
    { id: 'raginventory',         title: 'Rag Inventory Log',                route: 'raginventory'         },
    { id: 'aproninventory',       title: 'Apron/Smock Inventory',            route: 'aproninventory'       },
    { id: 'facemaskinventory',    title: 'Face Mask Inventory',              route: 'facemaskinventory'    },
    { id: 'consumablesreorder',   title: 'Consumables Reorder List',         route: 'consumablesreorder'   },
    { id: 'supplyroomstock',      title: 'Supply Room Stock Check',          route: 'supplyroomstock'      },
  ]},
  { id: 'equipment',          title: 'Sanitation Tools & Equipment',          icon: Wrench,         color: '#EF4444', forms: [
    { id: 'cleaningtoolinventory',  title: 'Cleaning Tool Inventory',        route: 'cleaningtoolinventory'  },
    { id: 'cleaningtoolinspection', title: 'Cleaning Tool Inspection',       route: 'cleaningtoolinspection' },
    { id: 'mopbucketreplacement',   title: 'Mop/Bucket Replacement',         route: 'mopbucketreplacement'   },
    { id: 'vacuummaintenance',      title: 'Vacuum Maintenance',             route: 'vacuummaintenance'      },
    { id: 'floorscrubberpm',        title: 'Floor Scrubber Maintenance',     route: 'floorscrubberpm'        },
    { id: 'cleaningcartinspection', title: 'Cleaning Cart Inspection',       route: 'cleaningcartinspection' },
  ]},
  { id: 'exterior',           title: 'Exterior/Grounds',                     icon: TreePine,       color: '#22C55E', forms: [
    { id: 'parkingsweeping',     title: 'Parking Lot Sweeping',              route: 'parkingsweeping'     },
    { id: 'sidewalkcleaning',    title: 'Sidewalk Cleaning',                 route: 'sidewalkcleaning'    },
    { id: 'smokingareacleaning', title: 'Smoking Area Cleaning',             route: 'smokingareacleaning' },
    { id: 'exteriortrashcan',    title: 'Exterior Trash Can Cleaning',       route: 'exteriortrashcan'    },
  ]},
  { id: 'training',           title: 'Training & Personnel',                 icon: GraduationCap,  color: '#A855F7', forms: [
    { id: 'sanitationtraining',     title: 'Sanitation Training Sign-In',   route: 'sanitationtraining'     },
    { id: 'chemicalsafetytraining', title: 'Chemical Safety Training',      route: 'chemicalsafetytraining' },
    { id: 'sanitationsop',          title: 'Sanitation SOP Acknowledgment', route: 'sanitationsop'          },
    { id: 'newhireorientation',     title: 'New Hire Sanitation Orientation',route: 'newhireorientation'     },
  ]},
  { id: 'ncr',                title: 'Non-Conformance & Corrective Action',  icon: FileWarning,    color: '#DC2626', forms: [
    { id: 'sanitationncr',       title: 'Sanitation Non-Conformance Report',route: 'sanitationncr'       },
    { id: 'sanitationcapa',      title: 'Sanitation Corrective Action',     route: 'sanitationcapa'      },
    { id: 'repeatdeficiency',    title: 'Repeat Deficiency Tracking',       route: 'repeatdeficiency'    },
    { id: 'sanitationdeviation', title: 'Sanitation Deviation Report',      route: 'sanitationdeviation' },
  ]},
];

const EMP_MODULE_LINKS = [
  { id: 'atp-log',            label: 'ATP Swab Log',             sub: 'RLU entry, pass/warn/fail',      color: '#00ff88', route: 'atp-log'            },
  { id: 'emp-map',            label: 'EMP Zone Map',             sub: 'Zone heatmap, swab schedule',   color: '#ffb800', route: 'emp-map'            },
  { id: 'microbial-log',      label: 'Microbial Test Log',       sub: 'Lab results, chain of custody', color: '#7b61ff', route: 'microbial-log'      },
  { id: 'corrective-actions', label: 'Corrective Actions',       sub: 'CAPA, Zone 1 vector swabs',     color: '#ff2d55', route: 'corrective-actions' },
  { id: 'ssop-library',       label: 'SSOP Library',             sub: 'Procedures, steps, versions',   color: '#00e5ff', route: 'ssop-library'       },
] as const;

export default function SanitationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing]         = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { workOrders, isLoading, refetch } = useSanitationWorkOrders();

  const orgContext     = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const facilityId     = orgContext?.facilityId     || '';
  const { user }       = useUser();

  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const openTasks       = workOrders.filter(wo => ['pending','in_progress','overdue'].includes(wo.status)).length;
    const completedToday  = workOrders.filter(wo => wo.status === 'completed' && wo.completed_at?.split('T')[0] === today).length;
    const pendingReview   = workOrders.filter(wo => wo.status === 'awaiting_qa').length;
    const total           = workOrders.length;
    const completed       = workOrders.filter(wo => wo.status === 'completed').length;
    const compliance      = total > 0 ? Math.round((completed/total)*100) : 100;
    return { openTasks, completedToday, pendingReview, compliance };
  }, [workOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateSanitationRecord = useCallback(async (task: TaskFeedDepartmentTask, notes: string): Promise<string|null> => {
    try {
      if (!organizationId) return null;
      const empName = user ? `${user.first_name||''} ${user.last_name||''}`.trim() : 'System';
      const { data, error } = await supabase.from('task_verifications').insert({
        organization_id: organizationId, department_code: '1002', department_name: 'Sanitation',
        facility_code: facilityId||null, category_id: 'sanitation-task-feed', category_name: 'Task Feed Completion',
        action: `Sanitation Task: ${task.postNumber}`,
        notes: `Completed from Task Feed.\n\nPost: ${task.postNumber}\nNotes: ${notes||'No additional notes'}`,
        employee_name: empName, status: 'verified', source_type: 'task_feed_completion',
        source_id: task.id, source_number: task.postNumber,
      }).select('id').single();
      if (error) return null;
      return data.id;
    } catch { return null; }
  }, [organizationId, facilityId, user]);

  const handleTaskCompleted = useCallback(() => { refetch(); }, [refetch]);

  const handleCategoryPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(expandedCategory === id ? null : id);
  }, [expandedCategory]);

  const handleFormPress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/sanitation/${route}` as any);
  }, [router]);

  const stats = [
    { label: 'Open Tasks',      value: String(dashboardStats.openTasks),      icon: ClipboardList, color: '#F59E0B' },
    { label: 'Completed Today', value: String(dashboardStats.completedToday), icon: CheckCircle,   color: '#10B981' },
    { label: 'Awaiting QA',     value: String(dashboardStats.pendingReview),  icon: Clock,         color: '#3B82F6' },
    { label: 'Compliance',      value: `${dashboardStats.compliance}%`,       icon: TrendingUp,    color: '#8B5CF6' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header Card ───────────────────────────────────── */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: '#8B5CF620' }]}>
          <Sparkles size={30} color="#8B5CF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sanitation Management</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Cleaning schedules, inspections, and consumable tracking
          </Text>
        </View>
      </View>

      {/* ── Stats strip ───────────────────────────────────── */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}><Icon size={16} color={s.color} /></View>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          );
        })}
      </View>

      {/* ════════════════════════════════════════════════════ */}
      {/* PRODUCTION SANITATION INBOX                         */}
      {/* dept 1002P — food contact surfaces, production rooms*/}
      {/* SQF critical                                        */}
      {/* ════════════════════════════════════════════════════ */}
      <View style={[styles.deptSection, { borderColor: '#10B98140', backgroundColor: '#10B98108' }]}>
        <View style={styles.deptHeader}>
          <View style={[styles.deptIcon, { backgroundColor: '#10B98120' }]}>
            <Factory size={16} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deptTitle, { color: '#10B981' }]}>Production Sanitation</Text>
            <Text style={[styles.deptSub, { color: colors.textSecondary }]}>
              Food contact · SQF critical · PR1 · PR2 · PA1 · PW1 · BB1 · SB1
            </Text>
          </View>
          <Pressable onPress={() => handleFormPress('mss')}>
            <Text style={[styles.linkText, { color: '#10B981' }]}>MSS</Text>
          </Pressable>
        </View>

        {/* EMP / Food Safety block lives here — Production Sanitation */}
        <View style={styles.empBlock}>
          <View style={styles.empBlockHeader}>
            <Zap size={14} color="#00e5ff" />
            <Text style={styles.empBlockTitle}>EMP & Food Safety Operations</Text>
            <Pressable style={styles.empDashBtn} onPress={() => handleFormPress('dashboard')}>
              <Text style={styles.empDashBtnText}>DASHBOARD</Text>
              <ChevronRight size={11} color="#020912" />
            </Pressable>
          </View>
          <View style={styles.empLinks}>
            {EMP_MODULE_LINKS.map(link => (
              <Pressable key={link.id} style={[styles.empLink, { borderLeftColor: link.color }]} onPress={() => handleFormPress(link.route)}>
                <View style={[styles.empLinkDot, { backgroundColor: link.color + '22', borderColor: link.color + '55' }]}>
                  <View style={[styles.empLinkDotInner, { backgroundColor: link.color }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empLinkLabel}>{link.label}</Text>
                  <Text style={styles.empLinkSub}>{link.sub}</Text>
                </View>
                <ChevronRight size={13} color="#3a6080" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.twoPaneRow}>
          <View style={[styles.pane, { borderColor: '#EF444430' }]}>
            <View style={[styles.paneHeader, { backgroundColor: '#EF444412' }]}>
              <AlertTriangle size={13} color="#EF4444" /><Text style={[styles.paneHeaderText, { color: '#EF4444' }]}>Reactive</Text>
            </View>
            <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <TaskFeedInbox departmentCode={DEPT.PRODUCTION_SANITATION} moduleColor="#EF4444" workOrderTypeFilter="reactive" onTaskCompleted={handleTaskCompleted} createModuleHistoryRecord={handleCreateSanitationRecord} maxVisible={20} showHeader={false} />
            </ScrollView>
          </View>
          <View style={[styles.pane, { borderColor: '#10B98130' }]}>
            <View style={[styles.paneHeader, { backgroundColor: '#10B98112' }]}>
              <Droplets size={13} color="#10B981" /><Text style={[styles.paneHeaderText, { color: '#10B981' }]}>Scheduled</Text>
            </View>
            <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <TaskFeedInbox departmentCode={DEPT.PRODUCTION_SANITATION} moduleColor="#10B981" workOrderTypeFilter="scheduled" onTaskCompleted={handleTaskCompleted} createModuleHistoryRecord={handleCreateSanitationRecord} maxVisible={20} showHeader={false} />
            </ScrollView>
          </View>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════ */}
      {/* FACILITY SANITATION INBOX                           */}
      {/* dept 1002F — restrooms, offices, common areas       */}
      {/* ════════════════════════════════════════════════════ */}
      <View style={[styles.deptSection, { borderColor: '#8B5CF640', backgroundColor: '#8B5CF608' }]}>
        <View style={styles.deptHeader}>
          <View style={[styles.deptIcon, { backgroundColor: '#8B5CF620' }]}>
            <Building2 size={16} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deptTitle, { color: '#8B5CF6' }]}>Facility Sanitation</Text>
            <Text style={[styles.deptSub, { color: colors.textSecondary }]}>
              Restrooms · Offices · Common areas · Grounds · Building 2
            </Text>
          </View>
          <Pressable onPress={() => handleFormPress('dailytasks')}>
            <Text style={[styles.linkText, { color: '#8B5CF6' }]}>Daily Tasks</Text>
          </Pressable>
        </View>
        <View style={styles.twoPaneRow}>
          <View style={[styles.pane, { borderColor: '#EF444430' }]}>
            <View style={[styles.paneHeader, { backgroundColor: '#EF444412' }]}>
              <AlertTriangle size={13} color="#EF4444" /><Text style={[styles.paneHeaderText, { color: '#EF4444' }]}>Reactive</Text>
            </View>
            <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <TaskFeedInbox departmentCode={DEPT.FACILITY_SANITATION} moduleColor="#EF4444" workOrderTypeFilter="reactive" onTaskCompleted={handleTaskCompleted} createModuleHistoryRecord={handleCreateSanitationRecord} maxVisible={20} showHeader={false} />
            </ScrollView>
          </View>
          <View style={[styles.pane, { borderColor: '#8B5CF630' }]}>
            <View style={[styles.paneHeader, { backgroundColor: '#8B5CF612' }]}>
              <Droplets size={13} color="#8B5CF6" /><Text style={[styles.paneHeaderText, { color: '#8B5CF6' }]}>Scheduled</Text>
            </View>
            <ScrollView style={styles.paneScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <TaskFeedInbox departmentCode={DEPT.FACILITY_SANITATION} moduleColor="#8B5CF6" workOrderTypeFilter="scheduled" onTaskCompleted={handleTaskCompleted} createModuleHistoryRecord={handleCreateSanitationRecord} maxVisible={20} showHeader={false} />
            </ScrollView>
          </View>
        </View>
      </View>

      {/* ── Form Categories ───────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Form Categories</Text>
      {SANITATION_CATEGORIES.map(cat => {
        const Icon = cat.icon;
        const isExpanded = expandedCategory === cat.id;
        return (
          <View key={cat.id} style={styles.catWrap}>
            <Pressable
              style={[styles.catCard, { backgroundColor: colors.surface, borderColor: isExpanded ? cat.color : colors.border }]}
              onPress={() => handleCategoryPress(cat.id)}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}><Icon size={22} color={cat.color} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
                <Text style={[styles.catCount, { color: colors.textSecondary }]}>{cat.forms.length} forms</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
            </Pressable>
            {isExpanded && (
              <View style={[styles.catForms, { borderColor: colors.border }]}>
                {cat.forms.map((f, i) => (
                  <Pressable key={f.id} style={[styles.formRow, { borderBottomColor: i < cat.forms.length-1 ? colors.border : 'transparent' }]} onPress={() => handleFormPress(f.route)}>
                    <View style={[styles.formDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.formTitle, { color: colors.text }]}>{f.title}</Text>
                    <ChevronRight size={15} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  content:     { padding: 16, gap: 12 },

  headerCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  headerIcon:  { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub:   { fontSize: 12, marginTop: 2, lineHeight: 17 },

  statsRow:    { flexDirection: 'row', gap: 8 },
  statCard:    { flex: 1, borderRadius: 10, padding: 10, borderWidth: 1, alignItems: 'center' },
  statIcon:    { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue:   { fontSize: 18, fontWeight: '700' },
  statLabel:   { fontSize: 9, fontWeight: '500', marginTop: 2, textAlign: 'center' },

  deptSection:  { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  deptHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  deptIcon:     { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  deptTitle:    { fontSize: 14, fontWeight: '700' },
  deptSub:      { fontSize: 10, marginTop: 2 },
  linkText:     { fontSize: 12, fontWeight: '600' },

  empBlock:       { margin: 10, marginBottom: 0, backgroundColor: '#020912', borderRadius: 12, borderWidth: 1, borderColor: '#0d2840', overflow: 'hidden' },
  empBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderBottomWidth: 1, borderBottomColor: '#0d2840', backgroundColor: '#050f1e' },
  empBlockTitle:  { flex: 1, fontSize: 12, fontWeight: '700', color: '#e0f4ff' },
  empDashBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00e5ff', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  empDashBtnText: { fontSize: 9, fontWeight: '800', color: '#020912', letterSpacing: 1 },
  empLinks:       { padding: 8, gap: 5 },
  empLink:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#050f1e', borderRadius: 7, borderWidth: 1, borderColor: '#0d2840', borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 8 },
  empLinkDot:     { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empLinkDotInner:{ width: 7, height: 7, borderRadius: 4 },
  empLinkLabel:   { fontSize: 12, fontWeight: '600', color: '#e0f4ff' },
  empLinkSub:     { fontSize: 10, color: '#7aa8c8' },

  twoPaneRow:  { flexDirection: 'row', padding: 10, gap: 8 },
  pane:        { flex: 1, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  paneHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 5 },
  paneHeaderText: { fontSize: 12, fontWeight: '700' },
  paneScroll:  { maxHeight: 300 },

  sectionTitle:{ fontSize: 16, fontWeight: '600' },
  catWrap:     { marginBottom: 10 },
  catCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, gap: 12 },
  catIcon:     { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catTitle:    { fontSize: 14, fontWeight: '600' },
  catCount:    { fontSize: 11, marginTop: 2 },
  catForms:    { marginTop: 6, marginLeft: 14, borderLeftWidth: 2, paddingLeft: 12 },
  formRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  formDot:     { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  formTitle:   { flex: 1, fontSize: 13 },
});
