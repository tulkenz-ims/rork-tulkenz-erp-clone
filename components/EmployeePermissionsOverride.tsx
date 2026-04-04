import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, ActivityIndicator, Alert, Platform, TextInput,
} from 'react-native';
import { X, Shield, Check, ChevronDown, ChevronRight, Plus, Trash2, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  MODULE_PERMISSION_DEFINITIONS,
  PERMISSION_DEPARTMENTS,
  type PermissionModule,
  type PermissionAction,
  type RolePermission,
} from '@/constants/permissionsConstants';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface EmployeePermissionsOverrideProps {
  visible: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  roleId: string | null;
  roleName: string;
}

interface Override {
  id: string;
  module: string;
  actions: string[];
  notes: string | null;
}

// ── Main Component ─────────────────────────────────────────────
export default function EmployeePermissionsOverride({
  visible, onClose, employeeId, employeeName, roleId, roleName,
}: EmployeePermissionsOverrideProps) {
  const { colors, isHUD } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [deptFilter, setDeptFilter]       = useState('All');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [saving, setSaving]               = useState<string | null>(null);
  const [notesModule, setNotesModule]     = useState<string | null>(null);
  const [noteText, setNoteText]           = useState('');

  const bg   = isHUD ? '#020912' : colors.background;
  const surf = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;
  const cyan = isHUD ? '#00D4EE' : colors.primary;

  // Load role template permissions
  const { data: rolePerms = [] } = useQuery({
    queryKey: ['role-perms', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      const { data, error } = await supabase
        .from('roles')
        .select('permissions')
        .eq('id', roleId)
        .single();
      if (error) return [];
      return (data?.permissions || []) as RolePermission[];
    },
    enabled: !!roleId && visible,
  });

  // Load employee overrides
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['employee-overrides', employeeId],
    queryFn: async () => {
      if (!employeeId || !organizationId) return [];
      const { data, error } = await supabase
        .from('employee_permission_overrides')
        .select('id, module, actions, notes')
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId);
      if (error) throw error;
      return (data || []) as Override[];
    },
    enabled: !!employeeId && !!organizationId && visible,
  });

  // Get inherited actions for a module from role template
  const inheritedActions = useCallback((module: string): string[] => {
    const perm = rolePerms.find(p => p.module === module);
    return perm?.actions || [];
  }, [rolePerms]);

  // Get override actions for a module
  const overrideActions = useCallback((module: string): string[] => {
    const override = overrides.find(o => o.module === module);
    return override?.actions || [];
  }, [overrides]);

  // Effective actions = inherited UNION overrides
  const effectiveActions = useCallback((module: string): string[] => {
    const inherited = inheritedActions(module);
    const overridden = overrideActions(module);
    return [...new Set([...inherited, ...overridden])];
  }, [inheritedActions, overrideActions]);

  // Module status
  const moduleStatus = useCallback((module: string): 'inherited' | 'custom' | 'none' => {
    const inherited = inheritedActions(module);
    const overridden = overrideActions(module);
    if (overridden.length > 0) return 'custom';
    if (inherited.length > 0) return 'inherited';
    return 'none';
  }, [inheritedActions, overrideActions]);

  // Toggle override action
  const toggleOverride = useMutation({
    mutationFn: async ({
      module, action, currentOverrides,
    }: { module: string; action: string; currentOverrides: string[] }) => {
      if (!organizationId || !employeeId) throw new Error('Missing IDs');

      const hasIt = currentOverrides.includes(action);
      const newActions = hasIt
        ? currentOverrides.filter(a => a !== action)
        : [...currentOverrides, action];

      const existing = overrides.find(o => o.module === module);

      if (newActions.length === 0 && existing) {
        // Remove override entirely
        const { error } = await supabase
          .from('employee_permission_overrides')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else if (newActions.length > 0) {
        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('employee_permission_overrides')
            .update({ actions: newActions })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('employee_permission_overrides')
            .insert({
              organization_id: organizationId,
              employee_id: employeeId,
              module,
              actions: newActions,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-overrides', employeeId] });
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to save override'),
  });

  // Remove all overrides for a module
  const removeModuleOverride = useMutation({
    mutationFn: async (module: string) => {
      const existing = overrides.find(o => o.module === module);
      if (!existing) return;
      const { error } = await supabase
        .from('employee_permission_overrides')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-overrides', employeeId] });
    },
  });

  // Save notes
  const saveNote = useMutation({
    mutationFn: async ({ module, notes }: { module: string; notes: string }) => {
      const existing = overrides.find(o => o.module === module);
      if (!existing) return;
      const { error } = await supabase
        .from('employee_permission_overrides')
        .update({ notes })
        .eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-overrides', employeeId] });
      setNotesModule(null);
      setNoteText('');
    },
  });

  const filteredModules = useMemo(() => {
    if (deptFilter === 'All') return MODULE_PERMISSION_DEFINITIONS;
    return MODULE_PERMISSION_DEFINITIONS.filter(
      m => m.department === deptFilter || m.department === 'All'
    );
  }, [deptFilter]);

  const customModuleCount = useMemo(
    () => overrides.filter(o => o.actions.length > 0).length,
    [overrides]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bg }]}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: surf, borderBottomColor: bdr }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Custom Permissions</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{employeeName}</Text>
          </View>
          <View style={styles.closeBtn} />
        </View>

        {/* Role template badge */}
        <View style={[styles.roleBanner, { backgroundColor: cyan + '12', borderBottomColor: bdr }]}>
          <Shield size={14} color={cyan} />
          <Text style={[styles.roleBannerText, { color: cyan, fontFamily: MONO }]}>
            ROLE TEMPLATE: {roleName.toUpperCase()}
          </Text>
          {customModuleCount > 0 && (
            <View style={[styles.customBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
              <Text style={[styles.customBadgeText, { color: colors.warning, fontFamily: MONO }]}>
                {customModuleCount} CUSTOM
              </Text>
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: surf, borderBottomColor: bdr }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Inherited from role</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Custom override</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: bdr }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>No access</Text>
          </View>
        </View>

        {/* Dept filter */}
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

        {/* Module list */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={cyan} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {filteredModules.map((moduleDef, idx) => {
              const isExpanded = expandedModule === moduleDef.module;
              const status = moduleStatus(moduleDef.module);
              const effective = effectiveActions(moduleDef.module);
              const overridden = overrideActions(moduleDef.module);
              const inherited = inheritedActions(moduleDef.module);
              const hasOverride = overridden.length > 0;
              const existingOverride = overrides.find(o => o.module === moduleDef.module);

              return (
                <View key={moduleDef.module}>
                  {/* Module row */}
                  <Pressable
                    style={[
                      styles.moduleRow,
                      { borderBottomColor: bdr },
                      idx % 2 === 0 && { backgroundColor: surf + '60' },
                      isExpanded && { backgroundColor: cyan + '06' },
                      hasOverride && { borderLeftColor: colors.warning, borderLeftWidth: 3 },
                    ]}
                    onPress={() => setExpandedModule(isExpanded ? null : moduleDef.module)}
                  >
                    {/* Expand icon */}
                    <View style={styles.moduleExpandIcon}>
                      {isExpanded
                        ? <ChevronDown size={14} color={cyan} />
                        : <ChevronRight size={14} color={colors.textSecondary} />}
                    </View>

                    {/* Module info */}
                    <View style={styles.moduleInfo}>
                      <Text style={[styles.moduleName, { color: colors.text }]}>{moduleDef.name}</Text>
                      <Text style={[styles.moduleDept, { color: colors.textSecondary, fontFamily: MONO }]}>
                        {moduleDef.department}
                      </Text>
                    </View>

                    {/* Status indicators */}
                    <View style={styles.moduleStatus}>
                      {effective.length > 0 ? (
                        <View style={styles.actionPills}>
                          {effective.slice(0, 3).map(a => (
                            <View
                              key={a}
                              style={[
                                styles.actionPill,
                                {
                                  backgroundColor: overridden.includes(a)
                                    ? colors.warning + '20'
                                    : colors.success + '18',
                                  borderColor: overridden.includes(a)
                                    ? colors.warning + '50'
                                    : colors.success + '40',
                                },
                              ]}
                            >
                              <Text style={[
                                styles.actionPillText,
                                {
                                  color: overridden.includes(a) ? colors.warning : colors.success,
                                  fontFamily: MONO,
                                },
                              ]}>
                                {a.replace('_', ' ')}
                              </Text>
                            </View>
                          ))}
                          {effective.length > 3 && (
                            <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                              +{effective.length - 3}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text style={[styles.noAccessText, { color: colors.textSecondary, fontFamily: MONO }]}>
                          NO ACCESS
                        </Text>
                      )}
                    </View>

                    {/* Remove override button */}
                    {hasOverride && (
                      <Pressable
                        style={[styles.removeBtn, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}
                        onPress={() => {
                          Alert.alert(
                            'Remove Override',
                            `Remove custom permissions for ${moduleDef.name}? Inherited role permissions still apply.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: () => removeModuleOverride.mutate(moduleDef.module) },
                            ]
                          );
                        }}
                      >
                        <Trash2 size={12} color={colors.error} />
                      </Pressable>
                    )}
                  </Pressable>

                  {/* Expanded action checkboxes */}
                  {isExpanded && (
                    <View style={[styles.actionsExpanded, { backgroundColor: cyan + '04', borderBottomColor: bdr }]}>
                      <View style={[styles.actionsHeader, { borderBottomColor: bdr }]}>
                        <Text style={[styles.actionsHeaderInherited, { color: colors.success, fontFamily: MONO }]}>
                          ● INHERITED
                        </Text>
                        <Text style={[styles.actionsHeaderCustom, { color: colors.warning, fontFamily: MONO }]}>
                          ● CUSTOM OVERRIDE
                        </Text>
                      </View>

                      {moduleDef.actions.map(actionDef => {
                        const isInherited = inherited.includes(actionDef.action);
                        const isOverridden = overridden.includes(actionDef.action);
                        const isEffective = isInherited || isOverridden;

                        return (
                          <View
                            key={actionDef.action}
                            style={[styles.actionRow, { borderBottomColor: bdr }]}
                          >
                            {/* Action label */}
                            <Text style={[styles.actionLabel, { color: isEffective ? colors.text : colors.textSecondary }]}>
                              {actionDef.label}
                            </Text>

                            {/* Inherited indicator (read-only) */}
                            <View style={[
                              styles.inheritedBox,
                              {
                                backgroundColor: isInherited ? colors.success + '15' : 'transparent',
                                borderColor: isInherited ? colors.success + '40' : bdr,
                              },
                            ]}>
                              {isInherited && <Check size={11} color={colors.success} />}
                            </View>

                            {/* Override toggle */}
                            <Pressable
                              style={[
                                styles.overrideBox,
                                {
                                  backgroundColor: isOverridden ? colors.warning + '20' : 'transparent',
                                  borderColor: isOverridden ? colors.warning : bdr,
                                },
                              ]}
                              onPress={() => {
                                if (isInherited && !isOverridden) {
                                  // Already has it from role — inform user
                                  Alert.alert(
                                    'Already Inherited',
                                    `${actionDef.label} is already granted by the ${roleName} role. You only need to add overrides for permissions NOT in their role.`,
                                    [{ text: 'OK' }]
                                  );
                                  return;
                                }
                                toggleOverride.mutate({
                                  module: moduleDef.module,
                                  action: actionDef.action,
                                  currentOverrides: overridden,
                                });
                              }}
                              disabled={toggleOverride.isPending}
                            >
                              {isOverridden && <Check size={11} color={colors.warning} />}
                              {!isOverridden && !isInherited && (
                                <Plus size={10} color={colors.textTertiary} />
                              )}
                            </Pressable>
                          </View>
                        );
                      })}

                      {/* Notes section */}
                      {hasOverride && (
                        <View style={[styles.notesRow, { borderTopColor: bdr }]}>
                          {notesModule === moduleDef.module ? (
                            <View style={styles.notesInput}>
                              <TextInput
                                style={[styles.notesField, { color: colors.text, borderColor: bdr, backgroundColor: bg }]}
                                placeholder="Add a note about why this override was granted..."
                                placeholderTextColor={colors.textSecondary}
                                value={noteText}
                                onChangeText={setNoteText}
                                multiline
                                autoFocus
                              />
                              <View style={styles.notesBtns}>
                                <Pressable style={[styles.noteBtn, { backgroundColor: cyan + '18', borderColor: cyan + '40' }]} onPress={() => saveNote.mutate({ module: moduleDef.module, notes: noteText })}>
                                  <Text style={[styles.noteBtnText, { color: cyan, fontFamily: MONO }]}>SAVE</Text>
                                </Pressable>
                                <Pressable style={[styles.noteBtn, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]} onPress={() => { setNotesModule(null); setNoteText(''); }}>
                                  <Text style={[styles.noteBtnText, { color: colors.error, fontFamily: MONO }]}>CANCEL</Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : (
                            <Pressable
                              style={styles.notesBtn}
                              onPress={() => { setNotesModule(moduleDef.module); setNoteText(existingOverride?.notes || ''); }}
                            >
                              <Info size={12} color={colors.textSecondary} />
                              <Text style={[styles.notesBtnText, { color: colors.textSecondary }]}>
                                {existingOverride?.notes || 'Add note about this override...'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 60 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  closeBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700' as const },
  headerSub:    { fontSize: 12, marginTop: 2 },

  // Role banner
  roleBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  roleBannerText: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1, flex: 1 },
  customBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  customBadgeText:{ fontSize: 9, fontWeight: '800' as const, letterSpacing: 0.5 },

  // Legend
  legend:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 11 },

  // Dept filter
  deptBar:        { flexGrow: 0, borderBottomWidth: 1 },
  deptBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  deptChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  deptChipText:   { fontSize: 9, fontWeight: '800' as const, letterSpacing: 1 },

  // Module row
  moduleRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, gap: 10, minHeight: 52 },
  moduleExpandIcon: { width: 20 },
  moduleInfo:       { width: 150 },
  moduleName:       { fontSize: 13, fontWeight: '600' as const },
  moduleDept:       { fontSize: 8, letterSpacing: 0.5, marginTop: 2 },
  moduleStatus:     { flex: 1 },
  actionPills:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  actionPill:       { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  actionPillText:   { fontSize: 8, fontWeight: '700' as const, letterSpacing: 0.3 },
  moreText:         { fontSize: 10 },
  noAccessText:     { fontSize: 9, letterSpacing: 0.5 },
  removeBtn:        { padding: 6, borderRadius: 6, borderWidth: 1 },

  // Expanded actions
  actionsExpanded: { borderBottomWidth: 1 },
  actionsHeader:   { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, gap: 16 },
  actionsHeaderInherited: { fontSize: 8, fontWeight: '800' as const, letterSpacing: 1, flex: 1, textAlign: 'right' as const, marginRight: 8 },
  actionsHeaderCustom:    { fontSize: 8, fontWeight: '800' as const, letterSpacing: 1, width: 36, textAlign: 'center' as const },

  actionRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  actionLabel:   { flex: 1, fontSize: 12 },
  inheritedBox:  { width: 22, height: 22, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  overrideBox:   { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Notes
  notesRow:   { padding: 12, borderTopWidth: 1 },
  notesBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notesBtnText: { fontSize: 12, fontStyle: 'italic' as const, flex: 1 },
  notesInput: { gap: 8 },
  notesField: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 60 },
  notesBtns:  { flexDirection: 'row', gap: 8 },
  noteBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  noteBtnText:{ fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
});
