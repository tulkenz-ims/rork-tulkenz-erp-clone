import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions, MODULE_PERMISSION_DEFINITIONS } from '@/contexts/PermissionsContext';
import { Check, Minus, Shield } from 'lucide-react-native';

export default function PermissionsMatrixScreen() {
  const { colors } = useTheme();
  const { roles, roleHasPermission } = usePermissions();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const displayRoles = useMemo(() => {
    if (selectedRoleId) {
      return roles.filter(r => r.id === selectedRoleId);
    }
    return roles;
  }, [roles, selectedRoleId]);

  const getModuleStatus = (roleId: string, module: string) => {
    const moduleDef = MODULE_PERMISSION_DEFINITIONS.find(m => m.module === module as any);
    if (!moduleDef) return 'none';
    const enabledCount = moduleDef.actions.filter(a =>
      roleHasPermission(roleId, module as any, a.action as any)
    ).length;
    if (enabledCount === 0) return 'none';
    if (enabledCount === moduleDef.actions.length) return 'full';
    return 'partial';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Role filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.roleFilterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.roleFilterContent}
      >
        <Pressable
          style={[
            styles.roleChip,
            { borderColor: !selectedRoleId ? colors.primary : colors.border },
            !selectedRoleId && { backgroundColor: colors.primary + '15' },
          ]}
          onPress={() => setSelectedRoleId(null)}
        >
          <Text style={[styles.roleChipText, { color: !selectedRoleId ? colors.primary : colors.textSecondary }]}>
            All Roles
          </Text>
        </Pressable>
        {roles.map(role => (
          <Pressable
            key={role.id}
            style={[
              styles.roleChip,
              { borderColor: selectedRoleId === role.id ? role.color : colors.border },
              selectedRoleId === role.id && { backgroundColor: role.color + '15' },
            ]}
            onPress={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
          >
            <View style={[styles.roleChipDot, { backgroundColor: role.color }]} />
            <Text style={[
              styles.roleChipText,
              { color: selectedRoleId === role.id ? role.color : colors.textSecondary },
            ]}>
              {role.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { borderBottomColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Full Access</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Partial Access</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>No Access</Text>
        </View>
      </View>

      {/* Matrix */}
      <ScrollView style={styles.matrixScroll} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>

            {/* Header row — role names */}
            <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.moduleNameCell, { borderRightColor: colors.border }]}>
                <Text style={[styles.moduleNameHeader, { color: colors.textSecondary }]}>MODULE</Text>
              </View>
              {displayRoles.map(role => (
                <View
                  key={role.id}
                  style={[styles.roleHeaderCell, { borderRightColor: colors.border }]}
                >
                  <View style={[styles.roleHeaderDot, { backgroundColor: role.color }]} />
                  <Text
                    style={[styles.roleHeaderText, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {role.name}
                  </Text>
                </View>
              ))}
            </View>

            {/* Module rows */}
            {MODULE_PERMISSION_DEFINITIONS.map((moduleDef, index) => (
              <View
                key={moduleDef.module}
                style={[
                  styles.moduleRow,
                  { borderBottomColor: colors.border },
                  index % 2 === 0 && { backgroundColor: colors.surface + '80' },
                ]}
              >
                <View style={[styles.moduleNameCell, { borderRightColor: colors.border }]}>
                  <Text style={[styles.moduleName, { color: colors.text }]} numberOfLines={1}>
                    {moduleDef.name}
                  </Text>
                </View>
                {displayRoles.map(role => {
                  const status = getModuleStatus(role.id, moduleDef.module);
                  return (
                    <View
                      key={role.id}
                      style={[styles.matrixCell, { borderRightColor: colors.border }]}
                    >
                      {status === 'full' && (
                        <View style={[styles.statusDot, { backgroundColor: colors.primary + '20' }]}>
                          <Check size={14} color={colors.primary} />
                        </View>
                      )}
                      {status === 'partial' && (
                        <View style={[styles.statusDot, { backgroundColor: '#F59E0B20' }]}>
                          <Minus size={14} color="#F59E0B" />
                        </View>
                      )}
                      {status === 'none' && (
                        <View style={[styles.statusDotEmpty, { borderColor: colors.border }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

          </View>
        </ScrollView>

        {roles.length === 0 && (
          <View style={styles.emptyContainer}>
            <Shield size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Roles Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create roles in the Roles tab to see the permissions matrix
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roleFilterBar: {
    borderBottomWidth: 1,
    maxHeight: 56,
  },
  roleFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  matrixScroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  moduleNameCell: {
    width: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  moduleNameHeader: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  roleHeaderCell: {
    width: 90,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    gap: 4,
  },
  roleHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleHeaderText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  moduleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  moduleName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  matrixCell: {
    width: 90,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotEmpty: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
});
