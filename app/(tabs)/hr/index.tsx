import React, { useState, useCallback, useMemo } from 'react';
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
  Users,
  UserPlus,
  UserMinus,
  Briefcase,
  TrendingUp,
  Target,
  GitBranch,
  GraduationCap,
  ClipboardList,
  Clock,
  CalendarDays,
  UserCheck,
  Shield,
  Timer,
  UserCircle,
  Heart,
  Scale,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  LogOut,
  Building2,
  Network,
  FileText,
  Calendar,
  Repeat,
  MapPin,
  Award,
  Star,
  Medal,
  BookOpen,
  Video,
  CheckSquare,
  DollarSign,
  Umbrella,
  PiggyBank,
  Clipboard,
  Eye,
  Gavel,
  FileWarning,
  Search,
  MessageCircle,
  Gift,
  ThumbsUp,
  Megaphone,
  Send,
  Lightbulb,
  ChevronRight,
  Settings,
  Layers,
  BarChart3,
  CircleUser,
  FolderOpen,
  BadgeCheck,
  ShieldOff,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLicense, type ModuleVisibilityKey } from '@/contexts/LicenseContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { isSuperAdminRole } from '@/constants/roles';


interface HRModule {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  category: string;
  implemented: boolean;
}

const HR_MODULES: HRModule[] = [
  // Core HR
  {
    key: 'employees',
    name: 'Employee Master Data',
    description: 'Employee records & profiles',
    icon: Users,
    color: '#8B5CF6',
    route: '/employees',
    category: 'core',
    implemented: true,
  },
  {
    key: 'orghierarchy',
    name: 'Organizational Hierarchy',
    description: 'Org structure & reporting',
    icon: Network,
    color: '#6366F1',
    route: '/hr/orghierarchy',
    category: 'core',
    implemented: false,
  },
  {
    key: 'positions',
    name: 'Position Management',
    description: 'Job positions & descriptions',
    icon: Briefcase,
    color: '#7C3AED',
    route: '/hr/positions',
    category: 'core',
    implemented: false,
  },
  {
    key: 'departments',
    name: 'Department Management',
    description: 'Department & cost centers',
    icon: Building2,
    color: '#9333EA',
    route: '/hr/departments',
    category: 'core',
    implemented: false,
  },
  {
    key: 'portal',
    name: 'Employee Self-Service',
    description: 'Portal, directory, bulletin',
    icon: UserCircle,
    color: '#06B6D4',
    route: '/portal',
    category: 'core',
    implemented: true,
  },
  {
    key: 'headcount',
    name: 'Headcount Reporting',
    description: 'FTE & headcount analytics',
    icon: BarChart3,
    color: '#0891B2',
    route: '/headcount',
    category: 'core',
    implemented: true,
  },
  {
    key: 'orgchart',
    name: 'Org Chart Visualization',
    description: 'Interactive org chart',
    icon: GitBranch,
    color: '#0D9488',
    route: '/hr/orgchart',
    category: 'core',
    implemented: false,
  },

  // Time & Attendance
  {
    key: 'timeclock',
    name: 'Time Clock',
    description: 'Clock in/out, timesheets',
    icon: Timer,
    color: '#0EA5E9',
    route: '/timeclock',
    category: 'time',
    implemented: true,
  },
  {
    key: 'attendance',
    name: 'Attendance Tracking',
    description: 'Points & policy management',
    icon: UserCheck,
    color: '#EC4899',
    route: '/attendance',
    category: 'time',
    implemented: true,
  },
  {
    key: 'scheduling',
    name: 'Shift Scheduling',
    description: 'Shifts, templates & swaps',
    icon: Calendar,
    color: '#3B82F6',
    route: '/hr/scheduling',
    category: 'time',
    implemented: false,
  },
  {
    key: 'pto',
    name: 'PTO / Leave Requests',
    description: 'Time off & approvals',
    icon: CalendarDays,
    color: '#10B981',
    route: '/hr/pto',
    category: 'time',
    implemented: false,
  },
  {
    key: 'accruals',
    name: 'Accrual Management',
    description: 'Leave balances & rules',
    icon: Repeat,
    color: '#14B8A6',
    route: '/hr/accruals',
    category: 'time',
    implemented: false,
  },
  {
    key: 'overtime',
    name: 'Overtime Tracking',
    description: 'OT alerts & management',
    icon: Clock,
    color: '#F59E0B',
    route: '/overtime',
    category: 'time',
    implemented: true,
  },
  {
    key: 'fmla',
    name: 'FMLA / Leave Compliance',
    description: 'Protected leave tracking',
    icon: Shield,
    color: '#6366F1',
    route: '/fmla',
    category: 'time',
    implemented: true,
  },
  {
    key: 'geofencing',
    name: 'Geofencing / Location',
    description: 'Location-based tracking',
    icon: MapPin,
    color: '#EF4444',
    route: '/hr/geofencing',
    category: 'time',
    implemented: false,
  },
  {
    key: 'timeadjustments',
    name: 'Time Adjustments',
    description: 'Review time change requests',
    icon: Clock,
    color: '#F97316',
    route: '/hr/timeadjustments',
    category: 'time',
    implemented: true,
  },
  {
    key: 'breakviolations',
    name: 'Break Violations',
    description: 'Break policy alerts & review',
    icon: AlertTriangle,
    color: '#DC2626',
    route: '/hr/breakviolations',
    category: 'time',
    implemented: true,
  },
  {
    key: 'timeeditor',
    name: 'Employee Time Editor',
    description: 'Admin time management & audit',
    icon: Clock,
    color: '#8B5CF6',
    route: '/hr/timeeditor',
    category: 'time',
    implemented: true,
  },

  // Talent Acquisition
  {
    key: 'recruiting',
    name: 'Applicant Tracking (ATS)',
    description: 'Recruiting & hiring pipeline',
    icon: Briefcase,
    color: '#6366F1',
    route: '/recruiting',
    category: 'talent',
    implemented: true,
  },
  {
    key: 'requisitions',
    name: 'Job Requisitions',
    description: 'Position requests & approvals',
    icon: FileText,
    color: '#8B5CF6',
    route: '/hr/requisitions',
    category: 'talent',
    implemented: false,
  },
  {
    key: 'jobpostings',
    name: 'Job Postings',
    description: 'Job boards & career page',
    icon: Megaphone,
    color: '#7C3AED',
    route: '/hr/jobpostings',
    category: 'talent',
    implemented: false,
  },
  {
    key: 'interviews',
    name: 'Interview Management',
    description: 'Scheduling & feedback',
    icon: MessageCircle,
    color: '#9333EA',
    route: '/hr/interviews',
    category: 'talent',
    implemented: false,
  },
  {
    key: 'offers',
    name: 'Offer Management',
    description: 'Offer letters & templates',
    icon: Send,
    color: '#A855F7',
    route: '/hr/offers',
    category: 'talent',
    implemented: false,
  },
  {
    key: 'bgchecks',
    name: 'Background Checks',
    description: 'Pre-employment screening',
    icon: Search,
    color: '#C084FC',
    route: '/hr/bgchecks',
    category: 'talent',
    implemented: false,
  },
  {
    key: 'talentpool',
    name: 'Talent Pool',
    description: 'Candidate database',
    icon: FolderOpen,
    color: '#D8B4FE',
    route: '/hr/talentpool',
    category: 'talent',
    implemented: false,
  },

  // Onboarding
  {
    key: 'onboarding',
    name: 'Onboarding Workflows',
    description: 'New hire checklists & tasks',
    icon: UserPlus,
    color: '#14B8A6',
    route: '/onboarding',
    category: 'onboarding',
    implemented: true,
  },
  {
    key: 'newhireforms',
    name: 'New Hire Forms',
    description: 'I-9, W-4, direct deposit',
    icon: FileText,
    color: '#10B981',
    route: '/hr/newhireforms',
    category: 'onboarding',
    implemented: false,
  },
  {
    key: 'equipmentassign',
    name: 'Equipment Assignment',
    description: 'Asset tracking for new hires',
    icon: Layers,
    color: '#059669',
    route: '/hr/equipmentassign',
    category: 'onboarding',
    implemented: false,
  },
  {
    key: 'systemaccess',
    name: 'System Access Requests',
    description: 'IT provisioning workflow',
    icon: Settings,
    color: '#047857',
    route: '/hr/systemaccess',
    category: 'onboarding',
    implemented: false,
  },
  {
    key: 'orientation',
    name: 'Orientation Scheduling',
    description: 'Welcome & training setup',
    icon: Calendar,
    color: '#065F46',
    route: '/hr/orientation',
    category: 'onboarding',
    implemented: false,
  },
  {
    key: 'probation',
    name: 'Probation Tracking',
    description: '30/60/90 day check-ins',
    icon: CheckSquare,
    color: '#064E3B',
    route: '/hr/probation',
    category: 'onboarding',
    implemented: false,
  },

  // Offboarding
  {
    key: 'offboarding',
    name: 'Offboarding Workflows',
    description: 'Separation processing',
    icon: UserMinus,
    color: '#EF4444',
    route: '/offboarding',
    category: 'offboarding',
    implemented: true,
  },
  {
    key: 'exitinterview',
    name: 'Exit Interviews',
    description: 'Departure feedback',
    icon: LogOut,
    color: '#DC2626',
    route: '/offboarding/exitinterview',
    category: 'offboarding',
    implemented: true,
  },
  {
    key: 'equipmentreturn',
    name: 'Equipment Return',
    description: 'Asset recovery tracking',
    icon: Layers,
    color: '#B91C1C',
    route: '/hr/equipmentreturn',
    category: 'offboarding',
    implemented: false,
  },
  {
    key: 'accessrevoke',
    name: 'Access Revocation',
    description: 'System deprovisioning',
    icon: Shield,
    color: '#991B1B',
    route: '/hr/accessrevoke',
    category: 'offboarding',
    implemented: false,
  },
  {
    key: 'finalpay',
    name: 'Final Pay Calculation',
    description: 'PTO payout & final wages',
    icon: DollarSign,
    color: '#7F1D1D',
    route: '/hr/finalpay',
    category: 'offboarding',
    implemented: false,
  },
  {
    key: 'rehireelig',
    name: 'Rehire Eligibility',
    description: 'Former employee tracking',
    icon: BadgeCheck,
    color: '#64748B',
    route: '/hr/rehireelig',
    category: 'offboarding',
    implemented: false,
  },

  // Performance Management
  {
    key: 'performance',
    name: 'Performance Reviews',
    description: 'Review cycles & ratings',
    icon: TrendingUp,
    color: '#F59E0B',
    route: '/performance',
    category: 'performance',
    implemented: true,
  },
  {
    key: 'goals',
    name: 'Goal Setting & Tracking',
    description: 'SMART goals & OKRs',
    icon: Target,
    color: '#EAB308',
    route: '/goals',
    category: 'performance',
    implemented: true,
  },
  {
    key: '360feedback',
    name: '360-Degree Feedback',
    description: 'Multi-rater assessments',
    icon: Star,
    color: '#D97706',
    route: '/hr/360feedback',
    category: 'performance',
    implemented: false,
  },
  {
    key: 'pip',
    name: 'Performance Improvement',
    description: 'PIP tracking & milestones',
    icon: TrendingUp,
    color: '#B45309',
    route: '/hr/pip',
    category: 'performance',
    implemented: false,
  },
  {
    key: 'recognition',
    name: 'Recognition & Kudos',
    description: 'Peer recognition program',
    icon: ThumbsUp,
    color: '#92400E',
    route: '/hr/recognition',
    category: 'performance',
    implemented: false,
  },
  {
    key: 'succession',
    name: 'Succession Planning',
    description: 'Talent pipeline & 9-box',
    icon: GitBranch,
    color: '#78350F',
    route: '/succession',
    category: 'performance',
    implemented: true,
  },
  {
    key: 'careerpath',
    name: 'Career Pathing',
    description: 'Development plans',
    icon: Award,
    color: '#451A03',
    route: '/hr/careerpath',
    category: 'performance',
    implemented: false,
  },

  // Learning & Development
  {
    key: 'lms',
    name: 'Learning Management (LMS)',
    description: 'Course catalog & assignments',
    icon: GraduationCap,
    color: '#14B8A6',
    route: '/lms',
    category: 'learning',
    implemented: true,
  },
  {
    key: 'coursecatalog',
    name: 'Course Catalog',
    description: 'Training library',
    icon: BookOpen,
    color: '#0D9488',
    route: '/hr/coursecatalog',
    category: 'learning',
    implemented: false,
  },
  {
    key: 'certifications',
    name: 'Certification Tracking',
    description: 'Certs & expirations',
    icon: Award,
    color: '#0F766E',
    route: '/hr/certifications',
    category: 'learning',
    implemented: false,
  },
  {
    key: 'compliancetraining',
    name: 'Compliance Training',
    description: 'Required training tracking',
    icon: CheckSquare,
    color: '#115E59',
    route: '/hr/compliancetraining',
    category: 'learning',
    implemented: false,
  },
  {
    key: 'ilt',
    name: 'Instructor-Led Training',
    description: 'Classroom & scheduling',
    icon: Video,
    color: '#134E4A',
    route: '/hr/ilt',
    category: 'learning',
    implemented: false,
  },
  {
    key: 'skillsinventory',
    name: 'Skills Inventory',
    description: 'Competency gap analysis',
    icon: Medal,
    color: '#042F2E',
    route: '/hr/skillsinventory',
    category: 'learning',
    implemented: false,
  },

  // Benefits Administration
  {
    key: 'benefits',
    name: 'Benefits Enrollment',
    description: 'Open enrollment & plans',
    icon: Heart,
    color: '#F43F5E',
    route: '/benefits',
    category: 'benefits',
    implemented: true,
  },
  {
    key: 'dependents',
    name: 'Dependent Management',
    description: 'Family & beneficiaries',
    icon: Users,
    color: '#E11D48',
    route: '/hr/dependents',
    category: 'benefits',
    implemented: false,
  },
  {
    key: 'hsa',
    name: 'HSA / FSA Administration',
    description: 'Health spending accounts',
    icon: PiggyBank,
    color: '#BE123C',
    route: '/hr/hsa',
    category: 'benefits',
    implemented: false,
  },
  {
    key: '401k',
    name: '401(k) Management',
    description: 'Retirement contributions',
    icon: DollarSign,
    color: '#9F1239',
    route: '/hr/401k',
    category: 'benefits',
    implemented: false,
  },
  {
    key: 'cobra',
    name: 'COBRA Administration',
    description: 'Continuation coverage',
    icon: Umbrella,
    color: '#881337',
    route: '/hr/cobra',
    category: 'benefits',
    implemented: false,
  },
  {
    key: 'lifeinsurance',
    name: 'Life & Disability',
    description: 'Insurance management',
    icon: Shield,
    color: '#831843',
    route: '/hr/lifeinsurance',
    category: 'benefits',
    implemented: false,
  },

  // HR Compliance & Reporting
  {
    key: 'i9everify',
    name: 'I-9 / E-Verify',
    description: 'Employment eligibility',
    icon: FileCheck,
    color: '#0284C7',
    route: '/i9everify',
    category: 'compliance',
    implemented: true,
  },
  {
    key: 'eeoc',
    name: 'EEOC / EEO-1 Reporting',
    description: 'Equal opportunity compliance',
    icon: Scale,
    color: '#0369A1',
    route: '/eeoc',
    category: 'compliance',
    implemented: true,
  },
  {
    key: 'ada',
    name: 'ADA Accommodations',
    description: 'Accommodation tracking',
    icon: Eye,
    color: '#075985',
    route: '/hr/ada',
    category: 'compliance',
    implemented: false,
  },
  {
    key: 'aca',
    name: 'ACA Compliance',
    description: '1094-C, 1095-C reporting',
    icon: Clipboard,
    color: '#0C4A6E',
    route: '/hr/aca',
    category: 'compliance',
    implemented: false,
  },
  {
    key: 'disciplinary',
    name: 'Disciplinary Actions',
    description: 'Progressive discipline',
    icon: AlertTriangle,
    color: '#EA580C',
    route: '/disciplinary',
    category: 'compliance',
    implemented: true,
  },
  {
    key: 'grievance',
    name: 'Grievance Management',
    description: 'Complaints & investigations',
    icon: MessageSquare,
    color: '#C2410C',
    route: '/grievance',
    category: 'compliance',
    implemented: true,
  },
  {
    key: 'hrcase',
    name: 'HR Case Management',
    description: 'Employee relations',
    icon: FolderOpen,
    color: '#9A3412',
    route: '/hr/hrcase',
    category: 'compliance',
    implemented: false,
  },
  {
    key: 'policyack',
    name: 'Policy Acknowledgments',
    description: 'Handbook & compliance',
    icon: FileWarning,
    color: '#7C2D12',
    route: '/hr/policyack',
    category: 'compliance',
    implemented: false,
  },
  {
    key: 'laborlaw',
    name: 'Labor Law Compliance',
    description: 'Posters & regulations',
    icon: Gavel,
    color: '#431407',
    route: '/hr/laborlaw',
    category: 'compliance',
    implemented: false,
  },

  // Employee Engagement
  {
    key: 'surveys',
    name: 'Employee Surveys',
    description: 'Engagement & pulse surveys',
    icon: ClipboardList,
    color: '#EC4899',
    route: '/surveys',
    category: 'engagement',
    implemented: true,
  },
  {
    key: 'announcements',
    name: 'Announcements',
    description: 'Bulletin board & news',
    icon: Megaphone,
    color: '#DB2777',
    route: '/hr/announcements',
    category: 'engagement',
    implemented: false,
  },
  {
    key: 'directory',
    name: 'Employee Directory',
    description: 'Company-wide directory',
    icon: CircleUser,
    color: '#BE185D',
    route: '/portal/directory',
    category: 'engagement',
    implemented: true,
  },
  {
    key: 'celebrations',
    name: 'Milestones & Celebrations',
    description: 'Birthdays & anniversaries',
    icon: Gift,
    color: '#9D174D',
    route: '/hr/celebrations',
    category: 'engagement',
    implemented: false,
  },
  {
    key: 'peerrecognition',
    name: 'Peer Recognition',
    description: 'Social recognition',
    icon: ThumbsUp,
    color: '#831843',
    route: '/hr/peerrecognition',
    category: 'engagement',
    implemented: false,
  },
  {
    key: 'referrals',
    name: 'Employee Referrals',
    description: 'Referral program',
    icon: Send,
    color: '#701A75',
    route: '/hr/referrals',
    category: 'engagement',
    implemented: false,
  },
  {
    key: 'suggestions',
    name: 'Suggestion Box',
    description: 'Anonymous feedback',
    icon: Lightbulb,
    color: '#86198F',
    route: '/hr/suggestions',
    category: 'engagement',
    implemented: false,
  },
];

const CATEGORIES = [
  { key: 'core', name: 'Core HR', color: '#8B5CF6' },
  { key: 'time', name: 'Time & Attendance', color: '#0EA5E9' },
  { key: 'talent', name: 'Talent Acquisition', color: '#6366F1' },
  { key: 'onboarding', name: 'Onboarding', color: '#14B8A6' },
  { key: 'offboarding', name: 'Offboarding', color: '#EF4444' },
  { key: 'performance', name: 'Performance Management', color: '#F59E0B' },
  { key: 'learning', name: 'Learning & Development', color: '#14B8A6' },
  { key: 'benefits', name: 'Benefits Administration', color: '#F43F5E' },
  { key: 'compliance', name: 'HR Compliance & Reporting', color: '#0284C7' },
  { key: 'engagement', name: 'Employee Engagement', color: '#EC4899' },
];

const MODULE_LICENSE_MAP: Record<string, ModuleVisibilityKey | null> = {
  employees: 'employees',
  orghierarchy: 'hr',
  positions: 'hr',
  departments: 'hr',
  portal: 'portal',
  headcount: 'headcount',
  orgchart: 'hr',
  timeclock: 'timeclock',
  attendance: 'attendance',
  scheduling: 'hr',
  pto: 'hr',
  accruals: 'hr',
  overtime: 'overtime',
  fmla: 'fmla',
  geofencing: 'hr',
  recruiting: 'recruiting',
  requisitions: 'recruiting',
  jobpostings: 'recruiting',
  interviews: 'recruiting',
  offers: 'recruiting',
  bgchecks: 'recruiting',
  talentpool: 'recruiting',
  onboarding: 'onboarding',
  newhireforms: 'onboarding',
  equipmentassign: 'onboarding',
  systemaccess: 'onboarding',
  orientation: 'onboarding',
  probation: 'onboarding',
  offboarding: 'offboarding',
  exitinterview: 'offboarding',
  equipmentreturn: 'offboarding',
  accessrevoke: 'offboarding',
  finalpay: 'offboarding',
  rehireelig: 'offboarding',
  performance: 'performance',
  goals: 'goals',
  '360feedback': 'performance',
  pip: 'performance',
  recognition: 'performance',
  succession: 'succession',
  careerpath: 'performance',
  lms: 'lms',
  coursecatalog: 'lms',
  certifications: 'lms',
  compliancetraining: 'lms',
  ilt: 'lms',
  skillsinventory: 'lms',
  benefits: 'benefits',
  dependents: 'benefits',
  hsa: 'benefits',
  '401k': 'benefits',
  cobra: 'benefits',
  lifeinsurance: 'benefits',
  i9everify: 'i9everify',
  eeoc: 'eeoc',
  ada: 'hr',
  aca: 'hr',
  disciplinary: 'disciplinary',
  grievance: 'grievance',
  hrcase: 'hr',
  policyack: 'hr',
  laborlaw: 'hr',
  surveys: 'surveys',
  announcements: 'hr',
  directory: 'portal',
  celebrations: 'hr',
  peerrecognition: 'hr',
  referrals: 'recruiting',
  suggestions: 'hr',
  timeadjustments: 'timeclock',
  breakviolations: 'timeclock',
  timeeditor: 'timeclock',
};

export default function HRHubScreen() {
  const { colors } = useTheme();
  const { company, userProfile } = useUser();
  const { isModuleVisibleByLicense } = useLicense();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    CATEGORIES.map((c) => c.key)
  );

  const hasHRAccess = useMemo(() => {
    if (isSuperAdminRole(userProfile?.role)) return true;
    if (isSuperAdmin) return true;
    return hasPermission('hr', 'view');
  }, [userProfile?.role, isSuperAdmin, hasPermission]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isModuleVisible = useCallback((moduleKey: string): boolean => {
    const licenseKey = MODULE_LICENSE_MAP[moduleKey];
    if (!licenseKey) return true;
    return isModuleVisibleByLicense(licenseKey);
  }, [isModuleVisibleByLicense]);

  const visibleModules = useMemo(() => {
    return HR_MODULES.filter((m) => isModuleVisible(m.key));
  }, [isModuleVisible]);

  if (!hasHRAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.accessDeniedContainer}>
          <View style={[styles.accessDeniedIcon, { backgroundColor: colors.error + '15' }]}>
            <ShieldOff size={48} color={colors.error} />
          </View>
          <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>Access Restricted</Text>
          <Text style={[styles.accessDeniedMessage, { color: colors.textSecondary }]}>
            You don&apos;t have permission to access the HR module. Please contact your administrator to request access.
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

  const handleModulePress = (module: HRModule) => {
    router.push(module.route as any);
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryKey)
        ? prev.filter((k) => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  const getModulesByCategory = (category: string) => {
    return HR_MODULES.filter((m) => m.category === category && isModuleVisible(m.key));
  };

  const renderModuleCard = (module: HRModule) => {
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
          <IconComponent size={22} color={module.color} />
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

  const renderCategory = (category: typeof CATEGORIES[0]) => {
    const modules = getModulesByCategory(category.key);
    if (modules.length === 0) return null;
    const isExpanded = expandedCategories.includes(category.key);
    const implementedCount = modules.filter((m) => m.implemented).length;

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
          <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
            {implementedCount}/{modules.length}
          </Text>
          <ChevronRight
            size={18}
            color={colors.textSecondary}
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
            }}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.modulesGrid}>
            {modules.map(renderModuleCard)}
          </View>
        )}
      </View>
    );
  };

  const implementedCount = visibleModules.filter((m) => m.implemented).length;
  const totalCount = visibleModules.length;

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
        {/* Header Stats */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Users size={32} color="#8B5CF6" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Human Resources
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {company?.name || 'Organization'} • HCM Suite
              </Text>
            </View>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {implementedCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Active Modules
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {totalCount - implementedCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Coming Soon
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
                {CATEGORIES.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Categories
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.quickActionsTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#8B5CF6' }]}
              onPress={() => router.push('/employees')}
            >
              <Users size={20} color="#fff" />
              <Text style={styles.quickActionText}>Employees</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#14B8A6' }]}
              onPress={() => router.push('/onboarding')}
            >
              <UserPlus size={20} color="#fff" />
              <Text style={styles.quickActionText}>New Hire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#0EA5E9' }]}
              onPress={() => router.push('/timeclock')}
            >
              <Timer size={20} color="#fff" />
              <Text style={styles.quickActionText}>Time Clock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/timeclock/kiosk')}
            >
              <MapPin size={20} color="#fff" />
              <Text style={styles.quickActionText}>Location Hub</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/performance')}
            >
              <TrendingUp size={20} color="#fff" />
              <Text style={styles.quickActionText}>Reviews</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#F43F5E' }]}
              onPress={() => router.push('/benefits')}
            >
              <Heart size={20} color="#fff" />
              <Text style={styles.quickActionText}>Benefits</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Module Categories */}
        {CATEGORIES.map(renderCategory)}

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
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
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  quickActionsScroll: {
    gap: 10,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
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
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
  },
  categoryIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    marginRight: 8,
  },
  modulesGrid: {
    gap: 8,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  moduleIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 4,
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
