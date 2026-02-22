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
  Platform,
} from 'react-native';

// Base URL for QR codes
const getBaseUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://tulkenz.app';
};
import {
  AlertTriangle,
  Search,
  X,
  Eye,
  Download,
  Printer,
  Check,
  CheckSquare,
  Square,
  Calendar,
  Building2,
  Hash,
  ExternalLink,
  ShieldAlert,
  Droplets,
  Flame,
  Wind,
  Hand,
  Glasses,
  HardHat,
  Package,
  MapPin,
  Heart,
  Skull,
  Info,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { formatDate } from '@/constants/documentsConstants';
import { QR_PRINT_SIZES, QRPrintSize } from '@/types/documents';
import { useSDSRecordsQuery, useSDSManufacturers } from '@/hooks/useSupabaseSDS';
import { Tables } from '@/lib/supabase';

type SDSRecord = Tables['sds_records'];

const getSDSStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return '#10B981';
    case 'expired': return '#EF4444';
    case 'superseded': return '#F59E0B';
    case 'archived': return '#6B7280';
    default: return '#6B7280';
  }
};

const getSDSStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'expired': return 'Expired';
    case 'superseded': return 'Superseded';
    case 'archived': return 'Archived';
    default: return status;
  }
};

export default function SDSIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | 'all'>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSize, setPrintSize] = useState<QRPrintSize>('medium');
  const [selectedDocument, setSelectedDocument] = useState<SDSRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const { data: sdsRecords = [], isLoading, refetch, isRefetching } = useSDSRecordsQuery();
  const { data: manufacturers = [] } = useSDSManufacturers();

  const filteredDocuments = useMemo(() => {
    return sdsRecords.filter(doc => {
      const matchesSearch = searchQuery === '' ||
        doc.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sds_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.cas_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesManufacturer = selectedManufacturer === 'all' || doc.manufacturer === selectedManufacturer;

      return matchesSearch && matchesManufacturer;
    });
  }, [sdsRecords, searchQuery, selectedManufacturer]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const toggleDocumentSelection = useCallback((docId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  }, []);

  const selectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(d => d.id));
    }
  }, [filteredDocuments, selectedDocuments]);

  const handlePrintSingle = useCallback((doc: SDSRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDocuments([doc.id]);
    setShowPrintModal(true);
  }, []);

  const handlePrintSelected = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPrintModal(true);
  }, []);

  const handleViewDocument = useCallback((doc: SDSRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDocument(doc);
    setShowDetailModal(true);
  }, []);

  const handleOpenSDS = useCallback(() => {
    if (selectedDocument?.file_url) {
      Linking.openURL(selectedDocument.file_url);
    }
  }, [selectedDocument]);

  const handlePublicView = useCallback((doc: SDSRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sds/${doc.id}` as any);
  }, [router]);

  const generateQRValue = (doc: SDSRecord): string => {
    return `${getBaseUrl()}/sds/${doc.id}`;
  };

  const renderSDSCard = (doc: SDSRecord) => {
    const isSelected = selectedDocuments.includes(doc.id);
    const statusColor = getSDSStatusColor(doc.status || 'active');

    return (
      <Pressable
        key={doc.id}
        style={({ pressed }) => [
          styles.sdsCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        onPress={() => isSelectMode ? toggleDocumentSelection(doc.id) : handleViewDocument(doc)}
        onLongPress={() => {
          setIsSelectMode(true);
          toggleDocumentSelection(doc.id);
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            {isSelectMode && (
              <Pressable
                style={styles.checkbox}
                onPress={() => toggleDocumentSelection(doc.id)}
              >
                {isSelected ? (
                  <CheckSquare size={22} color={colors.primary} />
                ) : (
                  <Square size={22} color={colors.textSecondary} />
                )}
              </Pressable>
            )}
            <View style={[styles.sdsIconBadge, { backgroundColor: '#EF4444' + '20' }]}>
              <AlertTriangle size={20} color="#EF4444" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.chemicalName, { color: colors.text }]} numberOfLines={1}>
                {doc.product_name}
              </Text>
              <View style={styles.materialRow}>
                <Hash size={12} color={colors.textTertiary} />
                <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                  {doc.sds_number || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
            <QRCode
              value={`${getBaseUrl()}/sds/${doc.id}`}
              size={44}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="L"
            />
          </View>
        </View>

        <View style={styles.cardMeta}>
          {(doc as any).contains_allergens && (
            <View style={[styles.deptBadge, { backgroundColor: '#DC2626' + '20' }]}>
              <ShieldAlert size={11} color="#DC2626" />
              <Text style={[styles.deptText, { color: '#DC2626', fontWeight: '700' as const }]}>ALLERGENS</Text>
            </View>
          )}
          {doc.manufacturer && (
            <View style={[styles.deptBadge, { backgroundColor: colors.primary + '20' }]}>
              <Building2 size={11} color={colors.primary} />
              <Text style={[styles.deptText, { color: colors.primary }]}>{doc.manufacturer}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{getSDSStatusLabel(doc.status || 'active')}</Text>
          </View>
          {doc.issue_date && (
            <View style={styles.dateInfo}>
              <Calendar size={11} color={colors.textTertiary} />
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                {formatDate(doc.issue_date)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.info + '15' }]}
            onPress={() => handleViewDocument(doc)}
          >
            <Eye size={14} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.info }]}>View</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
            onPress={() => handlePublicView(doc)}
          >
            <ExternalLink size={14} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Public</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#8B5CF6' + '15' }]}
            onPress={() => handlePrintSingle(doc)}
          >
            <Printer size={14} color="#8B5CF6" />
            <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Print QR</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading SDS records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: '#EF4444' + '10', borderColor: '#EF4444' + '30' }]}>
          <View style={[styles.headerIcon, { backgroundColor: '#EF4444' + '20' }]}>
            <AlertTriangle size={28} color="#EF4444" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Safety Data Sheets</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {sdsRecords.length} sheets with scannable QR codes
            </Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search product, SDS #, or manufacturer..."
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deptScroll}
          contentContainerStyle={styles.deptScrollContent}
        >
          <Pressable
            style={[
              styles.deptChip,
              {
                backgroundColor: selectedManufacturer === 'all' ? colors.primary : colors.surface,
                borderColor: selectedManufacturer === 'all' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedManufacturer('all')}
          >
            <Text style={[styles.deptChipText, { color: selectedManufacturer === 'all' ? '#FFFFFF' : colors.textSecondary }]}>
              All ({sdsRecords.length})
            </Text>
          </Pressable>
          {manufacturers.map(mfr => {
            const count = sdsRecords.filter(d => d.manufacturer === mfr).length;
            return (
              <Pressable
                key={mfr}
                style={[
                  styles.deptChip,
                  {
                    backgroundColor: selectedManufacturer === mfr ? colors.primary : colors.surface,
                    borderColor: selectedManufacturer === mfr ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedManufacturer(mfr)}
              >
                <Text style={[styles.deptChipText, { color: selectedManufacturer === mfr ? '#FFFFFF' : colors.textSecondary }]}>
                  {mfr} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isSelectMode && (
          <View style={[styles.selectBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.selectInfo}>
              <Text style={[styles.selectCount, { color: colors.text }]}>
                {selectedDocuments.length} selected
              </Text>
              <Pressable onPress={selectAll}>
                <Text style={[styles.selectAllText, { color: colors.primary }]}>
                  {selectedDocuments.length === filteredDocuments.length ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.selectActions}>
              <Pressable
                style={[styles.selectActionBtn, { backgroundColor: colors.error + '15' }]}
                onPress={() => {
                  setIsSelectMode(false);
                  setSelectedDocuments([]);
                }}
              >
                <X size={16} color={colors.error} />
              </Pressable>
              <Pressable
                style={[
                  styles.selectActionBtn,
                  {
                    backgroundColor: selectedDocuments.length > 0 ? '#8B5CF6' : colors.border,
                    opacity: selectedDocuments.length > 0 ? 1 : 0.5,
                  },
                ]}
                onPress={handlePrintSelected}
                disabled={selectedDocuments.length === 0}
              >
                <Printer size={16} color="#FFFFFF" />
                <Text style={styles.printBtnText}>Print QR</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.resultsInfo}>
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {filteredDocuments.length} SDS sheet{filteredDocuments.length !== 1 ? 's' : ''}
          </Text>
          {!isSelectMode && (
            <Pressable onPress={() => setIsSelectMode(true)}>
              <Text style={[styles.selectModeText, { color: colors.primary }]}>Select Multiple</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sdsList}>
          {filteredDocuments.map(renderSDSCard)}
        </View>

        {filteredDocuments.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AlertTriangle size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No SDS sheets found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {sdsRecords.length === 0 ? 'Add SDS records to get started' : 'Try adjusting your search'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showPrintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.printModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.printModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.printModalTitle, { color: colors.text }]}>Print QR Codes</Text>
              <Pressable onPress={() => setShowPrintModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.printModalContent}>
              <Text style={[styles.printSectionTitle, { color: colors.text }]}>
                Selected: {selectedDocuments.length} SDS sheet{selectedDocuments.length !== 1 ? 's' : ''}
              </Text>

              <View style={styles.selectedList}>
                {selectedDocuments.slice(0, 5).map(docId => {
                  const doc = sdsRecords.find(d => d.id === docId);
                  if (!doc) return null;
                  return (
                    <View key={doc.id} style={[styles.selectedItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.selectedItemText, { color: colors.text }]} numberOfLines={1}>
                        {doc.product_name}
                      </Text>
                      <Text style={[styles.selectedItemMaterial, { color: colors.textSecondary }]}>
                        {doc.sds_number}
                      </Text>
                    </View>
                  );
                })}
                {selectedDocuments.length > 5 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    +{selectedDocuments.length - 5} more...
                  </Text>
                )}
              </View>

              <Text style={[styles.printSectionTitle, { color: colors.text }]}>Label Size</Text>
              <View style={styles.sizeOptions}>
                {QR_PRINT_SIZES.map(size => (
                  <Pressable
                    key={size.id}
                    style={[
                      styles.sizeOption,
                      {
                        backgroundColor: printSize === size.id ? colors.primary + '20' : colors.background,
                        borderColor: printSize === size.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPrintSize(size.id)}
                  >
                    {printSize === size.id && (
                      <Check size={16} color={colors.primary} />
                    )}
                    <Text style={[styles.sizeOptionText, { color: printSize === size.id ? colors.primary : colors.text }]}>
                      {size.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.previewCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                <Text style={styles.previewTitle}>Print Preview</Text>
                <View style={styles.previewContent}>
                  <View style={[styles.previewQR, { width: QR_PRINT_SIZES.find(s => s.id === printSize)?.width || 144 / 2, height: QR_PRINT_SIZES.find(s => s.id === printSize)?.height || 144 / 2 }]}>
                    <QRCode
                      value={selectedDocuments.length > 0 && sdsRecords.find(d => d.id === selectedDocuments[0])
                        ? `${getBaseUrl()}/sds/${selectedDocuments[0]}`
                        : `${getBaseUrl()}/sds/preview`}
                      size={printSize === 'small' ? 50 : printSize === 'medium' ? 70 : 90}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                      ecl="M"
                    />
                  </View>
                  <Text style={styles.previewChemical}>Product Name</Text>
                  <Text style={styles.previewMaterial}>SDS-001</Text>
                  <Text style={styles.previewScan}>SCAN FOR SDS</Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.printModalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.downloadPngBtn, { borderColor: colors.border }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowPrintModal(false);
                }}
              >
                <Download size={18} color={colors.text} />
                <Text style={[styles.downloadPngText, { color: colors.text }]}>Download PNG</Text>
              </Pressable>
              <Pressable
                style={[styles.printBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowPrintModal(false);
                  setIsSelectMode(false);
                  setSelectedDocuments([]);
                }}
              >
                <Printer size={18} color="#FFFFFF" />
                <Text style={styles.printBtnTextLarge}>Print Labels</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
            {selectedDocument && (
              <>
                <View style={[styles.detailModalHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.detailHeaderLeft}>
                    <View style={[styles.sdsIconBadge, { backgroundColor: '#EF4444' + '20' }]}>
                      <AlertTriangle size={24} color="#EF4444" />
                    </View>
                    <View style={styles.detailHeaderInfo}>
                      <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
                        {selectedDocument.product_name}
                      </Text>
                      <Text style={[styles.detailMaterial, { color: colors.textSecondary }]}>
                        SDS # {selectedDocument.sds_number || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setShowDetailModal(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.detailContent}>
                  <View style={[styles.qrSection, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <View style={styles.qrLarge}>
                      <QRCode
                        value={`${getBaseUrl()}/sds/${selectedDocument.id}`}
                        size={200}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                        ecl="M"
                      />
                    </View>
                    <Text style={styles.qrUrl}>{generateQRValue(selectedDocument)}</Text>
                    <Text style={styles.qrNote}>Scan to view SDS instantly - no login required</Text>
                  </View>

                  {/* ── ALLERGEN WARNING ── */}
                  {(selectedDocument as any).contains_allergens && (
                    <View style={[styles.safetyBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <View style={styles.safetyBannerHeader}>
                        <ShieldAlert size={20} color="#DC2626" />
                        <Text style={[styles.safetyBannerTitle, { color: '#991B1B' }]}>⚠️ CONTAINS ALLERGENS</Text>
                      </View>
                      {Array.isArray((selectedDocument as any).allergens) && (selectedDocument as any).allergens.length > 0 && (
                        <View style={styles.allergenTagsRow}>
                          {(selectedDocument as any).allergens.map((a: string, i: number) => (
                            <View key={i} style={[styles.allergenTag, { backgroundColor: '#DC2626' }]}>
                              <Text style={styles.allergenTagText}>{a}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {(selectedDocument as any).allergen_notes ? (
                        <Text style={[styles.safetyBannerBody, { color: '#991B1B' }]}>{(selectedDocument as any).allergen_notes}</Text>
                      ) : null}
                    </View>
                  )}

                  {/* ── IDENTIFICATION ── */}
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Identification</Text>
                  <View style={[styles.detailsList, { borderColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product Name</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.product_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SDS Number</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.sds_number || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Manufacturer</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.manufacturer || 'N/A'}</Text>
                    </View>
                    {selectedDocument.manufacturer_phone && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Manufacturer Phone</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.manufacturer_phone}</Text>
                      </View>
                    )}
                    {selectedDocument.emergency_phone && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Emergency Phone</Text>
                        <Text style={[styles.detailValue, { color: '#DC2626', fontWeight: '700' as const }]}>{selectedDocument.emergency_phone}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                      <View style={[styles.statusBadgeLarge, { backgroundColor: getSDSStatusColor(selectedDocument.status || 'active') + '20' }]}>
                        <Text style={{ color: getSDSStatusColor(selectedDocument.status || 'active'), fontWeight: '600' as const, fontSize: 12 }}>
                          {getSDSStatusLabel(selectedDocument.status || 'active')}
                        </Text>
                      </View>
                    </View>
                    {selectedDocument.cas_number && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CAS Number</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.cas_number}</Text>
                      </View>
                    )}
                    {selectedDocument.un_number && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>UN Number</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.un_number}</Text>
                      </View>
                    )}
                    {selectedDocument.physical_state && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Physical State</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.physical_state}</Text>
                      </View>
                    )}
                    {selectedDocument.issue_date && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Issue Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedDocument.issue_date)}</Text>
                      </View>
                    )}
                    {selectedDocument.expiration_date && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expiration</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedDocument.expiration_date)}</Text>
                      </View>
                    )}
                  </View>

                  {/* ── HAZARD CLASSIFICATION ── */}
                  {(selectedDocument.signal_word || (selectedDocument.hazard_statements && selectedDocument.hazard_statements.length > 0) || (selectedDocument.ghs_pictograms && selectedDocument.ghs_pictograms.length > 0)) && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Hazard Classification</Text>
                      <View style={[styles.detailsList, { borderColor: colors.border }]}>
                        {selectedDocument.signal_word && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Signal Word</Text>
                            <View style={[styles.statusBadgeLarge, {
                              backgroundColor: selectedDocument.signal_word === 'danger' ? '#DC262620' : selectedDocument.signal_word === 'warning' ? '#F59E0B20' : '#10B98120',
                            }]}>
                              <Text style={{
                                color: selectedDocument.signal_word === 'danger' ? '#DC2626' : selectedDocument.signal_word === 'warning' ? '#D97706' : '#10B981',
                                fontWeight: '700' as const,
                                fontSize: 13,
                                textTransform: 'uppercase' as const,
                              }}>
                                {selectedDocument.signal_word}
                              </Text>
                            </View>
                          </View>
                        )}
                        {selectedDocument.ghs_pictograms && selectedDocument.ghs_pictograms.length > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>GHS Pictograms</Text>
                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                              {selectedDocument.ghs_pictograms.map((p: string, i: number) => (
                                <View key={i} style={[styles.allergenTag, { backgroundColor: '#F59E0B' }]}>
                                  <Text style={styles.allergenTagText}>{p}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                        {selectedDocument.hazard_class && selectedDocument.hazard_class.length > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Hazard Class</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.hazard_class.join(', ')}</Text>
                          </View>
                        )}
                        {selectedDocument.hazard_statements && selectedDocument.hazard_statements.length > 0 && (
                          <View style={[styles.detailRowStacked]}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Hazard Statements</Text>
                            {selectedDocument.hazard_statements.map((h: string, i: number) => (
                              <Text key={i} style={[styles.detailValue, { color: '#DC2626', marginTop: 2 }]}>• {h}</Text>
                            ))}
                          </View>
                        )}
                        {selectedDocument.precautionary_statements && selectedDocument.precautionary_statements.length > 0 && (
                          <View style={[styles.detailRowStacked]}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Precautionary Statements</Text>
                            {selectedDocument.precautionary_statements.map((p: string, i: number) => (
                              <Text key={i} style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>• {p}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* ── HEALTH HAZARDS ── */}
                  {(selectedDocument.health_hazards || selectedDocument.routes_of_exposure?.length || selectedDocument.symptoms_of_exposure) && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Health Hazards</Text>
                      <View style={[styles.detailsList, { borderColor: colors.border }]}>
                        {selectedDocument.health_hazards && (
                          <View style={styles.detailRowStacked}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Health Effects</Text>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>{selectedDocument.health_hazards}</Text>
                          </View>
                        )}
                        {selectedDocument.routes_of_exposure && selectedDocument.routes_of_exposure.length > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Routes of Exposure</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.routes_of_exposure.join(', ')}</Text>
                          </View>
                        )}
                        {selectedDocument.symptoms_of_exposure && (
                          <View style={styles.detailRowStacked}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Symptoms</Text>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>{selectedDocument.symptoms_of_exposure}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* ── FIRST AID ── */}
                  {(selectedDocument.first_aid_inhalation || selectedDocument.first_aid_skin || selectedDocument.first_aid_eye || selectedDocument.first_aid_ingestion) && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>First Aid Measures</Text>
                      <View style={[styles.detailsList, { borderColor: '#10B98140' }]}>
                        {selectedDocument.first_aid_inhalation && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Wind size={14} color="#10B981" />
                              <Text style={[styles.detailLabel, { color: '#10B981', fontWeight: '600' as const }]}>Inhalation</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.first_aid_inhalation}</Text>
                          </View>
                        )}
                        {selectedDocument.first_aid_skin && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Hand size={14} color="#10B981" />
                              <Text style={[styles.detailLabel, { color: '#10B981', fontWeight: '600' as const }]}>Skin Contact</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.first_aid_skin}</Text>
                          </View>
                        )}
                        {selectedDocument.first_aid_eye && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Glasses size={14} color="#10B981" />
                              <Text style={[styles.detailLabel, { color: '#10B981', fontWeight: '600' as const }]}>Eye Contact</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.first_aid_eye}</Text>
                          </View>
                        )}
                        {selectedDocument.first_aid_ingestion && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Droplets size={14} color="#10B981" />
                              <Text style={[styles.detailLabel, { color: '#10B981', fontWeight: '600' as const }]}>Ingestion</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.first_aid_ingestion}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* ── PPE REQUIREMENTS ── */}
                  {selectedDocument.ppe_requirements && Object.keys(selectedDocument.ppe_requirements).length > 0 && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>PPE Requirements</Text>
                      <View style={[styles.detailsList, { borderColor: '#3B82F640' }]}>
                        {Object.entries(selectedDocument.ppe_requirements as Record<string, any>).map(([key, val]) => (
                          <View key={key} style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{typeof val === 'string' ? val : JSON.stringify(val)}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* ── HANDLING & STORAGE ── */}
                  {(selectedDocument.handling_precautions || selectedDocument.storage_requirements) && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Handling & Storage</Text>
                      <View style={[styles.detailsList, { borderColor: colors.border }]}>
                        {selectedDocument.handling_precautions && (
                          <View style={styles.detailRowStacked}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Handling Precautions</Text>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>{selectedDocument.handling_precautions}</Text>
                          </View>
                        )}
                        {selectedDocument.storage_requirements && (
                          <View style={styles.detailRowStacked}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Storage Requirements</Text>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>{selectedDocument.storage_requirements}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* ── EMERGENCY / SPILL ── */}
                  {(selectedDocument.spill_procedures || selectedDocument.fire_extinguishing_media || selectedDocument.fire_fighting_procedures) && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Emergency Procedures</Text>
                      <View style={[styles.detailsList, { borderColor: '#EF444440' }]}>
                        {selectedDocument.spill_procedures && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Droplets size={14} color="#F59E0B" />
                              <Text style={[styles.detailLabel, { color: '#D97706', fontWeight: '600' as const }]}>Spill / Leak Procedures</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.spill_procedures}</Text>
                          </View>
                        )}
                        {selectedDocument.fire_extinguishing_media && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Flame size={14} color="#EF4444" />
                              <Text style={[styles.detailLabel, { color: '#DC2626', fontWeight: '600' as const }]}>Fire Extinguishing Media</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.fire_extinguishing_media}</Text>
                          </View>
                        )}
                        {selectedDocument.fire_fighting_procedures && (
                          <View style={styles.detailRowStacked}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Flame size={14} color="#EF4444" />
                              <Text style={[styles.detailLabel, { color: '#DC2626', fontWeight: '600' as const }]}>Fire Fighting Procedures</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>{selectedDocument.fire_fighting_procedures}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* ── LOCATION & DEPARTMENT ── */}
                  {((selectedDocument.location_used && selectedDocument.location_used.length > 0) || (selectedDocument.department_codes && selectedDocument.department_codes.length > 0)) && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Location & Department</Text>
                      <View style={[styles.detailsList, { borderColor: colors.border }]}>
                        {selectedDocument.location_used && selectedDocument.location_used.length > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Locations Used</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.location_used.join(', ')}</Text>
                          </View>
                        )}
                        {selectedDocument.department_codes && selectedDocument.department_codes.length > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Departments</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.department_codes.join(', ')}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* ── DISPOSAL ── */}
                  {selectedDocument.disposal_methods && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Disposal</Text>
                      <View style={[styles.detailsList, { borderColor: colors.border }]}>
                        <View style={styles.detailRowStacked}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Disposal Methods</Text>
                          <Text style={[styles.detailValue, { color: colors.text, marginTop: 2 }]}>{selectedDocument.disposal_methods}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {/* ── NOTES ── */}
                  {selectedDocument.notes && (
                    <>
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Notes</Text>
                      <View style={[styles.detailsList, { borderColor: colors.border }]}>
                        <View style={styles.detailRowStacked}>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedDocument.notes}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  <View style={{ height: 20 }} />
                </ScrollView>

                <View style={[styles.detailFooter, { borderTopColor: colors.border }]}>
                  <Pressable
                    style={[styles.detailBtn, { backgroundColor: colors.info }]}
                    onPress={handleOpenSDS}
                  >
                    <Eye size={18} color="#FFFFFF" />
                    <Text style={styles.detailBtnText}>View SDS</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.detailBtn, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => {
                      setShowDetailModal(false);
                      handlePrintSingle(selectedDocument);
                    }}
                  >
                    <Printer size={18} color="#FFFFFF" />
                    <Text style={styles.detailBtnText}>Print QR</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
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
  deptScroll: {
    marginBottom: 12,
  },
  deptScrollContent: {
    gap: 8,
  },
  deptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  deptChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  selectBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  selectCount: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  selectActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  selectActionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  printBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  resultsInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  selectModeText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  sdsList: {
    gap: 12,
  },
  sdsCard: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  cardLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 10,
  },
  checkbox: {
    marginRight: 4,
  },
  sdsIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardInfo: {
    flex: 1,
  },
  chemicalName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  materialRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 3,
  },
  materialNumber: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  qrContainer: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    alignItems: 'center' as const,
  },
  deptBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  deptText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  dateInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600' as const,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  printModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  printModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
  },
  printModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  printModalContent: {
    padding: 20,
  },
  printSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  selectedList: {
    gap: 8,
    marginBottom: 24,
  },
  selectedItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedItemText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  selectedItemMaterial: {
    fontSize: 12,
  },
  moreText: {
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  sizeOptions: {
    gap: 10,
    marginBottom: 24,
  },
  sizeOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  previewCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  previewTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  previewContent: {
    alignItems: 'center' as const,
  },
  previewQR: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  previewChemical: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  },
  previewMaterial: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  previewScan: {
    fontSize: 9,
    color: '#999',
    marginTop: 6,
    letterSpacing: 1,
  },
  printModalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  downloadPngBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  downloadPngText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  printBtn: {
    flex: 2,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  printBtnTextLarge: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  detailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  detailHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 12,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailMaterial: {
    fontSize: 12,
    marginTop: 2,
  },
  detailContent: {
    padding: 20,
  },
  qrSection: {
    alignItems: 'center' as const,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  qrLarge: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrUrl: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
  },
  qrNote: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  detailsList: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden' as const,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  statusBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  detailRowStacked: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  safetyBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  safetyBannerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  safetyBannerTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  safetyBannerBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  allergenTagsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 4,
  },
  allergenTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  allergenTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
});
