import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Database,
  QrCode,
  ArrowLeftRight,
  DollarSign,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useERP } from '@/contexts/ERPContext';
import { useDashboardAlertWidget } from '@/hooks/useDashboardAlertWidget';
import { useMaterialsQuery, useLowStockMaterials } from '@/hooks/useSupabaseMaterials';
import * as Haptics from 'expo-haptics';

interface SubModule {
  id: string;
  title: string;
  route: string;
  alertKey?: 'stockout' | 'lowstock' | 'overstock' | 'reorder';
}

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  subModules: SubModule[];
}

const inventoryModules: Module[] = [
  {
    id: 'items',
    title: 'Items',
    description: 'Manage item records, categories, and shared materials',
    icon: Database,
    color: '#3B82F6',
    subModules: [
      { id: 'itemrecords', title: 'Item Records', route: 'itemrecords' },
      { id: 'subcategories', title: 'Subcategories', route: 'subcategories' },
      { id: 'sharedmaterials', title: 'Shared Materials', route: 'sharedmaterials' },
    ],
  },
  {
    id: 'stock',
    title: 'Stock Management',
    description: 'On-hand quantities, counts, and stock alerts',
    icon: Package,
    color: '#10B981',
    subModules: [
      { id: 'onhand', title: 'On-Hand View', route: 'onhand' },
      { id: 'inventorycount', title: 'Inventory Count', route: 'inventorycount' },
      { id: 'lowstockalerts', title: 'Stock Alerts', route: 'lowstockalerts', alertKey: 'lowstock' as const },
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking',
    description: 'Lot tracking, expiration dates, and transaction history',
    icon: QrCode,
    color: '#8B5CF6',
    subModules: [
      { id: 'lottracking', title: 'Lot Tracking', route: 'lottracking' },
      { id: 'expirationtracking', title: 'Expiration Tracking', route: 'expirationtracking' },
      { id: 'transactionhistory', title: 'Transaction History', route: 'transactionhistory' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    description: 'Transfers, charging, replenishment, and label printing',
    icon: ArrowLeftRight,
    color: '#F59E0B',
    subModules: [
      { id: 'iut', title: 'Inter-Unit Transfers', route: 'iut' },
      { id: 'glcharging', title: 'G/L Charging', route: 'glcharging' },
      { id: 'weeklyreplenishment', title: 'Weekly Replenishment', route: 'weeklyreplenishment' },
      { id: 'labelprinting', title: 'Label Printing', route: 'labelprinting' },
    ],
  },
];

export default function InventoryDashboard() {
  const { colors } = useTheme();
  const router = useRouter();

  const handleGoBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);
  const queryClient = useQueryClient();
  const { stats: erpStats, getInventoryModuleAlertCounts } = useERP();
  const moduleAlertCounts = getInventoryModuleAlertCounts();
  const alertWidget = useDashboardAlertWidget();

  const { data: materials = [], isLoading: materialsLoading, refetch: refetchMaterials } = useMaterialsQuery();
  const { data: lowStockMaterials = [], refetch: refetchLowStock } = useLowStockMaterials();

  const stats = useMemo(() => {
    const activeMaterials = materials.filter(m => m.status === 'active');
    const totalMaterials = activeMaterials.length;
    const inventoryValue = activeMaterials.reduce((sum, m) => sum + ((m.on_hand || 0) * (m.unit_price || 0)), 0);
    const lowStockCount = lowStockMaterials.length;
    const outOfStockCount = activeMaterials.filter(m => (m.on_hand || 0) <= 0).length;
    const overstockCount = activeMaterials.filter(m => m.max_level && (m.on_hand || 0) > m.max_level).length;

    if (totalMaterials === 0) {
      return erpStats;
    }

    console.log('[InventoryDashboard] Stats from Supabase:', { totalMaterials, inventoryValue, lowStockCount, outOfStockCount });
    return {
      ...erpStats,
      totalMaterials,
      inventoryValue,
      lowStockCount,
      outOfStockCount,
      overstockCount,
    };
  }, [materials, lowStockMaterials, erpStats]);

  const getSubModuleAlertInfo = useCallback((alertKey?: 'stockout' | 'lowstock' | 'overstock' | 'reorder') => {
    if (!alertKey) return null;
    
    switch (alertKey) {
      case 'stockout':
        return alertWidget.outOfStockCount > 0 ? {
          count: alertWidget.outOfStockCount,
          severity: 'critical' as const,
          color: '#EF4444',
          bgColor: '#FEE2E2',
        } : null;
      case 'lowstock':
        return alertWidget.warningCount > 0 ? {
          count: alertWidget.warningCount,
          severity: 'warning' as const,
          color: '#D97706',
          bgColor: '#FEF3C7',
        } : null;
      case 'overstock':
        return stats.overstockCount > 0 ? {
          count: stats.overstockCount,
          severity: 'info' as const,
          color: '#3B82F6',
          bgColor: '#DBEAFE',
        } : null;
      case 'reorder':
        return alertWidget.requiresImmediateAction > 0 ? {
          count: alertWidget.requiresImmediateAction,
          severity: 'warning' as const,
          color: '#D97706',
          bgColor: '#FEF3C7',
        } : null;
      default:
        return null;
    }
  }, [alertWidget, stats]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    console.log('[InventoryDashboard] Refreshing inventory data...');
    setRefreshing(true);
    try {
      await Promise.all([
        refetchMaterials(),
        refetchLowStock(),
        queryClient.invalidateQueries({ queryKey: ['inventory_history'] }),
      ]);
      console.log('[InventoryDashboard] Refresh complete');
    } catch (error) {
      console.error('[InventoryDashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchMaterials, refetchLowStock, queryClient]);

  const toggleModule = useCallback((moduleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedModule(prev => prev === moduleId ? null : moduleId);
  }, []);

  const navigateToSubModule = useCallback((route: string) => {
    Haptics.selectionAsync();
    router.push(`/inventory/${route}` as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={handleGoBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Package size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalMaterials}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Items</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DollarSign size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>${(stats.inventoryValue / 1000).toFixed(1)}K</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Value</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.lowStockCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Low Stock</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <BarChart3 size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.outOfStockCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Out of Stock</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Inventory Modules</Text>

        {inventoryModules.map((module) => {
          const IconComponent = module.icon;
          const isExpanded = expandedModule === module.id;

          const alertData = moduleAlertCounts[module.id as keyof typeof moduleAlertCounts];
          const hasAlerts = alertData && alertData.total > 0;
          const hasCritical = alertData && alertData.critical > 0;
          const hasWarning = alertData && alertData.warning > 0;

          return (
            <View key={module.id} style={styles.moduleWrapper}>
              <Pressable
                style={[
                  styles.moduleCard,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: isExpanded ? module.color : colors.border,
                  },
                ]}
                onPress={() => toggleModule(module.id)}
              >
                <View style={styles.moduleIconContainer}>
                  <View style={[styles.moduleIcon, { backgroundColor: `${module.color}15` }]}>
                    <IconComponent size={24} color={module.color} />
                  </View>
                  {hasAlerts && (
                    <View style={[
                      styles.alertBadge,
                      { 
                        backgroundColor: hasCritical ? '#EF4444' : hasWarning ? '#F59E0B' : '#3B82F6',
                      },
                    ]}>
                      <Text style={styles.alertBadgeText}>{alertData.total}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.moduleInfo}>
                  <View style={styles.moduleTitleRow}>
                    <Text style={[styles.moduleTitle, { color: colors.text }]}>{module.title}</Text>
                    {hasCritical && (
                      <View style={[styles.severityIndicator, { backgroundColor: '#FEE2E2' }]}>
                        <AlertTriangle size={12} color="#EF4444" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.moduleDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {module.description}
                  </Text>
                  <View style={styles.moduleBadgeRow}>
                    <View style={[styles.moduleBadge, { backgroundColor: `${module.color}15` }]}>
                      <Text style={[styles.moduleBadgeText, { color: module.color }]}>
                        {module.subModules.length} features
                      </Text>
                    </View>
                    {hasAlerts && (
                      <View style={[
                        styles.alertSummaryBadge,
                        { backgroundColor: hasCritical ? '#FEE2E2' : hasWarning ? '#FEF3C7' : '#DBEAFE' },
                      ]}>
                        <Text style={[
                          styles.alertSummaryText,
                          { color: hasCritical ? '#EF4444' : hasWarning ? '#D97706' : '#3B82F6' },
                        ]}>
                          {hasCritical ? `${alertData.critical} critical` : hasWarning ? `${alertData.warning} warning` : `${alertData.info} info`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[
                  styles.expandIcon,
                  { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }
                ]}>
                  <ChevronRight size={20} color={colors.textTertiary} />
                </View>
              </Pressable>

              {isExpanded && (
                <View style={[styles.subModulesContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  {module.subModules.map((subModule, index) => {
                    const subAlertInfo = getSubModuleAlertInfo(subModule.alertKey);
                    
                    return (
                      <Pressable
                        key={subModule.id}
                        style={[
                          styles.subModuleItem,
                          { 
                            backgroundColor: colors.surface,
                            borderColor: subAlertInfo ? subAlertInfo.color : colors.border,
                            borderWidth: subAlertInfo ? 1.5 : 1,
                          },
                          index === module.subModules.length - 1 && styles.subModuleItemLast,
                        ]}
                        onPress={() => navigateToSubModule(subModule.route)}
                      >
                        <View style={[
                          styles.subModuleDot, 
                          { backgroundColor: subAlertInfo ? subAlertInfo.color : module.color }
                        ]} />
                        <Text style={[styles.subModuleTitle, { color: colors.text }]}>
                          {subModule.title}
                        </Text>
                        {subAlertInfo && (
                          <View style={[
                            styles.subModuleAlertBadge,
                            { backgroundColor: subAlertInfo.bgColor }
                          ]}>
                            <AlertTriangle size={10} color={subAlertInfo.color} />
                            <Text style={[styles.subModuleAlertText, { color: subAlertInfo.color }]}>
                              {subAlertInfo.count}
                            </Text>
                          </View>
                        )}
                        <ChevronRight size={16} color={colors.textTertiary} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  moduleWrapper: {
    marginBottom: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  moduleIconContainer: {
    position: 'relative' as const,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  severityIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  moduleBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
  },
  moduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertSummaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertSummaryText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  moduleBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  expandIcon: {
    padding: 4,
  },
  subModulesContainer: {
    marginTop: 4,
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  subModuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  subModuleItemLast: {
    marginBottom: 0,
  },
  subModuleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subModuleTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  subModuleAlertBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 4,
  },
  subModuleAlertText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  bottomPadding: {
    height: 40,
  },
  backButton: {
    padding: 4,
    marginLeft: Platform.OS === 'ios' ? 0 : -8,
  },
});
