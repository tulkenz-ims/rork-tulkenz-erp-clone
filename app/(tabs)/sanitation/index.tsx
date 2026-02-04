import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Calendar,
  ClipboardList,
  CheckCircle,
  ChevronRight,
  Clock,
  TrendingUp,
  Bath,
  Coffee,
  Building2,
  Footprints,
  Trash2,
  Wind,
  Package,
  ShoppingBag,
  Wrench,
  TreePine,
  GraduationCap,
  FileWarning,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSanitation } from '@/hooks/useSupabaseSanitation';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { supabase } from '@/lib/supabase';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

interface FormLink {
  id: string;
  title: string;
  route: string;
}

interface FormCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  forms: FormLink[];
}

const SANITATION_CATEGORIES: FormCategory[] = [
  {
    id: 'chemicals',
    title: 'Chemicals & Supplies (6XXXXXX)',
    icon: Package,
    color: '#10B981',
    forms: [
      { id: 'chemicals', title: 'View All Chemicals & Supplies', route: 'chemicals' },
    ],
  },
  {
    id: 'scheduling',
    title: 'Master Sanitation Scheduling',
    icon: Calendar,
    color: '#8B5CF6',
    forms: [
      { id: 'mss', title: 'Master Sanitation Schedule (MSS)', route: 'mss' },
      { id: 'dailytasks', title: 'Daily Sanitation Task List', route: 'dailytasks' },
      { id: 'weeklytasks', title: 'Weekly Sanitation Task List', route: 'weeklytasks' },
      { id: 'monthlytasks', title: 'Monthly Sanitation Task List', route: 'monthlytasks' },
      { id: 'deepclean', title: 'Quarterly/Annual Deep Clean Schedule', route: 'deepclean' },
      { id: 'zonemap', title: 'Sanitation Zone Map', route: 'zonemap' },
      { id: 'crewassignment', title: 'Sanitation Crew Assignment Log', route: 'crewassignment' },
    ],
  },
  {
    id: 'restroom',
    title: 'Restroom Sanitation',
    icon: Bath,
    color: '#3B82F6',
    forms: [
      { id: 'restroomcleaning', title: 'Restroom Cleaning Checklist', route: 'restroomcleaning' },
      { id: 'restroominspection', title: 'Restroom Inspection Log', route: 'restroominspection' },
      { id: 'restroomdeepclean', title: 'Restroom Deep Clean Record', route: 'restroomdeepclean' },
      { id: 'restroomsupply', title: 'Restroom Supply Check Log', route: 'restroomsupply' },
    ],
  },
  {
    id: 'breakroom',
    title: 'Break Room / Locker Room',
    icon: Coffee,
    color: '#F59E0B',
    forms: [
      { id: 'breakroomcleaning', title: 'Break Room Cleaning Checklist', route: 'breakroomcleaning' },
      { id: 'breakroomfridge', title: 'Break Room Refrigerator Cleaning', route: 'breakroomfridge' },
      { id: 'microwavecleaning', title: 'Microwave/Appliance Cleaning', route: 'microwavecleaning' },
      { id: 'lockerroomcleaning', title: 'Locker Room Cleaning Checklist', route: 'lockerroomcleaning' },
      { id: 'lockerroominspection', title: 'Locker Room Inspection Log', route: 'lockerroominspection' },
      { id: 'vendingarea', title: 'Vending Area Cleaning Log', route: 'vendingarea' },
    ],
  },
  {
    id: 'office',
    title: 'Office & Common Areas',
    icon: Building2,
    color: '#10B981',
    forms: [
      { id: 'officecleaning', title: 'Office Cleaning Checklist', route: 'officecleaning' },
      { id: 'conferenceroom', title: 'Conference Room Cleaning', route: 'conferenceroom' },
      { id: 'lobbycleaning', title: 'Reception/Lobby Cleaning', route: 'lobbycleaning' },
      { id: 'hallwaycleaning', title: 'Hallway/Corridor Cleaning', route: 'hallwaycleaning' },
      { id: 'stairwellcleaning', title: 'Stairwell Cleaning', route: 'stairwellcleaning' },
      { id: 'entrancecleaning', title: 'Entrance/Exit Area Cleaning', route: 'entrancecleaning' },
    ],
  },
  {
    id: 'floorcare',
    title: 'Floor Care',
    icon: Footprints,
    color: '#EC4899',
    forms: [
      { id: 'floormopping', title: 'Floor Mopping Log', route: 'floormopping' },
      { id: 'floorscrubbing', title: 'Floor Scrubbing/Buffing Schedule', route: 'floorscrubbing' },
      { id: 'floorwaxing', title: 'Floor Waxing/Stripping Record', route: 'floorwaxing' },
      { id: 'carpetcleaning', title: 'Carpet Cleaning/Shampooing', route: 'carpetcleaning' },
      { id: 'floormatcleaning', title: 'Floor Mat Cleaning/Replacement', route: 'floormatcleaning' },
    ],
  },
  {
    id: 'waste',
    title: 'Waste & Trash Management',
    icon: Trash2,
    color: '#6366F1',
    forms: [
      { id: 'trashremoval', title: 'Trash Removal Schedule/Log', route: 'trashremoval' },
      { id: 'wastecontainer', title: 'Waste Container Cleaning', route: 'wastecontainer' },
      { id: 'dumpsterarea', title: 'Dumpster Area Sanitation', route: 'dumpsterarea' },
      { id: 'recyclingarea', title: 'Recycling Area Cleaning', route: 'recyclingarea' },
      { id: 'trashliner', title: 'Trash Can Liner Replacement', route: 'trashliner' },
    ],
  },
  {
    id: 'window',
    title: 'Window & Glass Cleaning',
    icon: Wind,
    color: '#0EA5E9',
    forms: [
      { id: 'windowcleaning', title: 'Window Cleaning Schedule', route: 'windowcleaning' },
      { id: 'glasscleaning', title: 'Interior Glass/Mirror Cleaning', route: 'glasscleaning' },
      { id: 'doorglasscleaning', title: 'Door Glass Cleaning', route: 'doorglasscleaning' },
    ],
  },
  {
    id: 'facilitysupplies',
    title: 'Facility Consumable Supplies',
    icon: Package,
    color: '#14B8A6',
    forms: [
      { id: 'toiletpaperinventory', title: 'Toilet Paper Inventory', route: 'toiletpaperinventory' },
      { id: 'papertowerinventory', title: 'Paper Towel Inventory', route: 'papertowerinventory' },
      { id: 'handsoapinventory', title: 'Hand Soap Inventory', route: 'handsoapinventory' },
      { id: 'sanitizerinventory', title: 'Hand Sanitizer Inventory', route: 'sanitizerinventory' },
      { id: 'trashlinerinventory', title: 'Trash Liner Inventory', route: 'trashlinerinventory' },
      { id: 'airfreshenerinventory', title: 'Air Freshener Inventory', route: 'airfreshenerinventory' },
    ],
  },
  {
    id: 'productionsupplies',
    title: 'Production Consumable Supplies',
    icon: ShoppingBag,
    color: '#F97316',
    forms: [
      { id: 'gloveinventory', title: 'Glove Inventory Log', route: 'gloveinventory' },
      { id: 'gloveissuance', title: 'Glove Issuance Log', route: 'gloveissuance' },
      { id: 'hairnetinventory', title: 'Hairnet Inventory Log', route: 'hairnetinventory' },
      { id: 'hairnetissuance', title: 'Hairnet Issuance Log', route: 'hairnetissuance' },
      { id: 'beardnetinventory', title: 'Beard Net Inventory', route: 'beardnetinventory' },
      { id: 'beardnetissuance', title: 'Beard Net Issuance', route: 'beardnetissuance' },
      { id: 'shoecoverinventory', title: 'Shoe/Boot Cover Inventory', route: 'shoecoverinventory' },
      { id: 'shoecoverissuance', title: 'Shoe/Boot Cover Issuance', route: 'shoecoverissuance' },
      { id: 'towelinventory', title: 'Towel Inventory Log', route: 'towelinventory' },
      { id: 'towelissuance', title: 'Towel Issuance Log', route: 'towelissuance' },
      { id: 'raginventory', title: 'Rag Inventory Log', route: 'raginventory' },
      { id: 'ragissuance', title: 'Rag Issuance Log', route: 'ragissuance' },
      { id: 'aproninventory', title: 'Apron/Smock Inventory', route: 'aproninventory' },
      { id: 'apronissuance', title: 'Apron/Smock Issuance', route: 'apronissuance' },
      { id: 'sleevecoverinventory', title: 'Sleeve Cover Inventory', route: 'sleevecoverinventory' },
      { id: 'facemaskinventory', title: 'Face Mask Inventory', route: 'facemaskinventory' },
      { id: 'consumablesreorder', title: 'Consumables Reorder List', route: 'consumablesreorder' },
      { id: 'supplyroomstock', title: 'Supply Room Stock Check', route: 'supplyroomstock' },
    ],
  },
  {
    id: 'equipment',
    title: 'Sanitation Tools & Equipment',
    icon: Wrench,
    color: '#EF4444',
    forms: [
      { id: 'cleaningtoolinventory', title: 'Cleaning Tool Inventory', route: 'cleaningtoolinventory' },
      { id: 'cleaningtoolinspection', title: 'Cleaning Tool Inspection', route: 'cleaningtoolinspection' },
      { id: 'mopbucketreplacement', title: 'Mop/Bucket Replacement', route: 'mopbucketreplacement' },
      { id: 'vacuummaintenance', title: 'Vacuum Maintenance', route: 'vacuummaintenance' },
      { id: 'floorscrubberpm', title: 'Floor Scrubber Maintenance', route: 'floorscrubberpm' },
      { id: 'cleaningcartinspection', title: 'Cleaning Cart Inspection', route: 'cleaningcartinspection' },
    ],
  },
  {
    id: 'exterior',
    title: 'Exterior/Grounds',
    icon: TreePine,
    color: '#22C55E',
    forms: [
      { id: 'parkingsweeping', title: 'Parking Lot Sweeping', route: 'parkingsweeping' },
      { id: 'sidewalkcleaning', title: 'Sidewalk Cleaning', route: 'sidewalkcleaning' },
      { id: 'smokingareacleaning', title: 'Smoking Area Cleaning', route: 'smokingareacleaning' },
      { id: 'exteriortrashcan', title: 'Exterior Trash Can Cleaning', route: 'exteriortrashcan' },
    ],
  },
  {
    id: 'training',
    title: 'Training & Personnel',
    icon: GraduationCap,
    color: '#A855F7',
    forms: [
      { id: 'sanitationtraining', title: 'Sanitation Training Sign-In', route: 'sanitationtraining' },
      { id: 'chemicalsafetytraining', title: 'Cleaning Chemical Safety Training', route: 'chemicalsafetytraining' },
      { id: 'sanitationsop', title: 'Sanitation SOP Acknowledgment', route: 'sanitationsop' },
      { id: 'newhireorientation', title: 'New Hire Sanitation Orientation', route: 'newhireorientation' },
    ],
  },
  {
    id: 'ncr',
    title: 'Non-Conformance & Corrective Action',
    icon: FileWarning,
    color: '#DC2626',
    forms: [
      { id: 'sanitationncr', title: 'Sanitation Non-Conformance Report', route: 'sanitationncr' },
      { id: 'sanitationcapa', title: 'Sanitation Corrective Action', route: 'sanitationcapa' },
      { id: 'repeatdeficiency', title: 'Repeat Deficiency Tracking', route: 'repeatdeficiency' },
      { id: 'sanitationdeviation', title: 'Sanitation Deviation Report', route: 'sanitationdeviation' },
    ],
  },
];

export default function SanitationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const { 
    tasks, 
    inspections, 
    getComplianceRate, 
    isLoading,
    refetch 
  } = useSupabaseSanitation();

  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const openTasks = tasks.filter(
      t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue'
    ).length;
    
    const completedToday = tasks.filter(
      t => t.status === 'completed' && t.completed_at?.split('T')[0] === today
    ).length;
    
    const pendingReview = tasks.filter(
      t => t.status === 'completed' && !t.verified_at
    ).length + inspections.filter(
      t => t.status === 'scheduled' || t.status === 'in_progress'
    ).length;
    
    const compliance = getComplianceRate();
    
    return { openTasks, completedToday, pendingReview, compliance };
  }, [tasks, inspections, getComplianceRate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';
  const { user } = useUser();

  const handleCreateSanitationHistoryRecord = useCallback(async (
    task: TaskFeedDepartmentTask,
    notes: string
  ): Promise<string | null> => {
    try {
      if (!organizationId) {
        console.warn('[Sanitation] No organization ID available, skipping history record creation');
        return null;
      }
      
      console.log('[Sanitation] Creating sanitation history record for task:', task.postNumber);
      
      const employeeName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'System';
      
      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: '1002',
          department_name: 'Sanitation',
          facility_code: facilityId || null,
          category_id: 'sanitation-task-feed',
          category_name: 'Task Feed Completion',
          action: `Sanitation Task: ${task.postNumber}`,
          notes: `Completed from Task Feed assignment.\n\nPost: ${task.postNumber}\nNotes: ${notes || 'No additional notes'}`,
          employee_name: employeeName || 'System',
          status: 'verified',
          source_type: 'task_feed_completion',
          source_id: task.id,
          source_number: task.postNumber,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Sanitation] Error creating history record:', error.message || error.code || 'Unknown error');
        console.error('[Sanitation] Error details:', error.details || 'No details');
        console.error('[Sanitation] Error hint:', error.hint || 'No hint');
        return null;
      }

      console.log('[Sanitation] Sanitation history record created:', data.id);
      return data.id;
    } catch (err: any) {
      console.error('[Sanitation] Exception creating history record:', err?.message || 'Unknown exception');
      return null;
    }
  }, [organizationId, facilityId, user]);

  const handleTaskCompleted = useCallback((task: TaskFeedDepartmentTask, moduleHistoryId?: string) => {
    console.log('[Sanitation] Task completed:', task.postNumber, 'History ID:', moduleHistoryId);
    refetch();
  }, [refetch]);

  const handleCategoryPress = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  }, [expandedCategory]);

  const handleFormPress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/sanitation/${route}` as any);
  }, [router]);

  const stats = [
    { label: 'Open Tasks', value: dashboardStats.openTasks.toString(), icon: ClipboardList, color: '#F59E0B' },
    { label: 'Completed Today', value: dashboardStats.completedToday.toString(), icon: CheckCircle, color: '#10B981' },
    { label: 'Pending Review', value: dashboardStats.pendingReview.toString(), icon: Clock, color: '#3B82F6' },
    { label: 'Compliance', value: `${dashboardStats.compliance}%`, icon: TrendingUp, color: '#8B5CF6' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
          <Sparkles size={32} color="#8B5CF6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Sanitation Management</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Janitorial Management System - Cleaning schedules, inspections, and consumable tracking
        </Text>
      </View>

      <TaskFeedInbox
          departmentCode="1002"
          moduleColor="#8B5CF6"
          onTaskCompleted={handleTaskCompleted}
          createModuleHistoryRecord={handleCreateSanitationHistoryRecord}
          maxVisible={3}
        />

        <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View 
              key={index} 
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <IconComponent size={18} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Form Categories</Text>

      {SANITATION_CATEGORIES.map((category) => {
        const IconComponent = category.icon;
        const isExpanded = expandedCategory === category.id;
        
        return (
          <View key={category.id} style={styles.categoryContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.categoryCard,
                { 
                  backgroundColor: colors.surface, 
                  borderColor: isExpanded ? category.color : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                  <IconComponent size={24} color={category.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                    {category.forms.length} forms
                  </Text>
                </View>
                <ChevronRight 
                  size={20} 
                  color={colors.textSecondary} 
                  style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                />
              </View>
            </Pressable>

            {isExpanded && (
              <View style={[styles.formsContainer, { borderColor: colors.border }]}>
                {category.forms.map((form, index) => (
                  <Pressable
                    key={form.id}
                    style={({ pressed }) => [
                      styles.formItem,
                      { 
                        backgroundColor: pressed ? colors.backgroundSecondary : 'transparent',
                        borderBottomColor: index < category.forms.length - 1 ? colors.border : 'transparent',
                      },
                    ]}
                    onPress={() => handleFormPress(form.route)}
                  >
                    <View style={[styles.formDot, { backgroundColor: category.color }]} />
                    <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
                    <ChevronRight size={16} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  formsContainer: {
    marginTop: 8,
    marginLeft: 16,
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  formItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 6,
  },
  formDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  formTitle: {
    flex: 1,
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
});
