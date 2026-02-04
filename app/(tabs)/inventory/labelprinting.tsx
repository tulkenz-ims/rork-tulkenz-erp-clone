import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Printer,
  Search,
  CheckSquare,
  Square,
  Package,
  Tag,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { INVENTORY_DEPARTMENTS, getDepartmentColor } from '@/constants/inventoryDepartmentCodes';
import LabelPrinting, { LabelMaterial } from '@/components/LabelPrinting';

export default function LabelPrintingPage() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const { data: materialsData, isLoading, error, refetch } = useMaterialsQuery({
    orderBy: { column: 'name', ascending: true },
  });

  const materials: LabelMaterial[] = useMemo(() => {
    return (materialsData || []).map(m => ({
      id: m.id,
      materialNumber: m.material_number,
      name: m.name,
      sku: m.sku,
      inventoryDepartment: m.inventory_department,
      location: m.location || undefined,
      vendor: m.vendor || undefined,
      description: m.description || undefined,
      unit_of_measure: m.unit_of_measure,
      barcode: m.barcode || undefined,
    }));
  }, [materialsData]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchesSearch = searchQuery === '' ||
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.materialNumber.includes(searchQuery) ||
        material.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = selectedDepartment === null ||
        material.inventoryDepartment === selectedDepartment;
      
      return matchesSearch && matchesDepartment;
    });
  }, [materials, searchQuery, selectedDepartment]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredMaterials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMaterials.map(m => m.id));
    }
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Label Printing' }} />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading materials...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Label Printing' }} />
        <View style={[styles.container, styles.centerContent]}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={styles.errorText}>Failed to load materials</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Label Printing' }} />
      <View style={styles.container}>
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search materials..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedDepartment === null && styles.filterChipActive]}
            onPress={() => setSelectedDepartment(null)}
          >
            <Text style={[styles.filterChipText, selectedDepartment === null && styles.filterChipTextActive]}>
              All Departments
            </Text>
          </TouchableOpacity>
          {Object.values(INVENTORY_DEPARTMENTS).map(dept => (
            <TouchableOpacity
              key={dept.code}
              style={[
                styles.filterChip,
                selectedDepartment === dept.code && styles.filterChipActive,
                selectedDepartment === dept.code && { backgroundColor: dept.color }
              ]}
              onPress={() => setSelectedDepartment(
                selectedDepartment === dept.code ? null : dept.code
              )}
            >
              <Text style={[
                styles.filterChipText,
                selectedDepartment === dept.code && styles.filterChipTextActive
              ]}>
                {dept.shortName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
            {selectedIds.length === filteredMaterials.length && filteredMaterials.length > 0 ? (
              <CheckSquare size={20} color={colors.primary} />
            ) : (
              <Square size={20} color={colors.textSecondary} />
            )}
            <Text style={styles.selectAllText}>
              {selectedIds.length === filteredMaterials.length && filteredMaterials.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedIds.length} of {filteredMaterials.length} selected
          </Text>
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredMaterials.map(material => {
            const isSelected = selectedIds.includes(material.id);
            const deptColor = getDepartmentColor(material.inventoryDepartment);
            
            return (
              <TouchableOpacity
                key={material.id}
                style={[styles.materialItem, isSelected && styles.materialItemSelected]}
                onPress={() => toggleSelection(material.id)}
              >
                <View style={[styles.materialColorStrip, { backgroundColor: deptColor }]} />
                <View style={styles.materialCheckbox}>
                  {isSelected ? (
                    <CheckSquare size={22} color={colors.primary} />
                  ) : (
                    <Square size={22} color={colors.textTertiary} />
                  )}
                </View>
                <View style={styles.materialInfo}>
                  <View style={styles.materialHeader}>
                    <Text style={styles.materialNumber}>{material.materialNumber}</Text>
                    <View style={[styles.deptBadge, { backgroundColor: deptColor }]}>
                      <Text style={styles.deptBadgeText}>
                        {INVENTORY_DEPARTMENTS[material.inventoryDepartment]?.shortName}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.materialName} numberOfLines={1}>
                    {material.name}
                  </Text>
                  <View style={styles.materialMeta}>
                    <Text style={styles.materialSku}>SKU: {material.sku}</Text>
                    {material.location && (
                      <Text style={styles.materialLocation}>• {material.location}</Text>
                    )}
                  </View>
                </View>
                <Tag size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Package size={20} color={colors.primary} />
            <Text style={styles.footerText}>
              {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} ready to print
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.printButton, selectedIds.length === 0 && styles.printButtonDisabled]}
            onPress={() => setShowLabelModal(true)}
            disabled={selectedIds.length === 0}
          >
            <Printer size={20} color="#FFFFFF" />
            <Text style={styles.printButtonText}>Print Labels</Text>
          </TouchableOpacity>
        </View>

        <LabelPrinting
          visible={showLabelModal}
          onClose={() => setShowLabelModal(false)}
          materials={materials}
          selectedMaterialIds={selectedIds}
        />
      </View>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  selectionCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  materialItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  materialColorStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  materialCheckbox: {
    paddingHorizontal: 12,
  },
  materialInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  materialNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'monospace',
  },
  deptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  materialName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  materialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  materialSku: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  materialLocation: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  printButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  printButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
