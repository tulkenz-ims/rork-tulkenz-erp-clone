import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useUserStats } from '@/hooks/useSupabaseUsers';
import {
  Users,
  Shield,
  Key,
  UserCheck,
  UserX,
  Layers,
} from 'lucide-react-native';

// Import existing screens directly
import UserManagementScreen from '@/app/(tabs)/settings/users';
import RolesScreen from '@/app/(tabs)/settings/roles';
import PermissionsMatrixScreen from './permissions';

type TabKey = 'users' | 'roles' | 'permissions';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'roles', label: 'Roles', icon: Shield },
  { key: 'permissions', label: 'Permissions', icon: Key },
];

export default function UsersModuleScreen() {
  const { colors } = useTheme();
  const { roles, stats: permStats } = usePermissions();
  const { data: userStats } = useUserStats();
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const assignedCount = useMemo(() => {
    return permStats?.assignedEmployees || 0;
  }, [permStats]);

  const unassignedCount = useMemo(() => {
    const total = userStats?.total || 0;
    return Math.max(0, total - assignedCount);
  }, [userStats, assignedCount]);

  const renderTab = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagementScreen />;
      case 'roles':
        return <RolesScreen />;
      case 'permissions':
        return <PermissionsMatrixScreen />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Users size={16} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{userStats?.total || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#10B981' + '20' }]}>
            <UserCheck size={16} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{userStats?.active || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#EF4444' + '20' }]}>
            <UserX size={16} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{userStats?.inactive || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inactive</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Shield size={16} color="#8B5CF6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{roles.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Roles</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B' + '20' }]}>
            <Layers size={16} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{unassignedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>No Role</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                isActive && [styles.tabActive, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon
                size={18}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTab()}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  tabLabelActive: {
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
});
