import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  MapPin,
  Layers,
  Users,
  Wrench,
  Package,
  ChevronRight,
  Play,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Shield,
  Crown,
  UserCog,
  Key,
  Settings,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';

interface SetupStep {
  id: string;
  number: number;
  title: string;
  description: string;
  details: string[];
  icon: typeof Building2;
  route: string;
  tip?: string;
}

interface AdminRole {
  id: string;
  title: string;
  description: string;
  icon: typeof Shield;
  color: string;
  responsibilities: string[];
  loginMethod: string;
}

const PLATFORM_ADMIN_ROLE: AdminRole = {
  id: 'platform_admin',
  title: 'Platform Admin',
  description: 'TulKenz OPS platform owner/operator',
  icon: Crown,
  color: '#F59E0B',
  responsibilities: [
    'Create and manage all organizations',
    'Set subscription tiers for each organization',
    'Configure SuperAdmin credentials for each org',
    'Access platform-wide analytics and settings',
  ],
  loginMethod: 'Use "Platform Admin" link on login screen',
};

const ADMIN_ROLES: AdminRole[] = [
  {
    id: 'super_admin',
    title: 'Super Admin',
    description: 'Organization-level administrator',
    icon: Shield,
    color: '#8B5CF6',
    responsibilities: [
      'Configure organization profile and branding',
      'Set up facilities, departments, and areas',
      'Manage employee accounts and permissions',
      'Control module access for their organization',
    ],
    loginMethod: 'Use "Organization" login with email/password',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Department or module-specific admin',
    icon: UserCog,
    color: '#3B82F6',
    responsibilities: [
      'Manage specific modules (CMMS, Inventory, etc.)',
      'Add equipment, materials, work orders',
      'Approve requests within their department',
      'View reports for their assigned areas',
    ],
    loginMethod: 'Use "Employee" login with employee code/PIN',
  },
];

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'organization',
    number: 1,
    title: 'Organization Setup',
    description: 'Configure your company profile and branding',
    details: [
      'Enter your company name and contact information',
      'Upload your company logo for internal branding',
      'Set your primary industry and business type',
      'Configure timezone and regional settings',
    ],
    icon: Building2,
    route: '/settings/organization',
    tip: 'Your company branding will appear throughout the app while TulKenz OPS remains the platform name.',
  },
  {
    id: 'facilities',
    number: 2,
    title: 'Facilities',
    description: 'Add your physical locations and plants',
    details: [
      'Create entries for each building, plant, or site',
      'Add address and contact details for each facility',
      'Set facility codes for easy identification',
      'Designate primary and secondary facilities',
    ],
    icon: Building2,
    route: '/settings/facilities',
    tip: 'Start with your main facility. You can always add more locations later as your organization grows.',
  },
  {
    id: 'departments',
    number: 3,
    title: 'Departments',
    description: 'Define department structure with unique codes',
    details: [
      'Create departments with unique numeric prefixes (e.g., 1xxxxx for Maintenance)',
      'Assign department managers and cost centers',
      'Link departments to specific facilities',
      'Standard departments: Maintenance, Sanitation, Quality, Production',
    ],
    icon: Layers,
    route: '/settings/departments',
    tip: 'Department codes help organize materials and equipment. For example, Maintenance (1xxxxx) means all their materials start with 1.',
  },
  {
    id: 'areas',
    number: 4,
    title: 'Areas & Locations',
    description: 'Map out physical spaces within facilities',
    details: [
      'Create rooms, zones, and work areas',
      'Associate areas with their parent facility',
      'Assign areas to responsible departments',
      'Examples: Parts Room A, Warehouse B, Production Line 3',
    ],
    icon: MapPin,
    route: '/settings/areas',
    tip: 'Areas represent where equipment lives and where materials are stored. Think of them as physical addresses within your facility.',
  },
  {
    id: 'equipment',
    number: 5,
    title: 'Equipment',
    description: 'Register equipment and assets in each area',
    details: [
      'Add equipment to specific areas/locations',
      'Record serial numbers, purchase dates, warranties',
      'Set up maintenance schedules',
      'Examples: Forklifts in Warehouse, Grinders in Production',
    ],
    icon: Wrench,
    route: '/cmms/equipment',
    tip: 'Equipment is managed in the CMMS module. Module admins can add equipment as needed without Super Admin access.',
  },
  {
    id: 'materials',
    number: 6,
    title: 'Materials & Inventory',
    description: 'Set up your parts and supplies inventory',
    details: [
      'Create materials with department-coded numbers',
      'Set storage locations within areas',
      'Configure reorder points and stock levels',
      'Same material numbers across facilities, different stock levels',
    ],
    icon: Package,
    route: '/inventory',
    tip: 'Materials inherit the department code prefix. A Maintenance part might be 1000001, while a Sanitation supply is 2000001.',
  },
  {
    id: 'people',
    number: 7,
    title: 'People Management',
    description: 'Add users, roles, and permissions',
    details: [
      'Create user accounts for your team',
      'Define roles with specific module permissions',
      'Assign users to facilities and departments',
      'Set up approval hierarchies',
    ],
    icon: Users,
    route: '/settings/roles',
    tip: 'Start with basic roles (Admin, Manager, User) then customize as you understand your team\'s needs.',
  },
];

export default function GettingStartedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { company, isPlatformAdmin } = useUser();
  const [expandedStep, setExpandedStep] = useState<string | null>('organization');
  const [showRolesSection, setShowRolesSection] = useState(true);

  const toggleStep = useCallback((stepId: string) => {
    setExpandedStep(prev => prev === stepId ? null : stepId);
  }, []);

  const navigateToStep = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  const renderStepCard = (step: SetupStep) => {
    const isExpanded = expandedStep === step.id;
    const Icon = step.icon;

    return (
      <View
        key={step.id}
        style={[
          styles.stepCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Pressable
          style={styles.stepHeader}
          onPress={() => toggleStep(step.id)}
        >
          <View style={styles.stepNumberContainer}>
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                {step.number}
              </Text>
            </View>
            {step.number < SETUP_STEPS.length && (
              <View
                style={[styles.stepConnector, { backgroundColor: colors.border }]}
              />
            )}
          </View>

          <View style={styles.stepHeaderContent}>
            <View style={styles.stepTitleRow}>
              <View
                style={[
                  styles.stepIconContainer,
                  { backgroundColor: colors.infoBg },
                ]}
              >
                <Icon size={18} color={colors.primary} />
              </View>
              <View style={styles.stepTitleText}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {step.title}
                </Text>
                <Text
                  style={[styles.stepDescription, { color: colors.textSecondary }]}
                  numberOfLines={isExpanded ? undefined : 1}
                >
                  {step.description}
                </Text>
              </View>
            </View>
            <ChevronRight
              size={20}
              color={colors.textTertiary}
              style={{
                transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
              }}
            />
          </View>
        </Pressable>

        {isExpanded && (
          <View style={[styles.stepDetails, { borderTopColor: colors.border }]}>
            <View style={styles.detailsList}>
              {step.details.map((detail, index) => (
                <View key={index} style={styles.detailItem}>
                  <View
                    style={[styles.detailBullet, { backgroundColor: colors.primary }]}
                  />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {detail}
                  </Text>
                </View>
              ))}
            </View>

            {step.tip && (
              <View
                style={[styles.tipContainer, { backgroundColor: colors.warningBg }]}
              >
                <Lightbulb size={16} color={colors.warning} />
                <Text style={[styles.tipText, { color: colors.text }]}>
                  {step.tip}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={() => navigateToStep(step.route)}
            >
              <Play size={16} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Go to {step.title}</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '15' }]}>
            <BookOpen size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Welcome to TulKenz OPS
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {isPlatformAdmin 
              ? 'As Platform Admin, you manage all organizations. Create organizations and set up their SuperAdmins below.'
              : 'Follow these steps to set up your organization. Each step builds on the previous one to create a complete operational structure.'
            }
          </Text>
        </View>

        {/* Admin Roles Section */}
        <View style={styles.rolesSection}>
          <Pressable
            style={styles.rolesSectionHeader}
            onPress={() => setShowRolesSection(!showRolesSection)}
          >
            <View style={styles.rolesSectionTitleRow}>
              <View style={[styles.rolesSectionIcon, { backgroundColor: colors.warningBg }]}>
                <Key size={18} color={colors.warning} />
              </View>
              <Text style={[styles.rolesSectionTitle, { color: colors.text }]}>
                Admin Roles & Access
              </Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.textTertiary}
              style={{ transform: [{ rotate: showRolesSection ? '90deg' : '0deg' }] }}
            />
          </Pressable>
          
          {showRolesSection && (
            <View style={styles.rolesContent}>
              {isPlatformAdmin && (
                <View
                  style={[
                    styles.roleCard,
                    { backgroundColor: colors.surface, borderColor: PLATFORM_ADMIN_ROLE.color, borderWidth: 2 },
                  ]}
                >
                  <View style={styles.roleHeader}>
                    <View style={[styles.roleIconContainer, { backgroundColor: PLATFORM_ADMIN_ROLE.color + '20' }]}>
                      <Crown size={20} color={PLATFORM_ADMIN_ROLE.color} />
                    </View>
                    <View style={styles.roleHeaderText}>
                      <Text style={[styles.roleTitle, { color: colors.text }]}>{PLATFORM_ADMIN_ROLE.title}</Text>
                      <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                        {PLATFORM_ADMIN_ROLE.description}
                      </Text>
                    </View>
                    <View style={[styles.youBadge, { backgroundColor: PLATFORM_ADMIN_ROLE.color }]}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.loginMethodBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <Key size={14} color={colors.textTertiary} />
                    <Text style={[styles.loginMethodText, { color: colors.textSecondary }]}>
                      {PLATFORM_ADMIN_ROLE.loginMethod}
                    </Text>
                  </View>
                  
                  <View style={styles.responsibilitiesList}>
                    {PLATFORM_ADMIN_ROLE.responsibilities.map((resp, idx) => (
                      <View key={idx} style={styles.responsibilityItem}>
                        <View style={[styles.responsibilityBullet, { backgroundColor: PLATFORM_ADMIN_ROLE.color }]} />
                        <Text style={[styles.responsibilityText, { color: colors.textSecondary }]}>
                          {resp}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {ADMIN_ROLES.map((role, index) => {
                const RoleIcon = role.icon;
                const isSuperAdminRole = role.id === 'super_admin';
                const isCurrentUserRole = isSuperAdminRole && !isPlatformAdmin;
                return (
                  <View
                    key={role.id}
                    style={[
                      styles.roleCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isCurrentUserRole && { borderColor: role.color, borderWidth: 2 },
                    ]}
                  >
                    <View style={styles.roleHeader}>
                      <View style={[styles.roleIconContainer, { backgroundColor: role.color + '20' }]}>
                        <RoleIcon size={20} color={role.color} />
                      </View>
                      <View style={styles.roleHeaderText}>
                        <Text style={[styles.roleTitle, { color: colors.text }]}>{role.title}</Text>
                        <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                          {role.description}
                        </Text>
                      </View>
                      {isCurrentUserRole && (
                        <View style={[styles.youBadge, { backgroundColor: role.color }]}>
                          <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={[styles.loginMethodBox, { backgroundColor: colors.backgroundSecondary }]}>
                      <Key size={14} color={colors.textTertiary} />
                      <Text style={[styles.loginMethodText, { color: colors.textSecondary }]}>
                        {role.loginMethod}
                      </Text>
                    </View>
                    
                    <View style={styles.responsibilitiesList}>
                      {role.responsibilities.map((resp, idx) => (
                        <View key={idx} style={styles.responsibilityItem}>
                          <View style={[styles.responsibilityBullet, { backgroundColor: role.color }]} />
                          <Text style={[styles.responsibilityText, { color: colors.textSecondary }]}>
                            {resp}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
              
              <View style={[styles.workflowBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
                <Lightbulb size={18} color={colors.info} />
                <View style={styles.workflowContent}>
                  <Text style={[styles.workflowTitle, { color: colors.info }]}>Setup Workflow</Text>
                  <Text style={[styles.workflowText, { color: colors.text }]}>
                    {isPlatformAdmin 
                      ? `1. Platform Admin creates organization in "Manage Organizations"\n2. Platform Admin sets SuperAdmin email & password in "SuperAdmin" tab\n3. SuperAdmin logs in via Organization login\n4. SuperAdmin configures org settings, facilities, employees\n5. Module Admins are assigned by SuperAdmin to manage specific areas`
                      : `1. SuperAdmin configures organization profile and branding\n2. Set up facilities, departments, and areas\n3. Add employees and assign roles\n4. Module Admins manage their specific areas\n5. Employees access the app with their credentials`
                    }
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {isPlatformAdmin && (
          <View style={[styles.platformAdminCard, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
            <Crown size={24} color={colors.warning} />
            <View style={styles.platformAdminContent}>
              <Text style={[styles.platformAdminTitle, { color: colors.warning }]}>
                Platform Admin Quick Actions
              </Text>
              <Text style={[styles.platformAdminText, { color: colors.text }]}>
                Go to &quot;Manage Organizations&quot; to create new organizations and set up their SuperAdmins.
              </Text>
              <Pressable
                style={[styles.platformAdminButton, { backgroundColor: colors.warning }]}
                onPress={() => router.push('/settings/organizations')}
              >
                <Settings size={16} color="#FFFFFF" />
                <Text style={styles.platformAdminButtonText}>Manage Organizations</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.flowDiagram}>
          <Text style={[styles.flowTitle, { color: colors.textSecondary }]}>
            {isPlatformAdmin ? 'ORGANIZATION SETUP HIERARCHY' : 'SETUP FLOW'}
          </Text>
          <View style={[styles.flowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.flowText, { color: colors.text }]}>
              {isPlatformAdmin 
                ? 'Platform Admin → Create Org → Set SuperAdmin → SuperAdmin Configures Org'
                : 'Organization → Facility → Department → Area → Equipment & Materials → People'
              }
            </Text>
            <Text style={[styles.flowDescription, { color: colors.textTertiary }]}>
              {isPlatformAdmin
                ? 'Each organization gets its own SuperAdmin who manages their company'
                : 'This hierarchy ensures everything is properly linked and organized'
              }
            </Text>
          </View>
        </View>

        <View style={styles.stepsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SETUP STEPS
          </Text>
          {SETUP_STEPS.map(renderStepCard)}
        </View>

        <View style={[styles.exampleSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.exampleTitle, { color: colors.text }]}>
            Example Structure
          </Text>
          <View style={[styles.codeBlock, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.codeText, { color: colors.textSecondary }]}>
              {`${company?.name || 'Your Company'} (Organization)
└── Main Plant (Facility)
    ├── Maintenance (Dept: 1xxxxx)
    │   ├── Parts Room A (Area)
    │   │   └── Materials: 1000001, 1000002...
    │   └── Equipment: Forklifts, Tools
    ├── Sanitation (Dept: 2xxxxx)
    ├── Quality (Dept: 3xxxxx)
    └── Production (Dept: 4xxxxx)
└── Warehouse B (Facility)
    └── Same departments, different stock`}
            </Text>
          </View>
        </View>

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
  scrollContent: {
    padding: 16,
  },
  heroSection: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  flowDiagram: {
    marginBottom: 24,
  },
  flowTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  flowCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  flowText: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  flowDescription: {
    fontSize: 12,
  },
  stepsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    marginTop: 8,
    minHeight: 20,
  },
  stepHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepTitleText: {
    flex: 1,
    paddingRight: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
  },
  stepDetails: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailsList: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  exampleSection: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  codeBlock: {
    borderRadius: 10,
    padding: 16,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
  rolesSection: {
    marginBottom: 20,
  },
  rolesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  rolesSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rolesSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rolesSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  rolesContent: {
    gap: 12,
  },
  roleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleHeaderText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 12,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  loginMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  loginMethodText: {
    fontSize: 12,
    flex: 1,
  },
  responsibilitiesList: {
    gap: 8,
  },
  responsibilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  responsibilityBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    marginRight: 8,
  },
  responsibilityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  workflowBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  workflowContent: {
    flex: 1,
  },
  workflowTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  workflowText: {
    fontSize: 12,
    lineHeight: 20,
  },
  platformAdminCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  platformAdminContent: {
    flex: 1,
  },
  platformAdminTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  platformAdminText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  platformAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  platformAdminButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
