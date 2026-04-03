import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useUserStats } from '@/hooks/useSupabaseUsers';
import { useUser } from '@/contexts/UserContext';
import {
  Users,
  Shield,
  Key,
  GitBranch,
  BarChart2,
  UserCheck,
  UserX,
  Layers,
} from 'lucide-react-native';

import UserManagementScreen from '@/app/(tabs)/settings/users';
import RolesScreen from '@/app/(tabs)/settings/roles';
import PermissionsMatrixScreen from './permissions';
import OrgChartScreen from './orgchart';
import HeadcountScreen from './headcount';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

type TabKey = 'directory' | 'orgchart' | 'headcount' | 'roles' | 'permissions';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'directory',   label: 'Directory',   icon: Users },
  { key: 'orgchart',    label: 'Org Chart',   icon: GitBranch },
  { key: 'headcount',   label: 'Headcount',   icon: BarChart2 },
  { key: 'roles',       label: 'Roles',       icon: Shield },
  { key: 'permissions', label: 'Permissions', icon: Key },
];

export default function WorkforceModuleScreen() {
  const { colors, isHUD } = useTheme();
  const { roles, stats: permStats } = usePermissions();
  const { data: userStats } = useUserStats();
  const { userProfile } = useUser();
  const [activeTab, setActiveTab] = useState<TabKey>('directory');

  const assignedCount  = useMemo(() => permStats?.assignedEmployees || 0, [permStats]);
  const unassignedCount = useMemo(() => Math.max(0, (userStats?.total || 0) - assignedCount), [userStats, assignedCount]);

  // Theme tokens
  const bg      = isHUD ? colors.hudBg      : colors.background;
  const surf    = isHUD ? colors.hudSurface  : colors.surface;
  const bdr     = isHUD ? colors.hudBorderBright : colors.border;
  const cyan    = isHUD ? colors.hudPrimary  : colors.primary;
  const textSec = colors.textSecondary;

  const renderTab = () => {
    switch (activeTab) {
      case 'directory':   return <UserManagementScreen />;
      case 'orgchart':    return <OrgChartScreen />;
      case 'headcount':   return <HeadcountScreen />;
      case 'roles':       return <RolesScreen />;
      case 'permissions': return <PermissionsMatrixScreen />;
    }
  };

  return (
    <View style={[S.container, { backgroundColor: bg }]}>

      {/* Stats bar */}
      <View style={[S.statsBar, { backgroundColor: surf, borderBottomColor: bdr }]}>
        <View style={S.statItem}>
          <View style={[S.statIcon, { backgroundColor: cyan + '20' }]}>
            <Users size={15} color={cyan} />
          </View>
          <Text style={[S.statVal, { color: colors.text }]}>{userStats?.total || 0}</Text>
          <Text style={[S.statLbl, { color: textSec, fontFamily: MONO }]}>TOTAL</Text>
        </View>

        <View style={[S.statDivider, { backgroundColor: bdr }]} />

        <View style={S.statItem}>
          <View style={[S.statIcon, { backgroundColor: colors.success + '20' }]}>
            <UserCheck size={15} color={colors.success} />
          </View>
          <Text style={[S.statVal, { color: colors.text }]}>{userStats?.active || 0}</Text>
          <Text style={[S.statLbl, { color: textSec, fontFamily: MONO }]}>ACTIVE</Text>
        </View>

        <View style={[S.statDivider, { backgroundColor: bdr }]} />

        <View style={S.statItem}>
          <View style={[S.statIcon, { backgroundColor: colors.error + '20' }]}>
            <UserX size={15} color={colors.error} />
          </View>
          <Text style={[S.statVal, { color: colors.text }]}>{userStats?.inactive || 0}</Text>
          <Text style={[S.statLbl, { color: textSec, fontFamily: MONO }]}>INACTIVE</Text>
        </View>

        <View style={[S.statDivider, { backgroundColor: bdr }]} />

        <View style={S.statItem}>
          <View style={[S.statIcon, { backgroundColor: colors.purple + '20' }]}>
            <Shield size={15} color={colors.purple} />
          </View>
          <Text style={[S.statVal, { color: colors.text }]}>{roles.length}</Text>
          <Text style={[S.statLbl, { color: textSec, fontFamily: MONO }]}>ROLES</Text>
        </View>

        <View style={[S.statDivider, { backgroundColor: bdr }]} />

        <View style={S.statItem}>
          <View style={[S.statIcon, { backgroundColor: colors.warning + '20' }]}>
            <Layers size={15} color={colors.warning} />
          </View>
          <Text style={[S.statVal, { color: colors.text }]}>{unassignedCount}</Text>
          <Text style={[S.statLbl, { color: textSec, fontFamily: MONO }]}>NO ROLE</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[S.tabBar, { backgroundColor: surf, borderBottomColor: bdr }]}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                S.tab,
                isActive && [S.tabActive, { borderBottomColor: cyan }],
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={15} color={isActive ? cyan : textSec} />
              <Text style={[
                S.tabLabel,
                { color: isActive ? cyan : textSec, fontFamily: MONO },
                isActive && S.tabLabelActive,
              ]}>
                {tab.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <View style={S.content}>
        {renderTab()}
      </View>

    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statItem:    { flex: 1, alignItems: 'center', gap: 3 },
  statIcon:    { width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  statVal:     { fontSize: 15, fontWeight: '700' as const },
  statLbl:     { fontSize: 8, fontWeight: '700' as const, letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, marginHorizontal: 4 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive:      { borderBottomWidth: 2 },
  tabLabel:       { fontSize: 8, fontWeight: '500' as const, letterSpacing: 0.5 },
  tabLabelActive: { fontWeight: '700' as const },
  content:        { flex: 1 },
});
