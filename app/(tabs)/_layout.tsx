import { Tabs, Redirect, useSegments, useRouter } from 'expo-router';
import React, { useMemo, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLicense } from '@/contexts/LicenseContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import ScrollableNavBar from '@/components/ScrollableNavBar';
import { NAVIGATION_MODULES } from '@/constants/navigationModules';

export default function TabLayout() {
  const { colors } = useTheme();
  const { loading, isAuthenticated, isEmployee, userProfile } = useUser();
  const { loading: licenseLoading } = useLicense();
  const { getEmployeeRole } = usePermissions();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const router = useRouter();

  const activeRoute = useMemo(() => {
    if (segments.length > 1) {
      return segments[1] || '(dashboard)';
    }
    return '(dashboard)';
  }, [segments]);

  const visibleModules = useMemo(() => {
    if (!isAuthenticated || !userProfile) return [];

    if (userProfile.is_platform_admin) {
      console.log('[TabLayout] User is Platform Admin - showing all modules');
      return NAVIGATION_MODULES.map(m => m.key);
    }

    const userRole = getEmployeeRole(userProfile.id);

    console.log('[TabLayout] Permission check:', {
      userId: userProfile.id,
      employeesRole: userProfile.role,
      assignedRoleName: userRole?.name,
      assignedRoleIsSystem: userRole?.isSystem,
      isEmployee,
    });

    const hasAdminRole = userRole && (
      userRole.name === 'Super Admin' ||
      userRole.name === 'Administrator' ||
      (userRole.isSystem && userRole.name?.toLowerCase().includes('super'))
    );

    const legacySuperAdmin = !isEmployee && !userRole && (
      userProfile.role === 'super_admin' ||
      userProfile.role === 'superadmin'
    );

    if (hasAdminRole || legacySuperAdmin) {
      console.log('[TabLayout] User has admin access - showing all modules');
      return NAVIGATION_MODULES.map(m => m.key);
    }

    if (!userRole) {
      console.log('[TabLayout] No role assigned - showing basic modules for user:', userProfile.id);
      return ['dashboard', 'taskfeed', 'timeclock'];
    }

    console.log('[TabLayout] User role:', userRole.name, 'permissions:', userRole.permissions.length);

    const moduleKeys: string[] = ['dashboard', 'taskfeed'];

    userRole.permissions.forEach(perm => {
      if (perm.actions.includes('view')) {
        switch (perm.module) {

          case 'work_orders':
          case 'preventive_maintenance':
            if (!moduleKeys.includes('cmms')) moduleKeys.push('cmms');
            break;

          case 'inventory':
            if (!moduleKeys.includes('inventory')) moduleKeys.push('inventory');
            break;

          case 'documents':
            if (!moduleKeys.includes('documents')) moduleKeys.push('documents');
            break;

          case 'procurement':
          case 'vendors':
            if (!moduleKeys.includes('procurement')) moduleKeys.push('procurement');
            break;

          case 'approvals':
            if (!moduleKeys.includes('approvals')) moduleKeys.push('approvals');
            break;

          case 'quality':
          case 'inspections':
            if (!moduleKeys.includes('quality')) moduleKeys.push('quality');
            break;

          case 'safety':
            if (!moduleKeys.includes('safety')) moduleKeys.push('safety');
            break;

          case 'sanitation':
            if (!moduleKeys.includes('sanitation')) moduleKeys.push('sanitation');
            break;

          case 'production':
            if (!moduleKeys.includes('production')) moduleKeys.push('production');
            if (!moduleKeys.includes('live-floor')) moduleKeys.push('live-floor');
            break;

          case 'live_floor':
            if (!moduleKeys.includes('live-floor')) moduleKeys.push('live-floor');
            break;

          case 'compliance':
            if (!moduleKeys.includes('compliance')) moduleKeys.push('compliance');
            break;

          case 'recycling':
            if (!moduleKeys.includes('recycling')) moduleKeys.push('recycling');
            break;

          case 'users':
            if (!moduleKeys.includes('users')) moduleKeys.push('users');
            break;

          case 'employees':
            if (!moduleKeys.includes('directory')) moduleKeys.push('directory');
            break;

          case 'settings':
            if (!moduleKeys.includes('settings')) moduleKeys.push('settings');
            break;

          case 'watchscreen':
            if (!moduleKeys.includes('watchscreen')) moduleKeys.push('watchscreen');
            break;

          case 'reports':
            break;

          case 'portal':
            break;

          case 'lms':
            break;

          case 'task_feed':
            break;
        }
      }
    });

    if (!moduleKeys.includes('timeclock')) moduleKeys.push('timeclock');

    console.log('[TabLayout] Visible modules for user:', moduleKeys);
    return moduleKeys;
  }, [isAuthenticated, userProfile, isEmployee, getEmployeeRole]);

  const handleNavigate = useCallback((route: string) => {
    console.log('Navigating to:', route);
    router.push(`/(tabs)/${route}` as any);
  }, [router]);

  if (loading || licenseLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingBottom: isEmployee ? 0 : (Platform.OS === 'web' ? 70 : 70 + insets.bottom) }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="(dashboard)" />
          <Tabs.Screen name="live-floor" />
          <Tabs.Screen name="cmms" />
          <Tabs.Screen name="taskfeed" />
          <Tabs.Screen name="timeclock" />
          <Tabs.Screen name="inventory" />
          <Tabs.Screen name="documents" />
          <Tabs.Screen name="employees" />
          <Tabs.Screen name="labor-tracking" />
          <Tabs.Screen name="procurement" />
          <Tabs.Screen name="approvals" />
          <Tabs.Screen name="quality" />
          <Tabs.Screen name="safety" />
          <Tabs.Screen name="sanitation" />
          <Tabs.Screen name="production" />
          <Tabs.Screen name="compliance" />
          <Tabs.Screen name="recycling" />
          <Tabs.Screen name="users" />
          <Tabs.Screen name="watchscreen" />
          <Tabs.Screen name="settings" />
        </Tabs>
      </View>

      {!isEmployee && (
        <ScrollableNavBar
          activeRoute={activeRoute}
          onNavigate={handleNavigate}
          visibleModules={visibleModules}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
});
