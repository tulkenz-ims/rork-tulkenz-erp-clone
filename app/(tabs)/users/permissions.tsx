import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Check, ChevronDown, ChevronRight, Shield, Filter } from 'lucide-react-native';
import {
  MODULE_PERMISSION_DEFINITIONS,
  PERMISSION_DEPARTMENTS,
  type PermissionModule,
  type PermissionAction,
  type RolePermission,
} from '@/constants/permissionsConstants';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface DBRole {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: RolePermission[];
  is_system: boolean;
}

// ── Helpers ────────────────────────────────────────────────────
function getRoleActions(role: DBRole, module: PermissionModule): PermissionAction[] {
  const perm = role.permissions?.find(p => p.module === module);
  return perm?.actions || [];
}

function hasAction(role: DBRole, module: PermissionModule, action: PermissionAction): boolean {
  return getRoleActions(role, module).includes(action);
}

function moduleStatus(role: DBRole, module: PermissionModule): 'full' | 'partial' | 'none' {
  const moduleDef = MODULE_PERMISSION_DEFINITIONS.find(m => m.module === module);
  if (!moduleDef) return 'none';
  const enabled = moduleDef.actions.filter(a => hasAction(role, module, a.action)).length;
  if (enabled === 0) return 'none';
  if (enabled === moduleDef.actions.length) return 'full';
  return 'partial';
}

// ── Main Screen ────────────────────────────────────────────────
export default function PermissionsMatrixScreen() {
  const { colors, isHUD } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter]         = useState<string>('All');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [saving, setSaving]                 = useState<string | null>(null); // roleId being saved

  const bg   = isHUD ? '#020912' : colors.background;
  const surf = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;
  const cyan = isHUD ? '#00D4EE' : colors.primary;

  // Load roles from Supabase
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['permission-roles', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, color, permissions, is_system')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
      })) as DBRole[];
    },
    enabled: !!organizationId,
  });

  // Save permissions mutation
  const savePermissions = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: RolePermission[] }) => {
      const { error } = await supabase
        .from('roles')
        .update({ permissions: permissions })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-roles', organizationId] });
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to save permissions'),
  });

  // Toggle a single action on a role
  const toggleAction = useCallback(async (
    role: DBRole,
    module: PermissionModule,
    action: PermissionAction
  ) => {
    const currentActions = getRoleActions(role, module);
    const hasIt = currentActions.includes(action);

    // Build new permissions array
    const newPermissions: RolePermission[] = role.permissions.filter(p => p.module !== module);
    const newActions = hasIt
      ? currentActions.filter(a => a !== action)
      : [...currentActions, action];

    // Only add module entry if there are actions
    if (newActions.length > 0) {
      newPermissions.push({ module, actions: newActions });
    }

    setSaving(role.id);
    try {
      await savePermissions.mutateAsync({ roleId: role.id, permissions: newPermissions });
    } finally {
      setSaving(null);
    }
  }, [savePermissions]);

  // Toggle entire module on/off
  const toggleModule = useCallback(async (role: DBRole, module: PermissionModule) => {
    const moduleDef = MODULE_PERMISSION_DEFINITIONS.find(m => m.module === module);
    if (!moduleDef) return;

    const status = moduleStatus(role, module);
    const newPermissions: RolePermission[] = role.permissions.filter(p => p.module !== module);

    if (status !== 'full') {
      // Enable all actions
      newPermissions.push({ module, actions: moduleDef.actions.map(a => a.action) });
    }
    // If full → remove entirely (no access)

    setSaving(role.id);
    try {
      await savePermissions.mutateAsync({ roleId: role.id, permissions: newPermissions });
    } finally {
      setSaving(null);
    }
  }, [savePermissions]);

  // Filtered roles
  const displayRoles = useMemo(() => {
    if (selectedRoleId) return roles.filter(r => r.id === selectedRoleId);
    return roles;
  }, [roles, selectedRoleId]);

  // Filtered modules by department
  const filteredModules = useMemo(() => {
    if (deptFilter === 'All') return MODULE_PERMISSION_DEFINITIONS;
    return MODULE_PERMISSION_DEFINITIONS.filter(m => m.department === deptFilter || m.department === 'All');
  }, [deptFilter]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={cyan} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: MONO }]}>
          LOADING PERMISSIONS...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* Department filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.deptBar, { borderBottomColor: bdr }]}
        contentContainerStyle={styles.deptBarContent}
      >
        {PERMISSION_DEPARTMENTS.map(dept => (
          <Pressable
            key={dept}
            style={[
              styles.deptChip,
              { borderColor: deptFilter === dept ? cyan : bdr },
              deptFilter === dept && { backgroundColor: cyan + '18' },
            ]}
            onPress={() => setDeptFilter(dept)}
          >
            <Text style={[
              styles.deptChipText,
              { color: deptFilter === dept ? cyan : colors.textSecondary, fontFamily: MONO },
            ]}>
              {dept.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Role filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.roleBar, { borderBottomColor: bdr, backgroundColor: surf }]}
        contentContainerStyle={styles.roleBarContent}
      >
        <Pressable
          style={[styles.roleChip, { borderColor: !selectedRoleId ? cyan : bdr }, !selectedRoleId && { backgroundColor: cyan + '15' }]}
          onPress={() => setSelectedRoleId(null)}
        >
          <Text style={[styles.roleChipText, { color: !selectedRoleId ? cyan : colors.textSecondary }]}>
            All Roles
          </Text>
        </Pressable>
        {roles.map(role => (
          <Pressable
            key={role.id}
            style={[
              styles.roleChip,
              { borderColor: selectedRoleId === role.id ? role.color : bdr },
              selectedRoleId === role.id && { backgroundColor: role.color + '15' },
            ]}
            onPress={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
          >
            <View style={[styles.roleChipDot, { backgroundColor: role.color }]} />
            <Text style={[styles.roleChipText, { color: selectedRoleId === role.id ? role.color : colors.textSecondary }]}>
              {role.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { borderBottomColor: bdr, backgroundColor: surf }]}>
        {[
          { color: colors.success, label: 'Full Access' },
          { color: colors.warning, label: 'Partial' },
          { color: bdr,            label: 'No Access' },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
        <Text style={[styles.legendHint, { color: colors.textSecondary, fontFamily: MONO }]}>
          TAP ROW TO EXPAND · TAP ● TO TOGGLE
        </Text>
      </View>

      {/* Matrix */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>

            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: bdr, backgroundColor: surf }]}>
              <View style={[styles.moduleCell, { borderRightColor: bdr }]}>
                <Text style={[styles.moduleCellHeader, { color: colors.textSecondary, fontFamily: MONO }]}>
                  MODULE
                </Text>
              </View>
              {displayRoles.map(role => (
                <View key={role.id} style={[styles.roleCell, { borderRightColor: bdr }]}>
                  <View style={[styles.roleDot, { backgroundColor: role.color }]} />
                  <Text style={[styles.roleText, { color: colors.text }]} numberOfLines={2}>
                    {role.name}
                  </Text>
                  {saving === role.id && (
                    <ActivityIndicator size="small" color={role.color} style={{ marginTop: 4 }} />
                  )}
                </View>
              ))}
            </View>

            {/* Module rows */}
            {filteredModules.map((moduleDef, idx) => {
              const isExpanded = expandedModule === moduleDef.module;

              return (
                <View key={moduleDef.module}>
                  {/* Module summary row */}
                  <Pressable
                    style={[
                      styles.moduleRow,
                      { borderBottomColor: bdr },
                      idx % 2 === 0 && { backgroundColor: surf + '80' },
                      isExpanded && { backgroundColor: cyan + '08' },
                    ]}
                    onPress={() => setExpandedModule(isExpanded ? null : moduleDef.module)}
                  >
                    <View style={[styles.moduleCell, { borderRightColor: bdr }]}>
                      <View style={styles.moduleCellInner}>
                        {isExpanded
                          ? <ChevronDown size={13} color={cyan} />
                          : <ChevronRight size={13} color={colors.textSecondary} />}
                        <View>
                          <Text style={[styles.moduleName, { color: colors.text }]}>
                            {moduleDef.name}
                          </Text>
                          <Text style={[styles.moduleDept, { color: colors.textSecondary, fontFamily: MONO }]}>
                            {moduleDef.department}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {displayRoles.map(role => {
                      const status = moduleStatus(role, moduleDef.module);
                      return (
                        <Pressable
                          key={role.id}
                          style={[styles.roleCell, { borderRightColor: bdr }]}
                          onPress={() => toggleModule(role, moduleDef.module)}
                          disabled={saving === role.id}
                        >
                          <View style={[
                            styles.statusCircle,
                            status === 'full'    && { backgroundColor: colors.success + '25', borderColor: colors.success },
                            status === 'partial' && { backgroundColor: colors.warning + '25', borderColor: colors.warning },
                            status === 'none'    && { backgroundColor: 'transparent', borderColor: bdr },
                          ]}>
                            {status === 'full' && <Check size={12} color={colors.success} />}
                            {status === 'partial' && (
                              <View style={[styles.partialDash, { backgroundColor: colors.warning }]} />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </Pressable>

                  {/* Expanded action rows */}
                  {isExpanded && moduleDef.actions.map(actionDef => (
                    <View
                      key={actionDef.action}
                      style={[styles.actionRow, { borderBottomColor: bdr, backgroundColor: cyan + '05' }]}
                    >
                      <View style={[styles.moduleCell, { borderRightColor: bdr, paddingLeft: 36 }]}>
                        <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
                          {actionDef.label}
                        </Text>
                      </View>
                      {displayRoles.map(role => {
                        const enabled = hasAction(role, moduleDef.module, actionDef.action);
                        return (
                          <Pressable
                            key={role.id}
                            style={[styles.roleCell, { borderRightColor: bdr }]}
                            onPress={() => toggleAction(role, moduleDef.module, actionDef.action)}
                            disabled={saving === role.id}
                          >
                            <View style={[
                              styles.actionCheck,
                              {
                                borderColor: enabled ? role.color : bdr,
                                backgroundColor: enabled ? role.color + '20' : 'transparent',
                              },
                            ]}>
                              {enabled && <Check size={11} color={role.color} />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })}

          </View>
        </ScrollView>

        {roles.length === 0 && (
          <View style={styles.empty}>
            <Shield size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Roles Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Roles will appear here once created
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 11, letterSpacing: 2, marginTop: 8 },

  // Dept filter
  deptBar:        { flexGrow: 0, borderBottomWidth: 1 },
  deptBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  deptChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  deptChipText:   { fontSize: 9, fontWeight: '800' as const, letterSpacing: 1 },

  // Role filter
  roleBar:        { flexGrow: 0, borderBottomWidth: 1 },
  roleBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  roleChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  roleChipDot:    { width: 7, height: 7, borderRadius: 4 },
  roleChipText:   { fontSize: 11, fontWeight: '500' as const },

  // Legend
  legend:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 9, height: 9, borderRadius: 5 },
  legendText:  { fontSize: 11 },
  legendHint:  { fontSize: 8, letterSpacing: 0.5, marginLeft: 'auto' as any },

  // Header row
  headerRow:  { flexDirection: 'row', borderBottomWidth: 1 },
  moduleCell: { width: 180, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', borderRightWidth: 1 },
  moduleCellHeader: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
  roleCell:   { width: 80, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1 },
  roleDot:    { width: 7, height: 7, borderRadius: 4, marginBottom: 4 },
  roleText:   { fontSize: 10, fontWeight: '600' as const, textAlign: 'center' as const },

  // Module row
  moduleRow:       { flexDirection: 'row', borderBottomWidth: 1, minHeight: 48 },
  moduleCellInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moduleName:      { fontSize: 12, fontWeight: '600' as const },
  moduleDept:      { fontSize: 8, letterSpacing: 0.5, marginTop: 2 },

  // Status circle (module level)
  statusCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  partialDash:  { width: 10, height: 2, borderRadius: 1 },

  // Action row (expanded)
  actionRow:   { flexDirection: 'row', borderBottomWidth: 1, minHeight: 38 },
  actionLabel: { fontSize: 11 },
  actionCheck: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const },
  emptyText:  { fontSize: 14, textAlign: 'center' as const, paddingHorizontal: 32 },
});
