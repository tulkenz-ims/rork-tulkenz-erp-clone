import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  LayoutDashboard,
  Package,
  Wrench,
  Users,
  Target,
  ShoppingCart,
  CheckSquare,
  ClipboardCheck,
  Recycle,
  MessageSquareLock,
  Settings,
  Building2,
  DollarSign,
  Receipt,
  CreditCard,
  Wallet,
  PiggyBank,
  Calculator,
  FileText,
  LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser, type ModuleKey } from '@/contexts/UserContext';
import { useLicense, type ModuleVisibilityKey } from '@/contexts/LicenseContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ModuleConfig {
  key: ModuleKey;
  name: string;
  description: string;
  icon: LucideIcon;
  route: string;
  color: string;
  category: 'operations' | 'finance' | 'hr' | 'compliance' | 'admin';
}

const ALL_MODULES: ModuleConfig[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Overview & KPIs',
    icon: LayoutDashboard,
    route: '/(tabs)/(dashboard)',
    color: '#3B82F6',
    category: 'operations',
  },
  {
    key: 'inventory',
    name: 'Inventory',
    description: 'Parts & Materials',
    icon: Package,
    route: '/(tabs)/inventory',
    color: '#10B981',
    category: 'operations',
  },
  {
    key: 'service',
    name: 'Service',
    description: 'Work Orders',
    icon: Wrench,
    route: '/(tabs)/service',
    color: '#F59E0B',
    category: 'operations',
  },
  {
    key: 'planner',
    name: 'Planner',
    description: 'PM Schedules',
    icon: Target,
    route: '/(tabs)/planner',
    color: '#8B5CF6',
    category: 'operations',
  },
  {
    key: 'procurement',
    name: 'Procurement',
    description: 'Purchase Orders',
    icon: ShoppingCart,
    route: '/(tabs)/procurement',
    color: '#EC4899',
    category: 'operations',
  },
  {
    key: 'approvals',
    name: 'Approvals',
    description: 'Pending Requests',
    icon: CheckSquare,
    route: '/(tabs)/approvals',
    color: '#14B8A6',
    category: 'operations',
  },
  {
    key: 'inspections',
    name: 'Inspections',
    description: 'Quality Checks',
    icon: ClipboardCheck,
    route: '/(tabs)/inspections',
    color: '#6366F1',
    category: 'compliance',
  },
  {
    key: 'taskfeed',
    name: 'Task Feed',
    description: 'Activity Tracking',
    icon: MessageSquareLock,
    route: '/(tabs)/taskfeed',
    color: '#0EA5E9',
    category: 'operations',
  },
  {
    key: 'employees',
    name: 'Employees',
    description: 'Staff Management',
    icon: Users,
    route: '/(tabs)/employees',
    color: '#22C55E',
    category: 'hr',
  },
  
  {
    key: 'recycling',
    name: 'Recycling',
    description: 'Environmental',
    icon: Recycle,
    route: '/(tabs)/recycling',
    color: '#84CC16',
    category: 'compliance',
  },
  {
    key: 'settings',
    name: 'Settings',
    description: 'Configuration',
    icon: Settings,
    route: '/(tabs)/settings',
    color: '#6B7280',
    category: 'admin',
  },
];

const FINANCE_MODULES: ModuleConfig[] = [
  {
    key: 'finance' as ModuleKey,
    name: 'Finance Hub',
    description: 'Financial Overview',
    icon: DollarSign,
    route: '/(tabs)/finance',
    color: '#059669',
    category: 'finance',
  },
  {
    key: 'finance' as ModuleKey,
    name: 'Accounts Payable',
    description: 'Vendor Invoices',
    icon: Receipt,
    route: '/(tabs)/finance/ap',
    color: '#DC2626',
    category: 'finance',
  },
  {
    key: 'finance' as ModuleKey,
    name: 'Accounts Receivable',
    description: 'Customer Billing',
    icon: CreditCard,
    route: '/(tabs)/finance/ar',
    color: '#2563EB',
    category: 'finance',
  },
  {
    key: 'finance' as ModuleKey,
    name: 'General Ledger',
    description: 'Chart of Accounts',
    icon: FileText,
    route: '/(tabs)/finance/gl',
    color: '#7C3AED',
    category: 'finance',
  },
  {
    key: 'finance' as ModuleKey,
    name: 'Payroll',
    description: 'Employee Pay',
    icon: Wallet,
    route: '/(tabs)/finance/payroll',
    color: '#0891B2',
    category: 'finance',
  },
  {
    key: 'finance' as ModuleKey,
    name: 'Budgeting',
    description: 'Budget vs Actual',
    icon: PiggyBank,
    route: '/(tabs)/finance/budgets',
    color: '#CA8A04',
    category: 'finance',
  },
  {
    key: 'finance' as ModuleKey,
    name: 'Taxes',
    description: 'Tax Management',
    icon: Calculator,
    route: '/(tabs)/finance/taxes',
    color: '#BE185D',
    category: 'finance',
  },
];

const VENDOR_MODULE: ModuleConfig = {
  key: 'procurement' as ModuleKey,
  name: 'Vendors',
  description: 'Supplier Management',
  icon: Building2,
  route: '/(tabs)/procurement/vendors',
  color: '#EA580C',
  category: 'operations',
};

const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operations',
  finance: 'Finance & Accounting',
  hr: 'Human Resources',
  compliance: 'Compliance & Quality',
  admin: 'Administration',
};

interface ModuleHubProps {
  showFinance?: boolean;
  showVendors?: boolean;
  compact?: boolean;
}

export default function ModuleHub({ showFinance = true, showVendors = true, compact = false }: ModuleHubProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { allowedModules, isEmployee } = useUser();
  const { isModuleVisibleByLicense } = useLicense();

  const availableModules = useMemo(() => {
    const checkModuleAllowed = (key: ModuleKey) => {
      if (isEmployee && key === 'dashboard') return true;
      return allowedModules.some((m) => m.key === key);
    };

    const checkLicenseAllowed = (key: ModuleKey) => {
      const licenseKey = key as ModuleVisibilityKey;
      return isModuleVisibleByLicense(licenseKey);
    };

    let modules = ALL_MODULES.filter((m) => {
      const hasPermission = checkModuleAllowed(m.key);
      const hasLicense = checkLicenseAllowed(m.key);
      return hasPermission && hasLicense;
    });
    
    if (showVendors && checkModuleAllowed('procurement')) {
      const procurementIndex = modules.findIndex(m => m.key === 'procurement');
      if (procurementIndex !== -1) {
        modules.splice(procurementIndex + 1, 0, VENDOR_MODULE);
      }
    }
    
    if (showFinance && isModuleVisibleByLicense('finance') && (checkModuleAllowed('settings') || checkModuleAllowed('approvals'))) {
      modules = [...modules, ...FINANCE_MODULES];
    }
    
    return modules;
  }, [allowedModules, showFinance, showVendors, isEmployee, isModuleVisibleByLicense]);

  const groupedModules = useMemo(() => {
    const groups: Record<string, ModuleConfig[]> = {};
    availableModules.forEach((module) => {
      if (!groups[module.category]) {
        groups[module.category] = [];
      }
      groups[module.category].push(module);
    });
    return groups;
  }, [availableModules]);

  const handleModulePress = (route: string) => {
    console.log('Navigating to:', route);
    router.push(route as any);
  };

  const renderModuleCard = (module: ModuleConfig) => {
    const Icon = module.icon;
    
    return (
      <TouchableOpacity
        key={`${module.key}-${module.name}`}
        style={[
          styles.moduleCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            width: compact ? CARD_WIDTH - 8 : CARD_WIDTH,
          },
        ]}
        onPress={() => handleModulePress(module.route)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${module.color}15` }]}>
          <Icon size={compact ? 24 : 28} color={module.color} />
        </View>
        <Text style={[styles.moduleName, { color: colors.text }]} numberOfLines={1}>
          {module.name}
        </Text>
        <Text style={[styles.moduleDescription, { color: colors.textSecondary }]} numberOfLines={1}>
          {module.description}
        </Text>
      </TouchableOpacity>
    );
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {availableModules.slice(0, 8).map(renderModuleCard)}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Module Hub</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Access all ERP modules from one place
        </Text>
      </View>

      {Object.entries(groupedModules).map(([category, modules]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
            {CATEGORY_LABELS[category] || category}
          </Text>
          <View style={styles.modulesGrid}>
            {modules.map(renderModuleCard)}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          {availableModules.length} modules available based on your permissions
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  compactContainer: {
    marginVertical: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modulesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  moduleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  moduleDescription: {
    fontSize: 13,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center' as const,
  },
  footerText: {
    fontSize: 12,
  },
});
