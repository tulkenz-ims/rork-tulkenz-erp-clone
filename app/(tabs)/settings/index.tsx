import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Building2,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Globe,
  Star,
  Zap,
  Crown,
  X,
  ShieldOff,
  Key,
  Layers,
  MapPin,
  BookOpen,
  Briefcase,
  ClipboardList,
  Calculator,
  Rocket,
  Palette,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { useTheme, type ThemeType, THEME_LABELS, THEME_PREVIEW_COLORS } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLicense, type LicenseType } from '@/contexts/LicenseContext';
import { isSuperAdminRole, getRoleDisplayName } from '@/constants/roles';

interface SettingItemProps {
  icon: typeof User;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  colors: any;
}

function SettingItem({ icon: Icon, label, value, onPress, danger, colors }: SettingItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        { borderBottomColor: colors.border },
        pressed && onPress && { backgroundColor: colors.backgroundSecondary },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? colors.errorBg : colors.infoBg }]}>
        <Icon size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: danger ? colors.error : colors.text }]}>
          {label}
        </Text>
        {value && <Text style={[styles.settingValue, { color: colors.textTertiary }]}>{value}</Text>}
      </View>
      {onPress && <ChevronRight size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'starter': return Star;
    case 'professional': return Zap;
    case 'enterprise': return Shield;
    case 'enterprise_plus': return Crown;
    default: return Star;
  }
};

// All available themes in display order
const ALL_THEMES: ThemeType[] = [
  'dark',
  'light',
  'hud_cyan',
  'hud_green',
  'hud_silver',
  'hud_gold',
  'hud_purple',
];

// Group themes for display
const THEME_GROUPS = [
  {
    label: 'STANDARD',
    themes: ['dark', 'light'] as ThemeType[],
  },
  {
    label: 'HUD THEMES',
    themes: ['hud_cyan', 'hud_green', 'hud_silver', 'hud_gold', 'hud_purple'] as ThemeType[],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, company, tierInfo, signOut, isPlatformAdmin } = useUser();
  const { theme, setTheme, colors } = useTheme();
  const { currentUserRole } = usePermissions();
  const { licenseType, setLicenseType } = useLicense();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  const isSuperAdmin = isSuperAdminRole(userProfile?.role) ||
    currentUserRole?.isSystem ||
    currentUserRole?.name === 'Super Admin' ||
    currentUserRole?.name === 'Administrator';

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const TierIcon = getTierIcon(company?.subscription_tier || 'starter');

  if (!isSuperAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.accessDeniedContainer}>
          <View style={[styles.accessDeniedIcon, { backgroundColor: colors.errorBg }]}>
            <ShieldOff size={48} color={colors.error} />
          </View>
          <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>Access Restricted</Text>
          <Text style={[styles.accessDeniedMessage, { color: colors.textSecondary }]}>
            Settings are only accessible to Super Administrators.
          </Text>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.profileInitials}>
              {userProfile?.first_name?.[0] || 'U'}
              {userProfile?.last_name?.[0] || ''}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {userProfile?.first_name} {userProfile?.last_name}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userProfile?.email}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {getRoleDisplayName(userProfile?.role)}
                </Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: tierInfo.color + '20' }]}>
                <TierIcon size={12} color={tierInfo.color} />
                <Text style={[styles.tierText, { color: tierInfo.color }]}>{tierInfo.name}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Getting Started (Platform Admin only) */}
        {isPlatformAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Getting Started</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SettingItem
                icon={BookOpen}
                label="How To Setup"
                value="Platform Admin setup guide"
                onPress={() => router.push('/settings/getting-started')}
                colors={colors}
              />
            </View>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={User}
              label="Profile"
              value={userProfile?.email}
              onPress={() => {}}
              colors={colors}
            />
            <SettingItem
              icon={Building2}
              label="Organization Setup"
              value={company?.name || 'Configure branding & settings'}
              onPress={() => router.push('/settings/organization')}
              colors={colors}
            />
            {isPlatformAdmin && (
              <SettingItem
                icon={Briefcase}
                label="Manage Organizations"
                value="Create & manage companies"
                onPress={() => router.push('/settings/organizations')}
                colors={colors}
              />
            )}
            <SettingItem
              icon={Shield}
              label="Security"
              onPress={() => {}}
              colors={colors}
            />
            <SettingItem
              icon={Calculator}
              label="The Numbers Truth"
              value="ROI calculator & share link"
              onPress={() => router.push('/settings/numbers-truth')}
              colors={colors}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={Bell}
              label="Notifications"
              onPress={() => {}}
              colors={colors}
            />
            <SettingItem
              icon={AlertTriangle}
              label="Alert Settings"
              value="Low stock, reorder alerts"
              onPress={() => router.push('/settings/alerts')}
              colors={colors}
            />
            <SettingItem
              icon={Palette}
              label="Appearance"
              value={THEME_LABELS[theme]}
              onPress={() => setShowThemeModal(true)}
              colors={colors}
            />
            <SettingItem
              icon={Globe}
              label="Language"
              value="English"
              onPress={() => {}}
              colors={colors}
            />
          </View>
        </View>

        {/* Administration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Administration</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={Layers}
              label="Departments"
              value="Configure department codes"
              onPress={() => router.push('/settings/departments')}
              colors={colors}
            />
            <SettingItem
              icon={Building2}
              label="Facilities"
              value="Manage facilities"
              onPress={() => router.push('/settings/facilities')}
              colors={colors}
            />
            <SettingItem
              icon={MapPin}
              label="Areas & Locations"
              value="Physical spaces within facilities"
              onPress={() => router.push('/settings/areas')}
              colors={colors}
            />
            <SettingItem
              icon={ClipboardList}
              label="Task Feed Templates"
              value="Configure task actions"
              onPress={() => router.push('/settings/taskfeed-templates')}
              colors={colors}
            />
            <SettingItem
              icon={Key}
              label="License Type"
              value={licenseType}
              onPress={() => setShowLicenseModal(true)}
              colors={colors}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={HelpCircle}
              label="System Overview"
              value="Architecture, security, modules"
              onPress={() => router.push('/settings/system-overview')}
              colors={colors}
            />
            <SettingItem
              icon={Rocket}
              label="Tech Platform Presentation"
              value="12-slide deck for stakeholder meetings"
              onPress={() => router.push('/settings/tech-presentation')}
              colors={colors}
            />
            <SettingItem
              icon={Rocket}
              label="Feature Roadmap"
              value="What's being built next"
              onPress={() => router.push('/settings/roadmap')}
              colors={colors}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={LogOut}
              label="Sign Out"
              onPress={handleSignOut}
              danger
              colors={colors}
            />
          </View>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>TulKenz OPS v1.0.0</Text>
      </ScrollView>

      {/* ── THEME PICKER MODAL ───────────────────────────────── */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.themeModalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Appearance</Text>
              <Pressable onPress={() => setShowThemeModal(false)} style={styles.closeButton}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.themeScrollContent}>
              {THEME_GROUPS.map(group => (
                <View key={group.label} style={styles.themeGroup}>
                  <Text style={[styles.themeGroupLabel, { color: colors.textTertiary }]}>
                    {group.label}
                  </Text>
                  <View style={styles.themeGrid}>
                    {group.themes.map(t => {
                      const preview = THEME_PREVIEW_COLORS[t];
                      const isSelected = theme === t;
                      return (
                        <Pressable
                          key={t}
                          style={[
                            styles.themeCard,
                            { borderColor: isSelected ? preview.accent : colors.border },
                            isSelected && { borderWidth: 2 },
                          ]}
                          onPress={() => {
                            setTheme(t);
                            setShowThemeModal(false);
                          }}
                        >
                          {/* Preview swatch */}
                          <View style={[styles.themeSwatch, { backgroundColor: preview.bg }]}>
                            {/* Mini grid lines */}
                            <View style={[styles.swatchLine, { backgroundColor: preview.accent + '30' }]} />
                            <View style={[styles.swatchLineV, { backgroundColor: preview.accent + '30' }]} />
                            {/* Accent dot */}
                            <View style={[styles.swatchDot, { backgroundColor: preview.accent }]} />
                            {/* Mini ring */}
                            <View style={[styles.swatchRing, { borderColor: preview.accent + '60' }]} />
                          </View>
                          {/* Label row */}
                          <View style={[styles.themeCardLabel, { backgroundColor: colors.backgroundSecondary }]}>
                            <Text
                              style={[
                                styles.themeCardText,
                                { color: isSelected ? preview.accent : colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {THEME_LABELS[t]}
                            </Text>
                            {isSelected && (
                              <Check size={12} color={preview.accent} />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── LICENSE MODAL ────────────────────────────────────── */}
      <Modal
        visible={showLicenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLicenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>License Type</Text>
              <Pressable onPress={() => setShowLicenseModal(false)} style={styles.closeButton}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.licenseDescription, { color: colors.textSecondary }]}>
              Controls which modules are visible in the application.
            </Text>
            <View style={styles.licenseOptions}>
              {(['OPS', 'ERP'] as LicenseType[]).map((type) => {
                const isSelected = licenseType === type;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.licenseOption,
                      { backgroundColor: colors.backgroundSecondary, borderColor: isSelected ? colors.primary : colors.border },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setLicenseType(type);
                      setShowLicenseModal(false);
                    }}
                  >
                    <View style={[styles.licenseIconContainer, { backgroundColor: isSelected ? colors.primary + '20' : colors.infoBg }]}>
                      <Key size={24} color={isSelected ? colors.primary : colors.textSecondary} />
                    </View>
                    <Text style={[styles.licenseLabel, { color: colors.text }]}>TulKenz {type}</Text>
                    <Text style={[styles.licenseSublabel, { color: colors.textSecondary }]}>
                      {type === 'OPS' ? 'Operations Focus' : 'Full ERP Suite'}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '700' as const, marginBottom: 24, marginTop: 8 },
  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  profileInitials: { fontSize: 22, fontWeight: '700' as const, color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600' as const },
  profileEmail: { fontSize: 14, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tierText: { fontSize: 12, fontWeight: '600' as const },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 10, paddingLeft: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  sectionContent: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  settingIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500' as const },
  settingValue: { fontSize: 13, marginTop: 2 },
  version: { textAlign: 'center' as const, fontSize: 12, marginTop: 16, marginBottom: 20 },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  accessDeniedIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  accessDeniedTitle: { fontSize: 22, fontWeight: '700' as const, marginBottom: 12 },
  accessDeniedMessage: { fontSize: 15, textAlign: 'center' as const, lineHeight: 22, marginBottom: 32 },
  backButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  closeButton: { padding: 4 },

  // Theme modal
  themeModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  themeScrollContent: { padding: 20, paddingBottom: 40 },
  themeGroup: { marginBottom: 24 },
  themeGroupLabel: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 12 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { width: '47%', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  themeSwatch: { height: 80, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  swatchLine: { position: 'absolute', left: 0, right: 0, height: 1, top: '40%' },
  swatchLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, left: '30%' },
  swatchDot: { width: 20, height: 20, borderRadius: 10 },
  swatchRing: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1 },
  themeCardLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  themeCardText: { fontSize: 12, fontWeight: '600' as const, flex: 1 },

  // License modal
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  licenseDescription: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  licenseOptions: { flexDirection: 'row', gap: 12, paddingBottom: 20 },
  licenseOption: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  licenseIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  licenseLabel: { fontSize: 16, fontWeight: '600' as const },
  licenseSublabel: { fontSize: 12, textAlign: 'center' as const },
  selectedIndicator: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
});
