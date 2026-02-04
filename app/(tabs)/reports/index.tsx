import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  BarChart2, 
  PieChart, 
  TrendingUp, 
  FileSpreadsheet,
  Wrench,
  Package,
  Clock,
  ClipboardCheck,
  ChevronRight
} from 'lucide-react-native';

export default function ReportsScreen() {
  const { colors } = useTheme();

  const reportCategories = [
    { 
      title: 'Maintenance Reports', 
      icon: Wrench, 
      color: '#10B981',
      reports: ['Work Order Summary', 'PM Compliance', 'MTBF/MTTR', 'Technician Performance']
    },
    { 
      title: 'Inventory Reports', 
      icon: Package, 
      color: '#3B82F6',
      reports: ['Stock Levels', 'Usage Analysis', 'Reorder Report', 'Inventory Value']
    },
    { 
      title: 'Labor Reports', 
      icon: Clock, 
      color: '#8B5CF6',
      reports: ['Time & Attendance', 'Overtime Summary', 'Labor Cost Analysis']
    },
    { 
      title: 'Inspection Reports', 
      icon: ClipboardCheck, 
      color: '#F59E0B',
      reports: ['Inspection Summary', 'Compliance Rate', 'Deficiency Trends']
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EC4899' + '20' }]}>
            <BarChart2 size={32} color="#EC4899" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Reports & Analytics</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Access operational reports, KPIs, and analytics dashboards
          </Text>
        </View>

        <View style={styles.quickStats}>
          <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <PieChart size={20} color="#10B981" />
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Charts</Text>
          </View>
          <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TrendingUp size={20} color="#3B82F6" />
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Trends</Text>
          </View>
          <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileSpreadsheet size={20} color="#8B5CF6" />
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Export</Text>
          </View>
        </View>

        {reportCategories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <View 
              key={index} 
              style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                  <IconComponent size={20} color={category.color} />
                </View>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
              </View>
              {category.reports.map((report, reportIndex) => (
                <Pressable 
                  key={reportIndex} 
                  style={[styles.reportItem, { borderTopColor: colors.border }]}
                >
                  <Text style={[styles.reportName, { color: colors.textSecondary }]}>{report}</Text>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          );
        })}

        <View style={[styles.placeholderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>Coming Soon</Text>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Full reporting suite with customizable dashboards, scheduled reports, and export capabilities are currently under development.
          </Text>
        </View>
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
    gap: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  quickStats: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickStatLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  categoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  reportItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  reportName: {
    fontSize: 14,
  },
  placeholderCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});
