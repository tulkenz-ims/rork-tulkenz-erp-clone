import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
  X,
  Moon,
  Sun,
  Palette,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { useTheme, type ThemeType } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { isSuperAdminRole, getRoleDisplayName } from '@/constants/roles';
import ColorPicker from '@/components/ColorPicker';

const themeOptions: { value: ThemeType; label: string; icon: typeof Sun; iconColor: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, iconColor: '#F59E0B' },
  { value: 'dark', label: 'Dark', icon: Moon, iconColor: '#6366F1' },
  { value: 'custom', label: 'Custom', icon: Palette, iconColor: '#10B981' },
];

export default function UserProfileMenu() {
  const router = useRouter();
  const { userProfile, signOut, company } = useUser();
  const { colors, theme, setTheme, customBg, customPrimary, setCustomColors } = useTheme();
  const { currentUserRole } = usePermissions();
  const [showMenu, setShowMenu] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Custom color picker state
  const [editBg, setEditBg] = useState(customBg);
  const [editCard, setEditCard] = useState(customPrimary);

  const openThemeModal = useCallback(() => {
    setEditBg(customBg);
    setEditCard(customPrimary);
    setShowThemeModal(true);
  }, [customBg, customPrimary]);

  const isSuperAdmin = isSuperAdminRole(userProfile?.role) || 
                       currentUserRole?.isSystem || 
                       currentUserRole?.name === 'Super Admin' ||
                       currentUserRole?.name === 'Administrator';

  const handleSignOut = () => {
    setShowMenu(false);
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

  const handleSettings = () => {
    setShowMenu(false);
    router.push('/settings');
  };

  const handleTheme = () => {
    setShowMenu(false);
    setTimeout(() => openThemeModal(), 300);
  };

  const currentTheme = themeOptions.find((t) => t.value === theme);
  const ThemeIcon = currentTheme?.icon || Moon;

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.profileButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
        onPress={() => setShowMenu(true)}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {userProfile?.first_name?.[0] || 'U'}
            {userProfile?.last_name?.[0] || ''}
          </Text>
        </View>
        <ChevronDown size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <Pressable 
            style={[styles.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.menuAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.menuAvatarText}>
                  {userProfile?.first_name?.[0] || 'U'}
                  {userProfile?.last_name?.[0] || ''}
                </Text>
              </View>
              <View style={styles.menuUserInfo}>
                <Text style={[styles.menuUserName, { color: colors.text }]}>
                  {userProfile?.first_name} {userProfile?.last_name}
                </Text>
                <Text style={[styles.menuUserEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {userProfile?.email}
                </Text>
                <View style={styles.roleBadgeRow}>
                  {isSuperAdmin && (
                    <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Shield size={10} color={colors.primary} />
                      <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Super Admin</Text>
                    </View>
                  )}
                  {currentUserRole && !isSuperAdmin && (
                    <View style={[styles.roleBadge, { backgroundColor: currentUserRole.color + '20' }]}>
                      <Text style={[styles.roleBadgeText, { color: currentUserRole.color }]}>{currentUserRole.name}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.menuItems}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={handleTheme}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: colors.infoBg }]}>
                  <ThemeIcon size={18} color={currentTheme?.iconColor || colors.primary} />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Appearance</Text>
                <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>{currentTheme?.label}</Text>
              </Pressable>

              {isSuperAdmin && (
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.backgroundSecondary },
                  ]}
                  onPress={handleSettings}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.infoBg }]}>
                    <Settings size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Settings</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  styles.menuItemLast,
                  pressed && { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={handleSignOut}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: colors.errorBg }]}>
                  <LogOut size={18} color={colors.error} />
                </View>
                <Text style={[styles.menuItemText, { color: colors.error }]}>Sign Out</Text>
              </Pressable>
            </View>

            {company && (
              <View style={[styles.menuFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.companyName, { color: colors.textTertiary }]}>{company.name}</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.themeOverlay}>
          <View style={[styles.themeContent, { backgroundColor: colors.surface }]}>
            <View style={styles.themeHeader}>
              <Text style={[styles.themeTitle, { color: colors.text }]}>Appearance</Text>
              <Pressable onPress={() => setShowThemeModal(false)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.themeGrid}>
              {themeOptions.map((option) => {
                const OptionIcon = option.icon;
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
                        setTheme('custom');
                      } else {
                        setTheme(option.value);
                      }
                    }}
                  >
                    <OptionIcon size={24} color={option.iconColor} />
                    <Text style={[styles.themeLabel, { color: colors.text }]}>{option.label}</Text>
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

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
    </>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  menuContainer: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  menuUserEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  menuItems: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  menuItemValue: {
    fontSize: 13,
  },
  menuFooter: {
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 11,
  },
  themeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  themeContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  themeTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
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
});
