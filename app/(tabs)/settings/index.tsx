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
  Sun,
  Moon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import {
  useTheme,
  type ThemeType,
  THEME_LABELS,
  THEME_GROUPS,
  THEME_PREVIEW_COLORS,
} from '@/contexts/ThemeContext';
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

  // Current theme short label
  const currentThemeLabel = THEME_LABELS[theme] || theme;

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
        {/* Header */}
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.hudBorderBright }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.hudPrimary + '22', borderWidth: 1, borderColor: colors.hudBorderBright }]}>
            <Text style={[styles.profileInitials, { color: colors.hudPrimary }]}>
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
              <View style={[styles.roleBadge, { backgroundColor: colors.hudPrimary + '20', borderColor: colors.hudBorder, borderWidth: 1 }]}>
                <Text style={[styles.roleText, { color: colors.hudPrimary }]}>
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

        {/* Getting Started */}
        {isPlatformAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Getting Started</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.hudBorder }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Account</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.hudBorder }]}>
            <SettingItem icon={User} label="Profile" value={userProfile?.email} onPress={() => {}} colors={colors} />
            <SettingItem icon={Building2} label="Organization Setup" value={company?.name || 'Configure branding & settings'} onPress={() => router.push('/settings/organization')} colors={colors} />
            {isPlatformAdmin && (
              <SettingItem icon={Briefcase} label="Manage Organizations" value="Create & manage companies" onPress={() => router.push('/settings/organizations')} colors={colors} />
            )}
            <SettingItem icon={Shield} label="Security" onPress={() => {}} colors={colors} />
            <SettingItem icon={Calculator} label="The Numbers Truth" value="ROI calculator & share link" onPress={() => router.push('/settings/numbers-truth')} colors={colors} />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Preferences</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.hudBorder }]}>
            <SettingItem icon={Bell} label="Notifications" onPress={() => {}} colors={colors} />
            <SettingItem icon={AlertTriangle} label="Alert Settings" value="Low stock, reorder alerts" onPress={() => router.push('/settings/alerts')} colors={colors} />
            <SettingItem
              icon={Palette}
              label="Appearance"
              value={currentThemeLabel}
              onPress={() => setShowThemeModal(true)}
              colors={colors}
            />
            <SettingItem icon={Globe} label="Language" value="English" onPress={() => {}} colors={colors} />
          </View>
        </View>

        {/* Administration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Administration</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.hudBorder }]}>
            <SettingItem icon={Layers} label="Departments" value="Configure department codes" onPress={() => router.push('/settings/departments')} colors={colors} />
            <SettingItem icon={Building2} label="Facilities" value="Manage facilities" onPress={() => router.push('/settings/facilities')} colors={colors} />
            <SettingItem icon={MapPin} label="Areas & Locations" value="Physical spaces within facilities" onPress={() => router.push('/settings/areas')} colors={colors} />
            <SettingItem icon={ClipboardList} label="Task Feed Templates" value="Configure task actions" onPress={() => router.push('/settings/taskfeed-templates')} colors={colors} />
            <SettingItem icon={Key} label="License Type" value={licenseType} onPress={() => setShowLicenseModal(true)} colors={colors} />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Support</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.hudBorder }]}>
            <SettingItem icon={HelpCircle} label="System Overview" value="Architecture, security, modules" onPress={() => router.push('/settings/system-overview')} colors={colors} />
            <SettingItem icon={Rocket} label="Tech Platform Presentation" value="12-slide deck for stakeholder meetings" onPress={() => router.push('/settings/tech-presentation')} colors={colors} />
            <SettingItem icon={Rocket} label="Feature Roadmap" value="What's being built next" onPress={() => router.push('/settings/roadmap')} colors={colors} />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.hudBorder }]}>
            <SettingItem icon={LogOut} label="Sign Out" onPress={handleSignOut} danger colors={colors} />
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
          <View style={[styles.themeModal, { backgroundColor: colors.hudBg, borderColor: colors.hudBorderBright }]}>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.hudBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Appearance</Text>
              <Pressable onPress={() => setShowThemeModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.themeScroll}>
              {THEME_GROUPS.map(group => (
                <View key={group.label} style={styles.themeGroup}>
                  {/* Group label */}
                  <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
                    {group.label.toUpperCase()}
                  </Text>

                  {/* Dark / Light pair */}
                  <View style={styles.themePair}>
                    {group.themes.map(t => {
                      const preview = THEME_PREVIEW_COLORS[t];
                      const isSelected = theme === t;
                      const isDark = t.endsWith('_dark');

                      return (
                        <Pressable
                          key={t}
                          style={[
                            styles.themeCard,
                            { borderColor: isSelected ? preview.accent : colors.hudBorder },
                            isSelected && { borderWidth: 2 },
                          ]}
                          onPress={() => {
                            setTheme(t);
                            setShowThemeModal(false);
                          }}
                        >
                          {/* Swatch */}
                          <View style={[styles.swatch, { backgroundColor: preview.bg }]}>
                            {/* Grid lines */}
                            <View style={[styles.swatchGridH, { backgroundColor: preview.accent + '18' }]} />
                            <View style={[styles.swatchGridV, { backgroundColor: preview.accent + '18' }]} />
                            {/* Rings */}
                            <View style={[styles.swatchRingOuter, { borderColor: preview.accent + '30' }]} />
                            <View style={[styles.swatchRingInner, { borderColor: preview.accent + '50' }]} />
                            {/* Center dot */}
                            <View style={[styles.swatchDot, { backgroundColor: preview.accent }]} />
                            {/* Fire rivers — amber lines */}
                            <View style={[styles.swatchFire1, { backgroundColor: '#FFB800' + '40' }]} />
                            <View style={[styles.swatchFire2, { backgroundColor: '#FFB800' + '30' }]} />
                            {/* Selected check */}
                            {isSelected && (
                              <View style={[styles.swatchCheck, { backgroundColor: preview.accent }]}>
                                <Check size={10} color="#000" />
                              </View>
                            )}
                          </View>
                          {/* Label */}
                          <View style={[styles.swatchLabel, { backgroundColor: colors.backgroundSecondary }]}>
                            {isDark
                              ? <Moon size={10} color={isSelected ? preview.accent : colors.textTertiary} />
                              : <Sun size={10} color={isSelected ? preview.accent : colors.textTertiary} />
                            }
                            <Text style={[
                              styles.swatchLabelText,
                              { color: isSelected ? preview.accent : colors.textSecondary },
                            ]}>
                              {preview.label}
                            </Text>
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
          <View style={[styles.licenseModal, { backgroundColor: colors.hudBg, borderColor: colors.hudBorderBright }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.hudBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>License Type</Text>
              <Pressable onPress={() => setShowLicenseModal(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.licenseDesc, { color: colors.textSecondary }]}>
              Controls which modules are visible in the application.
            </Text>
            <View style={styles.licenseRow}>
              {(['OPS', 'ERP'] as LicenseType[]).map(type => {
                const isSelected = licenseType === type;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.licenseOption,
                      { backgroundColor: colors.backgroundSecondary, borderColor: isSelected ? colors.hudPrimary : colors.hudBorder },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => { setLicenseType(type); setShowLicenseModal(false); }}
                  >
                    <View style={[styles.licenseIcon, { backgroundColor: isSelected ? colors.hudPrimary + '20' : colors.infoBg }]}>
                      <Key size={24} color={isSelected ? colors.hudPrimary : colors.textSecondary} />
                    </View>
                    <Text style={[styles.licenseLabel, { color: colors.text }]}>TulKenz {type}</Text>
                    <Text style={[styles.licenseSub, { color: colors.textSecondary }]}>
                      {type === 'OPS' ? 'Operations Focus' : 'Full ERP Suite'}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedDot, { backgroundColor: colors.hudPrimary }]} />
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
  title: { fontSize: 26, fontWeight: '700' as const, marginBottom: 20, marginTop: 8, letterSpacing: 2 },

  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, padding: 16, marginBottom: 24, borderWidth: 1 },
  profileAvatar: { width: 56, height: 56, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  profileInitials: { fontSize: 20, fontWeight: '700' as const, fontFamily: 'Courier New' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600' as const },
  profileEmail: { fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  roleText: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  tierText: { fontSize: 11, fontWeight: '600' as const },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '600' as const, marginBottom: 8, paddingLeft: 2, letterSpacing: 3 },
  sectionContent: { borderRadius: 4, borderWidth: 1, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '500' as const },
  settingValue: { fontSize: 12, marginTop: 2 },
  version: { textAlign: 'center' as const, fontSize: 11, marginTop: 16, marginBottom: 20, letterSpacing: 2 },

  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  accessDeniedIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  accessDeniedTitle: { fontSize: 22, fontWeight: '700' as const, marginBottom: 12 },
  accessDeniedMessage: { fontSize: 15, textAlign: 'center' as const, lineHeight: 22, marginBottom: 32 },
  backButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 4 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 2 },

  // Theme modal
  themeModal: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, maxHeight: '88%' },
  themeScroll: { padding: 16, paddingBottom: 40 },
  themeGroup: { marginBottom: 20 },
  groupLabel: { fontSize: 9, fontWeight: '600' as const, letterSpacing: 3, marginBottom: 10 },
  themePair: { flexDirection: 'row', gap: 12 },
  themeCard: { flex: 1, borderRadius: 4, borderWidth: 1, overflow: 'hidden' },
  swatch: { height: 72, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  swatchGridH: { position: 'absolute', left: 0, right: 0, height: 1, top: '45%' },
  swatchGridV: { position: 'absolute', top: 0, bottom: 0, width: 1, left: '35%' },
  swatchRingOuter: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 1 },
  swatchRingInner: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 1 },
  swatchDot: { width: 10, height: 10, borderRadius: 5 },
  swatchFire1: { position: 'absolute', bottom: 10, left: 0, right: 0, height: 1.5, transform: [{ rotate: '-4deg' }] },
  swatchFire2: { position: 'absolute', bottom: 14, left: 10, right: 10, height: 1, transform: [{ rotate: '-3deg' }] },
  swatchCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  swatchLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7 },
  swatchLabelText: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1 },

  // License modal
  licenseModal: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, padding: 0 },
  licenseDesc: { fontSize: 13, margin: 20, marginTop: 12, lineHeight: 20 },
  licenseRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 32 },
  licenseOption: { flex: 1, padding: 16, borderRadius: 4, borderWidth: 1, alignItems: 'center', gap: 8 },
  licenseIcon: { width: 48, height: 48, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  licenseLabel: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 1 },
  licenseSub: { fontSize: 11, textAlign: 'center' as const },
  selectedDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
});
