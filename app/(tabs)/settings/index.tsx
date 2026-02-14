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
  Sun,
  Moon,
  Palette,
  Globe,
  Star,
  Zap,
  Crown,
  X,
  Users,
  ShieldOff,
  Key,
  UserCog,
  Layers,
  MapPin,
  BookOpen,
  Briefcase,
  ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { useTheme, type ThemeType } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLicense, type LicenseType } from '@/contexts/LicenseContext';
import { isSuperAdminRole, getRoleDisplayName } from '@/constants/roles';
import ColorPicker from '@/components/ColorPicker';

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

const themeOptions: { value: ThemeType; label: string; icon: typeof Sun; iconColor: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, iconColor: '#F59E0B' },
  { value: 'dark', label: 'Dark', icon: Moon, iconColor: '#6366F1' },
  { value: 'custom', label: 'Custom', icon: Palette, iconColor: '#10B981' },
];

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
  const { theme, setTheme, colors, customBg, customPrimary, setCustomColors } = useTheme();
  const { currentUserRole } = usePermissions();
  const { licenseType, setLicenseType } = useLicense();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Custom color picker state
  const [editBg, setEditBg] = useState(customBg);
  const [editCard, setEditCard] = useState(customPrimary);

  const openThemeModal = useCallback(() => {
    setEditBg(customBg);
    setEditCard(customPrimary);
    setShowThemeModal(true);
  }, [customBg, customPrimary]);

  const applyCustomColors = useCallback(() => {
    setCustomColors(editBg, editCard);
  }, [editBg, editCard, setCustomColors]);

  const isSuperAdmin = isSuperAdminRole(userProfile?.role) || currentUserRole?.isSystem || currentUserRole?.name === 'Super Admin' || currentUserRole?.name === 'Administrator';

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
  const currentTheme = themeOptions.find((t) => t.value === theme);

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
          </View>
        </View>

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
              icon={currentTheme?.icon || Moon}
              label="Appearance"
              value={currentTheme?.label || 'Dark'}
              onPress={() => openThemeModal()}
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Administration</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={UserCog}
              label="User Permissions"
              value="Configure module access"
              onPress={() => router.push('/settings/users')}
              colors={colors}
            />
            <SettingItem
              icon={Users}
              label="Roles & Permissions"
              value="Manage user roles"
              onPress={() => router.push('/settings/roles')}
              colors={colors}
            />
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={HelpCircle}
              label="Help Center"
              onPress={() => {}}
              colors={colors}
            />
          </View>
        </View>

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

      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Appearance</Text>
              <Pressable onPress={() => setShowThemeModal(false)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Dark / Light / Custom selector */}
            <View style={styles.themeGrid}>
              {themeOptions.map((option) => {
                const ThemeIcon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.themeOption,
                      { backgroundColor: colors.backgroundSecondary, borderColor: isSelected ? colors.primary : colors.border },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => {
                      if (option.value === 'custom') {
                        applyCustomColors();
                      } else {
                        setTheme(option.value);
                      }
                    }}
                  >
                    <ThemeIcon size={24} color={option.iconColor} />
                    <Text style={[styles.themeLabel, { color: colors.text }]}>{option.label}</Text>
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Color Picker — shown when Custom is selected or tapped */}
            {theme === 'custom' && (
              <View style={styles.colorPickerSection}>
                <ColorPicker
                  label="Background Color"
                  value={editBg}
                  onChange={(hex) => {
                    setEditBg(hex);
                    setCustomColors(hex, editCard);
                  }}
                  textColor={colors.textSecondary}
                  borderColor={colors.border}
                />
                <View style={{ height: 12 }} />
                <ColorPicker
                  label="Card Color"
                  value={editCard}
                  onChange={(hex) => {
                    setEditCard(hex);
                    setCustomColors(editBg, hex);
                  }}
                  textColor={colors.textSecondary}
                  borderColor={colors.border}
                />
              </View>
            )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLicenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLicenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>License Type</Text>
              <Pressable onPress={() => setShowLicenseModal(false)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 24,
    marginTop: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitials: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    paddingLeft: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  settingValue: {
    fontSize: 13,
    marginTop: 2,
  },
  version: {
    textAlign: 'center' as const,
    fontSize: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  themeOption: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorPickerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  licenseDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  licenseOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  licenseOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  licenseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  licenseLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  licenseSublabel: {
    fontSize: 12,
    textAlign: 'center' as const,
  },
});
