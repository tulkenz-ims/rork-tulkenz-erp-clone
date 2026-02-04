import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Ship,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Calendar,
  Package,
  Globe,
  FileText,
  ExternalLink,
  Plane,
  Truck,
  MapPin,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type NoticeStatus = 'confirmed' | 'pending' | 'rejected' | 'cancelled';
type TransportMode = 'ocean' | 'air' | 'truck' | 'rail';

interface PriorNotice {
  id: string;
  confirmationNumber: string;
  status: NoticeStatus;
  submissionDate: string;
  submissionTime: string;
  productDescription: string;
  fdiCode: string;
  quantity: string;
  countryOfOrigin: string;
  shipper: string;
  manufacturer: string;
  grower?: string;
  transportMode: TransportMode;
  carrierName: string;
  arrivalPort: string;
  anticipatedArrival: string;
  anticipatedArrivalTime: string;
  entryNumber?: string;
  consignee: string;
  importer: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<NoticeStatus, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: '#10B981' },
  pending: { label: 'Pending', color: '#F59E0B' },
  rejected: { label: 'Rejected', color: '#EF4444' },
  cancelled: { label: 'Cancelled', color: '#6B7280' },
};

const TRANSPORT_CONFIG: Record<TransportMode, { label: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  ocean: { label: 'Ocean', icon: Ship },
  air: { label: 'Air', icon: Plane },
  truck: { label: 'Truck', icon: Truck },
  rail: { label: 'Rail', icon: Truck },
};

const MOCK_NOTICES: PriorNotice[] = [
  {
    id: '1',
    confirmationNumber: 'PN-2026-00123456',
    status: 'confirmed',
    submissionDate: '2026-01-24',
    submissionTime: '14:30',
    productDescription: 'Organic Baby Spinach, Fresh',
    fdiCode: '20VGTO',
    quantity: '5,000 kg',
    countryOfOrigin: 'Mexico',
    shipper: 'Fresh Farms Mexico S.A.',
    manufacturer: 'Fresh Farms Mexico S.A.',
    transportMode: 'truck',
    carrierName: 'TransMex Logistics',
    arrivalPort: 'Otay Mesa, CA',
    anticipatedArrival: '2026-01-26',
    anticipatedArrivalTime: '08:00',
    consignee: 'ABC Food Company',
    importer: 'ABC Food Company',
    createdAt: '2026-01-24',
  },
  {
    id: '2',
    confirmationNumber: 'PN-2026-00123457',
    status: 'confirmed',
    submissionDate: '2026-01-23',
    submissionTime: '09:15',
    productDescription: 'Black Pepper, Whole',
    fdiCode: '22SPIC',
    quantity: '2,000 kg',
    countryOfOrigin: 'Vietnam',
    shipper: 'Vietnam Spice Export Co.',
    manufacturer: 'Vietnam Spice Export Co.',
    transportMode: 'ocean',
    carrierName: 'Maersk Line',
    arrivalPort: 'Long Beach, CA',
    anticipatedArrival: '2026-02-15',
    anticipatedArrivalTime: '06:00',
    entryNumber: 'ENT-2026-789012',
    consignee: 'ABC Food Company',
    importer: 'ABC Food Company',
    createdAt: '2026-01-23',
  },
];

export default function PriorNoticeScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices] = useState<PriorNotice[]>(MOCK_NOTICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<NoticeStatus | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<PriorNotice | null>(null);
  const [activeTab, setActiveTab] = useState<'notices' | 'requirements' | 'timing'>('notices');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      const matchesSearch = !searchQuery ||
        notice.confirmationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.productDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || notice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [notices, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: notices.length,
    confirmed: notices.filter(n => n.status === 'confirmed').length,
    pending: notices.filter(n => n.status === 'pending').length,
    thisMonth: notices.filter(n => n.submissionDate.startsWith('2026-01')).length,
  }), [notices]);

  const openDetail = useCallback((notice: PriorNotice) => {
    setSelectedNotice(notice);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openFDAPortal = useCallback(() => {
    Linking.openURL('https://www.access.fda.gov/');
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#6366F1' + '20' }]}>
            <Ship size={28} color="#6366F1" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Prior Notice</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FDA Prior Notice of Imported Food Shipments
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.confirmed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Confirmed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{stats.thisMonth}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(['notices', 'requirements', 'timing'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setActiveTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[
                styles.tabButtonText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'notices' && (
          <>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search notices..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <Pressable
                style={[
                  styles.filterChip,
                  { borderColor: !statusFilter ? colors.primary : colors.border },
                  !statusFilter && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => setStatusFilter(null)}
              >
                <Text style={[styles.filterText, { color: !statusFilter ? colors.primary : colors.text }]}>All</Text>
              </Pressable>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.filterChip,
                    { borderColor: statusFilter === key ? config.color : colors.border },
                    statusFilter === key && { backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => setStatusFilter(statusFilter === key ? null : key as NoticeStatus)}
                >
                  <Text style={[styles.filterText, { color: statusFilter === key ? config.color : colors.text }]}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Prior Notices ({filteredNotices.length})
              </Text>
              <Pressable
                style={[styles.portalButton, { backgroundColor: '#6366F1' }]}
                onPress={openFDAPortal}
              >
                <Globe size={16} color="#FFFFFF" />
                <Text style={styles.portalButtonText}>PNSI</Text>
                <ExternalLink size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            {filteredNotices.map(notice => {
              const statusConfig = STATUS_CONFIG[notice.status];
              const transportConfig = TRANSPORT_CONFIG[notice.transportMode];
              const TransportIcon = transportConfig.icon;

              return (
                <Pressable
                  key={notice.id}
                  style={({ pressed }) => [
                    styles.noticeCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderLeftWidth: 3,
                      borderLeftColor: statusConfig.color,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => openDetail(notice)}
                >
                  <View style={styles.noticeHeader}>
                    <View style={styles.noticeInfo}>
                      <Text style={[styles.confirmationNumber, { color: colors.primary }]}>
                        {notice.confirmationNumber}
                      </Text>
                      <Text style={[styles.productDescription, { color: colors.text }]}>
                        {notice.productDescription}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                    </View>
                  </View>

                  <View style={styles.noticeMeta}>
                    <View style={styles.metaItem}>
                      <Globe size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>{notice.countryOfOrigin}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Package size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>{notice.quantity}</Text>
                    </View>
                    <View style={[styles.transportBadge, { backgroundColor: colors.background }]}>
                      <TransportIcon size={12} color={colors.primary} />
                      <Text style={[styles.transportText, { color: colors.text }]}>{transportConfig.label}</Text>
                    </View>
                  </View>

                  <View style={styles.arrivalRow}>
                    <View style={styles.arrivalInfo}>
                      <MapPin size={14} color={colors.textTertiary} />
                      <Text style={[styles.arrivalPort, { color: colors.text }]}>{notice.arrivalPort}</Text>
                    </View>
                    <View style={styles.arrivalDate}>
                      <Calendar size={12} color={colors.textTertiary} />
                      <Text style={[styles.arrivalDateText, { color: colors.textSecondary }]}>
                        ETA: {notice.anticipatedArrival}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
                </Pressable>
              );
            })}

            {filteredNotices.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ship size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Prior Notices</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No prior notices match your search
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'requirements' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Prior Notice Requirements</Text>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#6366F1' + '20' }]}>
                  <FileText size={20} color="#6366F1" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>What is Prior Notice?</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Prior Notice is an FDA requirement under the Bioterrorism Act that requires advance notification of food shipments imported into the United States. This allows FDA to review, evaluate, and assess the safety of incoming food.
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#10B981' + '20' }]}>
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Required Information</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Product description and FDA Product Code{'\n'}
                • Quantity and packaging information{'\n'}
                • Manufacturer, shipper, and grower info{'\n'}
                • Country of origin/production{'\n'}
                • Anticipated arrival date, time, and port{'\n'}
                • Carrier and mode of transportation{'\n'}
                • Importer and consignee information
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                  <AlertTriangle size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Who Must Submit</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Prior Notice must be submitted by:{'\n'}
                • Importer or owner of the food{'\n'}
                • Agent of the importer or owner{'\n'}
                • Carrier that delivers the food{'\n'}
                • Broker or customs agent
              </Text>
            </View>

            <View style={[styles.alertCard, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' }]}>
              <AlertTriangle size={20} color="#EF4444" />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: '#EF4444' }]}>Failure to Comply</Text>
                <Text style={[styles.alertText, { color: colors.text }]}>
                  Food arriving without adequate prior notice may be refused admission and held at the port of entry.
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'timing' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Submission Timing</Text>

            <View style={[styles.timingCard, { backgroundColor: '#3B82F6' + '15', borderColor: '#3B82F6' }]}>
              <Plane size={24} color="#3B82F6" />
              <View style={styles.timingInfo}>
                <Text style={[styles.timingMode, { color: '#3B82F6' }]}>Air Transport</Text>
                <Text style={[styles.timingWindow, { color: colors.text }]}>No more than 15 days before arrival</Text>
                <Text style={[styles.timingDeadline, { color: colors.textSecondary }]}>
                  No less than 4 hours before arrival (2 hours for perishables)
                </Text>
              </View>
            </View>

            <View style={[styles.timingCard, { backgroundColor: '#6366F1' + '15', borderColor: '#6366F1' }]}>
              <Ship size={24} color="#6366F1" />
              <View style={styles.timingInfo}>
                <Text style={[styles.timingMode, { color: '#6366F1' }]}>Ocean Transport</Text>
                <Text style={[styles.timingWindow, { color: colors.text }]}>No more than 15 days before arrival</Text>
                <Text style={[styles.timingDeadline, { color: colors.textSecondary }]}>
                  No less than 8 hours before arrival
                </Text>
              </View>
            </View>

            <View style={[styles.timingCard, { backgroundColor: '#F59E0B' + '15', borderColor: '#F59E0B' }]}>
              <Truck size={24} color="#F59E0B" />
              <View style={styles.timingInfo}>
                <Text style={[styles.timingMode, { color: '#F59E0B' }]}>Land Transport (Road/Rail)</Text>
                <Text style={[styles.timingWindow, { color: colors.text }]}>No more than 15 days before arrival</Text>
                <Text style={[styles.timingDeadline, { color: colors.textSecondary }]}>
                  No less than 2 hours before arrival
                </Text>
              </View>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#10B981' + '20' }]}>
                  <Clock size={20} color="#10B981" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Best Practices</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Submit prior notice as early as possible{'\n'}
                • Verify all information before submission{'\n'}
                • Keep confirmation numbers accessible{'\n'}
                • Monitor for any FDA requests or holds{'\n'}
                • Update notice if arrival details change{'\n'}
                • Maintain records for 2 years
              </Text>
            </View>

            <Pressable
              style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
              onPress={openFDAPortal}
            >
              <Globe size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Submit Prior Notice</Text>
              <ExternalLink size={16} color="#FFFFFF" />
            </Pressable>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Notice Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedNotice && (() => {
            const statusConfig = STATUS_CONFIG[selectedNotice.status];
            const transportConfig = TRANSPORT_CONFIG[selectedNotice.transportMode];
            const TransportIcon = transportConfig.icon;

            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.detailHeader, { backgroundColor: statusConfig.color + '15' }]}>
                  <View style={[styles.detailIcon, { backgroundColor: statusConfig.color + '30' }]}>
                    <Ship size={28} color={statusConfig.color} />
                  </View>
                  <Text style={[styles.detailConfirmation, { color: colors.primary }]}>
                    {selectedNotice.confirmationNumber}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.surface, marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Product Information</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.productDescription}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>FDA Code</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.fdiCode}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.quantity}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Country of Origin</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.countryOfOrigin}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Shipping Information</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Shipper</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.shipper}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Manufacturer</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.manufacturer}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Transport Mode</Text>
                    <View style={styles.transportDetail}>
                      <TransportIcon size={14} color={colors.primary} />
                      <Text style={[styles.detailValue, { color: colors.text }]}>{transportConfig.label}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Carrier</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.carrierName}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Arrival Details</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Port of Arrival</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.arrivalPort}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expected Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.anticipatedArrival}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expected Time</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.anticipatedArrivalTime}</Text>
                  </View>
                  {selectedNotice.entryNumber && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Entry Number</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.entryNumber}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Parties</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Importer</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.importer}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Consignee</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNotice.consignee}</Text>
                  </View>
                </View>

                <View style={styles.bottomPadding} />
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2 },
  tabBar: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  tabButtonText: { fontSize: 12, fontWeight: '600' as const },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  filterRow: { marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  portalButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  portalButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
  noticeCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  noticeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  noticeInfo: { flex: 1 },
  confirmationNumber: { fontSize: 12, fontWeight: '600' as const, marginBottom: 2 },
  productDescription: { fontSize: 15, fontWeight: '600' as const },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  noticeMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 10,
  },
  metaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  metaText: { fontSize: 11 },
  transportBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  transportText: { fontSize: 11, fontWeight: '500' as const },
  arrivalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  arrivalInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  arrivalPort: { fontSize: 13, fontWeight: '500' as const },
  arrivalDate: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  arrivalDateText: { fontSize: 11 },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  requirementCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  requirementHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  requirementIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  requirementTitle: { fontSize: 15, fontWeight: '600' as const },
  requirementText: { fontSize: 13, lineHeight: 20 },
  alertCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  alertText: { fontSize: 13, lineHeight: 18 },
  timingCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    marginBottom: 12,
  },
  timingInfo: { flex: 1 },
  timingMode: { fontSize: 14, fontWeight: '600' as const },
  timingWindow: { fontSize: 14, marginTop: 4 },
  timingDeadline: { fontSize: 12, marginTop: 2 },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 16,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  detailHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  detailConfirmation: { fontSize: 14, fontWeight: '600' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500' as const, flex: 2, textAlign: 'right' as const },
  transportDetail: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
});
