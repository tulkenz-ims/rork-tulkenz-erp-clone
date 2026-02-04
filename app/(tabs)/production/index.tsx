import React, { useState, useCallback } from 'react';
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
  Factory,
  Package,
  ClipboardList,
  ChevronRight,
  Clock,
  TrendingUp,
  Boxes,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useERP } from '@/contexts/ERPContext';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';

export default function ProductionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { materials } = useERP();
  const [refreshing, setRefreshing] = useState(false);

  const handleTaskCompleted = useCallback((task: TaskFeedDepartmentTask, moduleHistoryId?: string) => {
    console.log('[Production] Task completed:', task.postNumber, 'History ID:', moduleHistoryId);
  }, []);

  const productionMaterials = materials.filter(m => m.inventoryDepartment === 4);
  const lowStockCount = productionMaterials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level).length;
  const outOfStockCount = productionMaterials.filter(m => m.on_hand === 0).length;
  const totalValue = productionMaterials.reduce((sum, m) => sum + (m.on_hand * m.unit_price), 0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleNavigate = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/production/${route}` as any);
  }, [router]);

  const stats = [
    { label: 'Total Items', value: productionMaterials.length.toString(), icon: Package, color: '#F59E0B' },
    { label: 'Total Value', value: `${(totalValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: '#10B981' },
    { label: 'Low Stock', value: lowStockCount.toString(), icon: Clock, color: '#EF4444' },
    { label: 'In Stock', value: productionMaterials.filter(m => m.on_hand > m.min_level).length.toString(), icon: CheckCircle, color: '#3B82F6' },
  ];

  const modules = [
    {
      id: 'materials',
      title: 'Production Materials (4XXXXXX)',
      description: 'Raw materials, consumables, packaging, and production supplies',
      icon: Boxes,
      color: '#F59E0B',
      route: 'materials',
    },
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
        <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
          <Factory size={32} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Production</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Production materials, raw materials, consumables, and packaging supplies
        </Text>
      </View>

      <TaskFeedInbox
        departmentCode="1003"
        moduleColor="#F59E0B"
        onTaskCompleted={handleTaskCompleted}
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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Modules</Text>

      {modules.map((module) => {
        const IconComponent = module.icon;
        return (
          <Pressable
            key={module.id}
            style={({ pressed }) => [
              styles.moduleCard,
              { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => handleNavigate(module.route)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: module.color + '15' }]}>
              <IconComponent size={24} color={module.color} />
            </View>
            <View style={styles.moduleInfo}>
              <Text style={[styles.moduleTitle, { color: colors.text }]}>{module.title}</Text>
              <Text style={[styles.moduleDescription, { color: colors.textSecondary }]}>
                {module.description}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </Pressable>
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
  moduleCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
