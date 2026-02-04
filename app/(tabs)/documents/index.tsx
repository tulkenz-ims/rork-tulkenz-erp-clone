import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  ChevronDown,
  X,
  AlertTriangle,
  FileCheck,
  BookOpen,
  Shield,
  Clipboard,
  Award,
  GraduationCap,
  Calendar,
  User,
  Building2,
  Tag,
  QrCode,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { formatFileSize, formatDate } from '@/constants/documentsConstants';
import { useDocumentsQuery } from '@/hooks/useSupabaseDocuments';
import { Document, DocumentCategory, DocumentStatus, DOCUMENT_CATEGORIES, getCategoryInfo, getStatusColor, getStatusLabel } from '@/types/documents';
import { INVENTORY_DEPARTMENTS } from '@/constants/inventoryDepartmentCodes';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  AlertTriangle,
  FileCheck,
  BookOpen,
  Shield,
  Clipboard,
  FileText,
  Award,
  GraduationCap,
};

const mapSupabaseToDocument = (doc: any): Document => {
  const categoryMap: Record<string, DocumentCategory> = {
    'sop': 'SOP',
    'policy': 'Policy',
    'specification': 'Specification',
    'manual': 'SOP',
    'procedure': 'WorkInstruction',
    'form': 'WorkInstruction',
    'template': 'Specification',
    'training': 'TrainingMaterial',
    'certificate': 'Certification',
    'other': 'Specification',
  };
  
  const statusMap: Record<string, DocumentStatus> = {
    'draft': 'draft',
    'pending_review': 'draft',
    'pending_approval': 'draft',
    'approved': 'current',
    'active': 'current',
    'revision': 'draft',
    'obsolete': 'expired',
    'archived': 'expired',
  };

  return {
    id: doc.id,
    title: doc.title || 'Untitled Document',
    category: categoryMap[doc.document_type] || 'Specification',
    departmentId: parseInt(doc.department_code || '100', 10),
    description: doc.description || '',
    fileUrl: doc.file_url || '',
    fileType: doc.file_type || 'pdf',
    fileSize: doc.file_size || 0,
    version: doc.current_revision || '1.0',
    effectiveDate: doc.effective_date || doc.created_at,
    expirationDate: doc.expiration_date,
    status: statusMap[doc.status] || 'current',
    uploadedBy: doc.created_by || 'System',
    uploadedAt: doc.created_at,
    updatedAt: doc.updated_at,
    linkedInventoryItemId: doc.linked_item_id,
    linkedMaterialNumber: doc.document_number,
    linkedChemicalName: undefined,
    qrCodeUrl: undefined,
    tags: doc.tags || [],
    isCurrent: doc.status === 'active' || doc.status === 'approved',
  };
};

export default function DocumentLibraryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const { data: supabaseDocuments, isLoading, refetch, isRefetching } = useDocumentsQuery();
  
  const documents = useMemo(() => {
    if (!supabaseDocuments || supabaseDocuments.length === 0) return [];
    return supabaseDocuments.map(mapSupabaseToDocument);
  }, [supabaseDocuments]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = searchQuery === '' || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        doc.linkedChemicalName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesDepartment = selectedDepartment === 'all' || doc.departmentId === selectedDepartment;
      const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesDepartment && matchesStatus;
    });
  }, [documents, searchQuery, selectedCategory, selectedDepartment, selectedStatus]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { all: documents.length };
    DOCUMENT_CATEGORIES.forEach(cat => {
      stats[cat.value] = documents.filter(d => d.category === cat.value).length;
    });
    return stats;
  }, [documents]);

  const handleDocumentPress = useCallback((doc: Document) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDocument(doc);
    setShowDocumentModal(true);
  }, []);

  const handleViewDocument = useCallback(() => {
    if (selectedDocument?.fileUrl) {
      Linking.openURL(selectedDocument.fileUrl);
    }
  }, [selectedDocument]);

  const handleNavigateToSDS = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/documents/sds' as any);
  }, [router]);

  const clearFilters = useCallback(() => {
    setSelectedCategory('all');
    setSelectedDepartment('all');
    setSelectedStatus('all');
  }, []);

  const hasActiveFilters = selectedCategory !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all';

  const renderDocumentCard = (doc: Document) => {
    const categoryInfo = getCategoryInfo(doc.category);
    const IconComponent = CATEGORY_ICONS[categoryInfo.icon] || FileText;
    const department = INVENTORY_DEPARTMENTS[doc.departmentId];
    const statusColor = getStatusColor(doc.status);

    return (
      <Pressable
        key={doc.id}
        style={({ pressed }) => [
          styles.documentCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => handleDocumentPress(doc)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
            <IconComponent size={16} color={categoryInfo.color} />
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(doc.status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.documentTitle, { color: colors.text }]} numberOfLines={2}>
          {doc.title}
        </Text>

        {doc.description && (
          <Text style={[styles.documentDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {doc.description}
          </Text>
        )}

        <View style={styles.cardMeta}>
          {department && (
            <View style={styles.metaItem}>
              <Building2 size={12} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                {department.shortName}
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {formatDate(doc.uploadedAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Tag size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              v{doc.version}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.uploadedBy, { color: colors.textSecondary }]}>
            <User size={11} color={colors.textSecondary} /> {doc.uploadedBy}
          </Text>
          <View style={styles.cardActions}>
            {doc.category === 'SDS' && doc.qrCodeUrl && (
              <View style={[styles.qrBadge, { backgroundColor: colors.info + '20' }]}>
                <QrCode size={12} color={colors.info} />
              </View>
            )}
            <Eye size={16} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading documents...</Text>
          </View>
        ) : (
          <>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{documents.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Docs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{categoryStats['SDS'] || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SDS Sheets</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{categoryStats['SOP'] || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SOPs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EC4899' }]}>{categoryStats['Certification'] || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Certs</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.sdsQuickAccess,
            { 
              backgroundColor: '#EF4444' + '15', 
              borderColor: '#EF4444' + '40',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleNavigateToSDS}
        >
          <View style={styles.sdsQuickLeft}>
            <View style={[styles.sdsIcon, { backgroundColor: '#EF4444' + '30' }]}>
              <AlertTriangle size={24} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.sdsQuickTitle, { color: colors.text }]}>SDS Index with QR Codes</Text>
              <Text style={[styles.sdsQuickSubtitle, { color: colors.textSecondary }]}>
                {categoryStats['SDS'] || 0} sheets • Print QR labels
              </Text>
            </View>
          </View>
          <QrCode size={28} color="#EF4444" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.sdsQuickAccess,
            { 
              backgroundColor: '#3B82F6' + '15', 
              borderColor: '#3B82F6' + '40',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/safety/lotoprogram' as any);
          }}
        >
          <View style={styles.sdsQuickLeft}>
            <View style={[styles.sdsIcon, { backgroundColor: '#3B82F6' + '30' }]}>
              <BookOpen size={24} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.sdsQuickTitle, { color: colors.text }]}>Safety OPLs - LOTO Program</Text>
              <Text style={[styles.sdsQuickSubtitle, { color: colors.textSecondary }]}>
                6 One Point Lessons • Levels 0-5
              </Text>
            </View>
          </View>
          <FileCheck size={28} color="#3B82F6" />
        </Pressable>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search documents, chemicals, tags..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterButton,
              { 
                backgroundColor: hasActiveFilters ? colors.primary + '20' : colors.surface, 
                borderColor: hasActiveFilters ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={16} color={hasActiveFilters ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: hasActiveFilters ? colors.primary : colors.textSecondary }]}>
              Filters {hasActiveFilters && `(${[selectedCategory !== 'all', selectedDepartment !== 'all', selectedStatus !== 'all'].filter(Boolean).length})`}
            </Text>
            <ChevronDown size={16} color={hasActiveFilters ? colors.primary : colors.textSecondary} />
          </Pressable>

          {hasActiveFilters && (
            <Pressable style={[styles.clearButton, { borderColor: colors.border }]} onPress={clearFilters}>
              <X size={14} color={colors.textSecondary} />
              <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear</Text>
            </Pressable>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <Pressable
            style={[
              styles.categoryChip,
              { 
                backgroundColor: selectedCategory === 'all' ? colors.primary : colors.surface,
                borderColor: selectedCategory === 'all' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[
              styles.categoryChipText,
              { color: selectedCategory === 'all' ? '#FFFFFF' : colors.textSecondary },
            ]}>
              All ({categoryStats['all']})
            </Text>
          </Pressable>
          {DOCUMENT_CATEGORIES.map(cat => (
            <Pressable
              key={cat.value}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: selectedCategory === cat.value ? cat.color : colors.surface,
                  borderColor: selectedCategory === cat.value ? cat.color : colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text style={[
                styles.categoryChipText,
                { color: selectedCategory === cat.value ? '#FFFFFF' : colors.textSecondary },
              ]}>
                {cat.label} ({categoryStats[cat.value] || 0})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.documentGrid}>
          {filteredDocuments.map(renderDocumentCard)}
        </View>

        {filteredDocuments.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {documents.length === 0 ? 'Add documents to get started' : 'Try adjusting your search or filters'}
            </Text>
          </View>
        )}
          </>
        )}
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter Documents</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.filterModalContent}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Category</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedCategory === 'all' ? colors.primary + '20' : colors.background,
                      borderColor: selectedCategory === 'all' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[styles.filterOptionText, { color: selectedCategory === 'all' ? colors.primary : colors.text }]}>
                    All Categories
                  </Text>
                </Pressable>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.value}
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: selectedCategory === cat.value ? cat.color + '20' : colors.background,
                        borderColor: selectedCategory === cat.value ? cat.color : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.value)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedCategory === cat.value ? cat.color : colors.text }]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Department</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedDepartment === 'all' ? colors.primary + '20' : colors.background,
                      borderColor: selectedDepartment === 'all' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedDepartment('all')}
                >
                  <Text style={[styles.filterOptionText, { color: selectedDepartment === 'all' ? colors.primary : colors.text }]}>
                    All Departments
                  </Text>
                </Pressable>
                {Object.values(INVENTORY_DEPARTMENTS).map(dept => (
                  <Pressable
                    key={dept.code}
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: selectedDepartment === dept.code ? dept.color + '20' : colors.background,
                        borderColor: selectedDepartment === dept.code ? dept.color : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDepartment(dept.code)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedDepartment === dept.code ? dept.color : colors.text }]}>
                      {dept.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'current', 'draft', 'expired'].map(status => (
                  <Pressable
                    key={status}
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: selectedStatus === status ? colors.primary + '20' : colors.background,
                        borderColor: selectedStatus === status ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedStatus === status ? colors.primary : colors.text }]}>
                      {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.filterModalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.filterClearButton, { borderColor: colors.border }]}
                onPress={clearFilters}
              >
                <Text style={[styles.filterClearText, { color: colors.textSecondary }]}>Clear All</Text>
              </Pressable>
              <Pressable
                style={[styles.filterApplyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterApplyText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDocumentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.documentModal, { backgroundColor: colors.surface }]}>
            {selectedDocument && (
              <>
                <View style={[styles.documentModalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.documentModalTitle, { color: colors.text }]} numberOfLines={2}>
                    {selectedDocument.title}
                  </Text>
                  <Pressable onPress={() => setShowDocumentModal(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.documentModalContent}>
                  <View style={styles.documentModalMeta}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryInfo(selectedDocument.category).color + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryInfo(selectedDocument.category).color }]}>
                        {getCategoryInfo(selectedDocument.category).label}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDocument.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedDocument.status) }]}>
                        {getStatusLabel(selectedDocument.status)}
                      </Text>
                    </View>
                  </View>

                  {selectedDocument.description && (
                    <Text style={[styles.documentModalDescription, { color: colors.textSecondary }]}>
                      {selectedDocument.description}
                    </Text>
                  )}

                  <View style={[styles.documentDetailsList, { borderColor: colors.border }]}>
                    <View style={styles.documentDetailRow}>
                      <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Version</Text>
                      <Text style={[styles.documentDetailValue, { color: colors.text }]}>{selectedDocument.version}</Text>
                    </View>
                    <View style={styles.documentDetailRow}>
                      <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Department</Text>
                      <Text style={[styles.documentDetailValue, { color: colors.text }]}>
                        {INVENTORY_DEPARTMENTS[selectedDocument.departmentId]?.name || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.documentDetailRow}>
                      <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Uploaded By</Text>
                      <Text style={[styles.documentDetailValue, { color: colors.text }]}>{selectedDocument.uploadedBy}</Text>
                    </View>
                    <View style={styles.documentDetailRow}>
                      <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Upload Date</Text>
                      <Text style={[styles.documentDetailValue, { color: colors.text }]}>{formatDate(selectedDocument.uploadedAt)}</Text>
                    </View>
                    <View style={styles.documentDetailRow}>
                      <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Effective Date</Text>
                      <Text style={[styles.documentDetailValue, { color: colors.text }]}>{formatDate(selectedDocument.effectiveDate)}</Text>
                    </View>
                    {selectedDocument.expirationDate && (
                      <View style={styles.documentDetailRow}>
                        <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Expiration Date</Text>
                        <Text style={[styles.documentDetailValue, { color: colors.text }]}>{formatDate(selectedDocument.expirationDate)}</Text>
                      </View>
                    )}
                    <View style={styles.documentDetailRow}>
                      <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>File Size</Text>
                      <Text style={[styles.documentDetailValue, { color: colors.text }]}>{formatFileSize(selectedDocument.fileSize)}</Text>
                    </View>
                    {selectedDocument.linkedMaterialNumber && (
                      <View style={styles.documentDetailRow}>
                        <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Material #</Text>
                        <Text style={[styles.documentDetailValue, { color: colors.text }]}>{selectedDocument.linkedMaterialNumber}</Text>
                      </View>
                    )}
                    {selectedDocument.linkedChemicalName && (
                      <View style={styles.documentDetailRow}>
                        <Text style={[styles.documentDetailLabel, { color: colors.textSecondary }]}>Chemical</Text>
                        <Text style={[styles.documentDetailValue, { color: colors.text }]}>{selectedDocument.linkedChemicalName}</Text>
                      </View>
                    )}
                  </View>

                  {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                    <View style={styles.tagsSection}>
                      <Text style={[styles.tagsSectionTitle, { color: colors.textSecondary }]}>Tags</Text>
                      <View style={styles.tagsContainer}>
                        {selectedDocument.tags.map(tag => (
                          <View key={tag} style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={[styles.documentModalFooter, { borderTopColor: colors.border }]}>
                  <Pressable
                    style={[styles.viewButton, { backgroundColor: colors.primary }]}
                    onPress={handleViewDocument}
                  >
                    <Eye size={18} color="#FFFFFF" />
                    <Text style={styles.viewButtonText}>View Document</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.downloadButton, { backgroundColor: colors.success }]}
                    onPress={handleViewDocument}
                  >
                    <Download size={18} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </Pressable>
                </View>
              </>
            )}
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  sdsQuickAccess: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sdsQuickLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  sdsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sdsQuickTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sdsQuickSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  clearButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  documentGrid: {
    gap: 12,
  },
  documentCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  documentDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  uploadedBy: {
    fontSize: 11,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  cardActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  qrBadge: {
    padding: 4,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  filterModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filterModalContent: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterModalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  filterClearText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  filterApplyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  documentModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  documentModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    padding: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  documentModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    flex: 1,
  },
  documentModalContent: {
    padding: 20,
  },
  documentModalMeta: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  documentModalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  documentDetailsList: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  documentDetailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  documentDetailLabel: {
    fontSize: 13,
  },
  documentDetailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tagsSection: {
    marginTop: 20,
  },
  tagsSectionTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
  },
  documentModalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
