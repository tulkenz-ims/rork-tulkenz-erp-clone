import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DollarSign,
  Receipt,
  CreditCard,
  FileText,
  Wallet,
  PiggyBank,
  Calculator,
  Building2,
  Landmark,
  ArrowLeftRight,
  Calendar,
  FileStack,
  TrendingUp,
  Warehouse,
  FileSpreadsheet,
  FilePieChart,
  FileCheck,
  Send,
  Inbox,
  Globe,
  Building,
  BarChart3,
  Repeat,
  BookOpen,
  Layers,
  GitBranch,
  CheckCircle,
  Clock,
  Users,
  FileInput,
  Scan,
  Scale,
  HandCoins,
  CreditCardIcon,
  Phone,
  Award,
  Target,
  TrendingDown,
  ArrowUpDown,
  Lock,
  Unlock,
  ListChecks,
  RotateCcw,
  Eye,
  Percent,
  Home,
  Package,
  Scissors,
  BarChart2,
  PieChart,
  Briefcase,
  ClipboardList,
  Settings,
  Shield,
  FileQuestion,
  Coins,
  ChevronsRight,
  ShieldOff,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useFinanceStatsQuery } from '@/hooks/useSupabaseFinance';
import { usePermissions } from '@/contexts/PermissionsContext';
import { isSuperAdminRole } from '@/constants/roles';


interface FinanceModule {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  implemented: boolean;
}

interface ModuleCategory {
  key: string;
  name: string;
  color: string;
  modules: FinanceModule[];
}

const FINANCE_CATEGORIES: ModuleCategory[] = [
  {
    key: 'gl',
    name: 'General Ledger',
    color: '#7C3AED',
    modules: [
      { key: 'coa', name: 'Chart of Accounts', description: 'Account hierarchy & segments', icon: BookOpen, color: '#7C3AED', route: '/finance/gl', implemented: true },
      { key: 'journal', name: 'Journal Entries', description: 'Manual & template entries', icon: FileText, color: '#8B5CF6', route: '/finance/journal', implemented: false },
      { key: 'recurring', name: 'Recurring Journals', description: 'Automated recurring entries', icon: Repeat, color: '#A78BFA', route: '/finance/recurring', implemented: true },
      { key: 'intercompany', name: 'Intercompany', description: 'IC transactions & eliminations', icon: ArrowLeftRight, color: '#6366F1', route: '/finance/intercompany', implemented: false },
      { key: 'multicompany', name: 'Multi-Company', description: 'Multi-entity management', icon: Building, color: '#4F46E5', route: '/finance/multicompany', implemented: false },
      { key: 'multicurrency', name: 'Multi-Currency', description: 'FX rates & revaluation', icon: Globe, color: '#4338CA', route: '/finance/multicurrency', implemented: false },
      { key: 'trialbalance', name: 'Trial Balance', description: 'Account balances report', icon: Scale, color: '#5B21B6', route: '/finance/trialbalance', implemented: false },
      { key: 'glrecon', name: 'GL Reconciliation', description: 'Account reconciliation', icon: CheckCircle, color: '#6D28D9', route: '/finance/glrecon', implemented: false },
    ],
  },
  {
    key: 'reporting',
    name: 'Financial Statements',
    color: '#059669',
    modules: [
      { key: 'financials', name: 'Financial Statements', description: 'P&L, Balance Sheet, Cash Flow', icon: FileSpreadsheet, color: '#059669', route: '/finance/financials', implemented: false },
      { key: 'consolidation', name: 'Consolidation', description: 'Multi-entity consolidation', icon: Layers, color: '#047857', route: '/finance/consolidation', implemented: false },
      { key: 'mgmtreporting', name: 'Management Reports', description: 'Custom & departmental P&L', icon: BarChart3, color: '#10B981', route: '/finance/mgmtreporting', implemented: false },
      { key: 'segmentreport', name: 'Segment Reporting', description: 'Business segment analysis', icon: PieChart, color: '#34D399', route: '/finance/segmentreport', implemented: false },
      { key: 'ratios', name: 'Financial Ratios', description: 'KPIs & trend analysis', icon: TrendingUp, color: '#6EE7B7', route: '/finance/ratios', implemented: false },
    ],
  },
  {
    key: 'ap',
    name: 'Accounts Payable',
    color: '#DC2626',
    modules: [
      { key: 'vendors', name: 'Vendor Master', description: 'Vendor management & onboarding', icon: Building2, color: '#DC2626', route: '/finance/vendors', implemented: true },
      { key: 'ap', name: 'AP Invoices', description: 'Invoice entry & 3-way match', icon: Receipt, color: '#EF4444', route: '/finance/ap', implemented: true },
      { key: 'apaging', name: 'AP Aging', description: 'Aging reports by vendor', icon: Clock, color: '#F87171', route: '/finance/apaging', implemented: false },
      { key: 'payments', name: 'Payment Processing', description: 'Check, ACH, wire payments', icon: Send, color: '#B91C1C', route: '/finance/payments', implemented: false },
      { key: 'positivepay', name: 'Positive Pay', description: 'Check fraud prevention', icon: Shield, color: '#991B1B', route: '/finance/positivepay', implemented: false },
      { key: 'form1099', name: '1099 Processing', description: 'Year-end 1099 forms', icon: FileCheck, color: '#7F1D1D', route: '/finance/form1099', implemented: false },
      { key: 'vendorcredits', name: 'Vendor Credits', description: 'Credits & debit memos', icon: RotateCcw, color: '#FCA5A5', route: '/finance/vendorcredits', implemented: false },
      { key: 'prepaid', name: 'Prepaid Expenses', description: 'Prepaid tracking & amortization', icon: Calendar, color: '#FECACA', route: '/finance/prepaid', implemented: false },
    ],
  },
  {
    key: 'ar',
    name: 'Accounts Receivable',
    color: '#2563EB',
    modules: [
      { key: 'customers', name: 'Customer Master', description: 'Customer & credit management', icon: Users, color: '#2563EB', route: '/finance/customers', implemented: false },
      { key: 'ar', name: 'AR Invoices', description: 'Invoice creation & billing', icon: CreditCard, color: '#3B82F6', route: '/finance/ar', implemented: true },
      { key: 'araging', name: 'AR Aging', description: 'Aging & collection reports', icon: Clock, color: '#60A5FA', route: '/finance/araging', implemented: false },
      { key: 'collections', name: 'Collections', description: 'Dunning & collection calls', icon: Phone, color: '#1D4ED8', route: '/finance/collections', implemented: false },
      { key: 'custpayments', name: 'Customer Payments', description: 'Payment application & deposits', icon: HandCoins, color: '#1E40AF', route: '/finance/custpayments', implemented: false },
      { key: 'lockbox', name: 'Lockbox Processing', description: 'Automated payment processing', icon: Inbox, color: '#1E3A8A', route: '/finance/lockbox', implemented: false },
      { key: 'creditmemos', name: 'Credit Memos', description: 'Credits, refunds & write-offs', icon: RotateCcw, color: '#93C5FD', route: '/finance/creditmemos', implemented: false },
      { key: 'custportal', name: 'Customer Portal', description: 'Self-service AR portal', icon: Globe, color: '#BFDBFE', route: '/finance/custportal', implemented: false },
    ],
  },
  {
    key: 'cash',
    name: 'Cash Management',
    color: '#0891B2',
    modules: [
      { key: 'bankaccounts', name: 'Bank Accounts', description: 'Account setup & management', icon: Landmark, color: '#0891B2', route: '/finance/bankaccounts', implemented: false },
      { key: 'bankrec', name: 'Bank Reconciliation', description: 'Auto-match & reconciliation', icon: CheckCircle, color: '#06B6D4', route: '/finance/bankrec', implemented: false },
      { key: 'cashposition', name: 'Cash Position', description: 'Real-time cash dashboard', icon: DollarSign, color: '#22D3EE', route: '/finance/cashposition', implemented: false },
      { key: 'cashflow', name: 'Cash Flow Forecast', description: 'Projections & analysis', icon: TrendingUp, color: '#0E7490', route: '/finance/cashflow', implemented: false },
      { key: 'treasury', name: 'Treasury', description: 'Debt & investment tracking', icon: Briefcase, color: '#155E75', route: '/finance/treasury', implemented: false },
      { key: 'fxmgmt', name: 'FX Management', description: 'Foreign exchange & hedging', icon: ArrowUpDown, color: '#164E63', route: '/finance/fxmgmt', implemented: false },
    ],
  },
  {
    key: 'assets',
    name: 'Fixed Assets',
    color: '#EA580C',
    modules: [
      { key: 'fixedassets', name: 'Asset Register', description: 'Asset master & tracking', icon: Warehouse, color: '#EA580C', route: '/finance/fixedassets', implemented: false },
      { key: 'depreciation', name: 'Depreciation', description: 'Schedules & calculations', icon: TrendingDown, color: '#F97316', route: '/finance/depreciation', implemented: false },
      { key: 'assetdisposal', name: 'Asset Disposal', description: 'Sales, transfers & write-offs', icon: Scissors, color: '#FB923C', route: '/finance/assetdisposal', implemented: false },
      { key: 'leases', name: 'Lease Accounting', description: 'ASC 842 compliance', icon: FileStack, color: '#C2410C', route: '/finance/leases', implemented: false },
      { key: 'cip', name: 'Capital Projects', description: 'CIP & project tracking', icon: Target, color: '#9A3412', route: '/finance/cip', implemented: false },
      { key: 'assetinventory', name: 'Physical Inventory', description: 'Asset counts & barcode', icon: Scan, color: '#7C2D12', route: '/finance/assetinventory', implemented: false },
    ],
  },
  {
    key: 'budget',
    name: 'Budgeting & Planning',
    color: '#CA8A04',
    modules: [
      { key: 'budgets', name: 'Budgets', description: 'Annual & department budgets', icon: PiggyBank, color: '#CA8A04', route: '/finance/budgets', implemented: true },
      { key: 'variance', name: 'Variance Analysis', description: 'Budget vs actual reporting', icon: BarChart3, color: '#EAB308', route: '/finance/variance', implemented: false },
      { key: 'forecasting', name: 'Forecasting', description: 'Rolling forecasts & scenarios', icon: TrendingUp, color: '#FACC15', route: '/finance/forecasting', implemented: false },
      { key: 'capex', name: 'CapEx Planning', description: 'Capital expenditure tracking', icon: Building, color: '#A16207', route: '/finance/capex', implemented: false },
      { key: 'headcountplan', name: 'Headcount Planning', description: 'Personnel budget planning', icon: Users, color: '#92400E', route: '/finance/headcountplan', implemented: false },
    ],
  },
  {
    key: 'costing',
    name: 'Cost Accounting',
    color: '#7C3AED',
    modules: [
      { key: 'costcenters', name: 'Cost Centers', description: 'Cost center hierarchy', icon: GitBranch, color: '#7C3AED', route: '/finance/costcenters', implemented: false },
      { key: 'costabc', name: 'Activity-Based Costing', description: 'ABC allocation & overhead', icon: FilePieChart, color: '#8B5CF6', route: '/finance/costabc', implemented: false },
      { key: 'productcost', name: 'Product Costing', description: 'Standard & actual costs', icon: Package, color: '#A78BFA', route: '/finance/productcost', implemented: false },
      { key: 'jobcost', name: 'Job Costing', description: 'Project & job cost tracking', icon: ClipboardList, color: '#6D28D9', route: '/finance/jobcost', implemented: false },
      { key: 'profitability', name: 'Profitability Analysis', description: 'By product, customer, channel', icon: BarChart2, color: '#5B21B6', route: '/finance/profitability', implemented: false },
    ],
  },
  {
    key: 'payroll',
    name: 'Payroll',
    color: '#0D9488',
    modules: [
      { key: 'payroll', name: 'Payroll Processing', description: 'Pay calculation & processing', icon: Wallet, color: '#0D9488', route: '/finance/payroll', implemented: true },
      { key: 'payrollconfig', name: 'Pay Configuration', description: 'Rates, schedules & rules', icon: Settings, color: '#14B8A6', route: '/finance/payrollconfig', implemented: false },
      { key: 'deductions', name: 'Deductions', description: 'Benefits & garnishments', icon: Percent, color: '#2DD4BF', route: '/finance/deductions', implemented: false },
      { key: 'directdeposit', name: 'Direct Deposit', description: 'ACH & pay card setup', icon: CreditCardIcon, color: '#0F766E', route: '/finance/directdeposit', implemented: false },
      { key: 'payrolltax', name: 'Payroll Taxes', description: 'Withholding & deposits', icon: Calculator, color: '#115E59', route: '/finance/payrolltax', implemented: false },
      { key: 'w2', name: 'W-2 Processing', description: 'Year-end W-2 generation', icon: FileCheck, color: '#134E4A', route: '/finance/w2', implemented: false },
      { key: 'certifiedpay', name: 'Certified Payroll', description: 'Prevailing wage tracking', icon: Award, color: '#5EEAD4', route: '/finance/certifiedpay', implemented: false },
    ],
  },
  {
    key: 'tax',
    name: 'Tax Management',
    color: '#BE185D',
    modules: [
      { key: 'taxes', name: 'Tax Records', description: 'Tax filings & compliance', icon: Calculator, color: '#BE185D', route: '/finance/taxes', implemented: true },
      { key: 'salestax', name: 'Sales Tax', description: 'Calculation & filing', icon: Percent, color: '#DB2777', route: '/finance/salestax', implemented: false },
      { key: 'taxexempt', name: 'Tax Exemptions', description: 'Certificates & tracking', icon: FileQuestion, color: '#EC4899', route: '/finance/taxexempt', implemented: false },
      { key: 'propertytax', name: 'Property Tax', description: 'Tracking & payments', icon: Home, color: '#9D174D', route: '/finance/propertytax', implemented: false },
      { key: 'incometax', name: 'Income Tax', description: 'Provision & estimates', icon: Coins, color: '#831843', route: '/finance/incometax', implemented: false },
    ],
  },
  {
    key: 'close',
    name: 'Period Close',
    color: '#4F46E5',
    modules: [
      { key: 'periodclose', name: 'Period Close', description: 'Month & year-end close', icon: Lock, color: '#4F46E5', route: '/finance/periodclose', implemented: false },
      { key: 'closechecklist', name: 'Close Checklist', description: 'Month-end checklist', icon: ListChecks, color: '#6366F1', route: '/finance/closechecklist', implemented: false },
      { key: 'periodlock', name: 'Period Lock', description: 'Lock/unlock periods', icon: Unlock, color: '#818CF8', route: '/finance/periodlock', implemented: false },
      { key: 'adjusting', name: 'Adjusting Entries', description: 'Period adjustments', icon: FileInput, color: '#4338CA', route: '/finance/adjusting', implemented: false },
      { key: 'audittrail', name: 'Audit Trail', description: 'Transaction history', icon: Eye, color: '#3730A3', route: '/finance/audittrail', implemented: false },
    ],
  },
];

export default function FinanceHubScreen() {
  const { colors } = useTheme();
  const { company, userProfile } = useUser();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['gl', 'ap', 'ar']);

  const { data: financeStats, refetch: refetchStats } = useFinanceStatsQuery();

  const hasFinanceAccess = React.useMemo(() => {
    if (isSuperAdminRole(userProfile?.role)) return true;
    if (isSuperAdmin) return true;
    return hasPermission('finance', 'view');
  }, [userProfile?.role, isSuperAdmin, hasPermission]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchStats();
    } finally {
      setRefreshing(false);
    }
  }, [refetchStats]);

  const stats = React.useMemo(() => {
    if (!financeStats) {
      return {
        apOverdueCount: 0,
        totalAPDue: 0,
        totalARDue: 0,
        cashBalance: 0,
        budgetUsed: '0',
        activeVendorsCount: 0,
      };
    }

    const budgetPercent = financeStats.budgetTotal > 0 
      ? ((financeStats.budgetUsed / financeStats.budgetTotal) * 100).toFixed(1) 
      : '0';

    return {
      apOverdueCount: financeStats.apOverdueCount,
      totalAPDue: financeStats.totalAPDue,
      totalARDue: financeStats.totalARDue,
      cashBalance: financeStats.cashBalance,
      budgetUsed: budgetPercent,
      activeVendorsCount: financeStats.activeVendorsCount,
    };
  }, [financeStats]);

  if (!hasFinanceAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.accessDeniedContainer}>
          <View style={[styles.accessDeniedIcon, { backgroundColor: colors.error + '15' }]}>
            <ShieldOff size={48} color={colors.error} />
          </View>
          <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>Access Restricted</Text>
          <Text style={[styles.accessDeniedMessage, { color: colors.textSecondary }]}>
            You don&apos;t have permission to access the Finance module. Please contact your administrator to request access.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleModulePress = (module: FinanceModule) => {
    router.push(module.route as any);
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const getTotalModules = () => {
    return FINANCE_CATEGORIES.reduce((sum, cat) => sum + cat.modules.length, 0);
  };

  const getImplementedModules = () => {
    return FINANCE_CATEGORIES.reduce((sum, cat) => 
      sum + cat.modules.filter(m => m.implemented).length, 0);
  };

  const renderModuleCard = (module: FinanceModule) => {
    const IconComponent = module.icon;
    const isDisabled = !module.implemented;

    return (
      <TouchableOpacity
        key={module.key}
        style={[
          styles.moduleCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isDisabled ? 0.6 : 1,
          },
        ]}
        onPress={() => handleModulePress(module)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.moduleIconContainer,
            { backgroundColor: `${module.color}15` },
          ]}
        >
          <IconComponent size={20} color={module.color} />
        </View>
        <View style={styles.moduleContent}>
          <Text style={[styles.moduleName, { color: colors.text }]} numberOfLines={1}>
            {module.name}
          </Text>
          <Text
            style={[styles.moduleDescription, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {module.description}
          </Text>
        </View>
        {isDisabled && (
          <View style={[styles.comingSoonBadge, { backgroundColor: `${module.color}20` }]}>
            <Text style={[styles.comingSoonText, { color: module.color }]}>
              Soon
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCategory = (category: ModuleCategory) => {
    const isExpanded = expandedCategories.includes(category.key);
    const implementedCount = category.modules.filter(m => m.implemented).length;

    return (
      <View key={category.key} style={styles.categorySection}>
        <TouchableOpacity 
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category.key)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.categoryIndicator,
              { backgroundColor: category.color },
            ]}
          />
          <Text style={[styles.categoryTitle, { color: colors.text }]}>
            {category.name}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${category.color}15` }]}>
            <Text style={[styles.categoryCount, { color: category.color }]}>
              {implementedCount}/{category.modules.length}
            </Text>
          </View>
          <ChevronsRight 
            size={18} 
            color={colors.textSecondary} 
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.modulesGrid}>
            {category.modules.map(renderModuleCard)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIconContainer, { backgroundColor: '#05966915' }]}>
              <DollarSign size={32} color="#059669" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Finance & Accounting
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {company?.name || 'Organization'} • Financial Suite
              </Text>
            </View>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {getImplementedModules()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Active
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {getTotalModules() - getImplementedModules()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Planned
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#059669' }]}>
                {FINANCE_CATEGORIES.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Categories
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#DC2626' }]}
              onPress={() => router.push('/finance/ap' as any)}
            >
              <Receipt size={20} color="#fff" />
              <Text style={styles.quickActionText}>AP Invoices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#2563EB' }]}
              onPress={() => router.push('/finance/ar' as any)}
            >
              <CreditCard size={20} color="#fff" />
              <Text style={styles.quickActionText}>AR Invoices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#7C3AED' }]}
              onPress={() => router.push('/finance/gl' as any)}
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.quickActionText}>General Ledger</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#EA580C' }]}
              onPress={() => router.push('/finance/vendors' as any)}
            >
              <Building2 size={20} color="#fff" />
              <Text style={styles.quickActionText}>Vendors</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#0D9488' }]}
              onPress={() => router.push('/finance/payroll' as any)}
            >
              <Wallet size={20} color="#fff" />
              <Text style={styles.quickActionText}>Payroll</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.metricsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Key Metrics
          </Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Cash Balance</Text>
              <Text style={[styles.metricValue, { color: '#059669' }]}>{formatCurrency(stats.cashBalance)}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>AP Outstanding</Text>
              <Text style={[styles.metricValue, { color: '#DC2626' }]}>{formatCurrency(stats.totalAPDue)}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>AR Outstanding</Text>
              <Text style={[styles.metricValue, { color: '#2563EB' }]}>{formatCurrency(stats.totalARDue)}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Budget Used</Text>
              <Text style={[styles.metricValue, { color: '#CA8A04' }]}>{stats.budgetUsed}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.categoriesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            All Modules
          </Text>
          {FINANCE_CATEGORIES.map(renderCategory)}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  accessDeniedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  accessDeniedMessage: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  quickActionsScroll: {
    gap: 10,
  },
  quickAction: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  metricCard: {
    width: '48%' as any,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  categoryIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  modulesGrid: {
    gap: 8,
    paddingLeft: 16,
  },
  moduleCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  moduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  moduleContent: {
    flex: 1,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  moduleDescription: {
    fontSize: 12,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 20,
  },
});
