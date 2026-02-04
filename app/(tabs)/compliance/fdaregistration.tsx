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
  X,
  Building2,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Calendar,
  MapPin,
  Globe,
  FileText,
  ExternalLink,
  RefreshCw,
  User,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type RegistrationStatus = 'active' | 'pending_renewal' | 'expired' | 'suspended';
type FacilityType = 'manufacturer' | 'processor' | 'packer' | 'holder' | 'warehouse' | 'importer';

interface FDARegistration {
  id: string;
  facilityName: string;
  feiNumber: string;
  registrationNumber: string;
  dunsBradstreet?: string;
  facilityType: FacilityType[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  status: RegistrationStatus;
  registrationDate: string;
  lastRenewalDate: string;
  nextRenewalDate: string;
  renewalPeriod: string;
  usAgent?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    email: string;
  };
  productCategories: string[];
  smallEntityExempt: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<RegistrationStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#10B981' },
  pending_renewal: { label: 'Renewal Due', color: '#F59E0B' },
  expired: { label: 'Expired', color: '#EF4444' },
  suspended: { label: 'Suspended', color: '#DC2626' },
};

const FACILITY_TYPE_CONFIG: Record<FacilityType, { label: string; color: string }> = {
  manufacturer: { label: 'Manufacturer', color: '#3B82F6' },
  processor: { label: 'Processor', color: '#6366F1' },
  packer: { label: 'Packer', color: '#8B5CF6' },
  holder: { label: 'Holder', color: '#EC4899' },
  warehouse: { label: 'Warehouse', color: '#F59E0B' },
  importer: { label: 'Importer', color: '#10B981' },
};

const MOCK_REGISTRATIONS: FDARegistration[] = [
  {
    id: '1',
    facilityName: 'Main Production Facility',
    feiNumber: '3012345678',
    registrationNumber: '18523694700',
    dunsBradstreet: '123456789',
    facilityType: ['manufacturer', 'processor', 'packer'],
    address: '1234 Food Safety Boulevard',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    country: 'United States',
    status: 'active',
    registrationDate: '2020-10-01',
    lastRenewalDate: '2024-10-15',
    nextRenewalDate: '2026-12-31',
    renewalPeriod: 'October 1 - December 31, Even Years',
    emergencyContact: {
      name: 'Sarah Johnson',
      phone: '(555) 123-4567',
      email: 'emergency@company.com',
    },
    productCategories: ['Prepared Salads', 'Vegetables/Vegetable Products', 'Dressings/Condiments'],
    smallEntityExempt: false,
    createdAt: '2020-10-01',
    updatedAt: '2024-10-15',
  },
  {
    id: '2',
    facilityName: 'Cold Storage Warehouse',
    feiNumber: '3012345679',
    registrationNumber: '18523694701',
    facilityType: ['holder', 'warehouse'],
    address: '5678 Distribution Center Drive',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60602',
    country: 'United States',
    status: 'active',
    registrationDate: '2021-03-15',
    lastRenewalDate: '2024-10-20',
    nextRenewalDate: '2026-12-31',
    renewalPeriod: 'October 1 - December 31, Even Years',
    emergencyContact: {
      name: 'Michael Chen',
      phone: '(555) 234-5678',
      email: 'warehouse@company.com',
    },
    productCategories: ['Prepared Salads', 'Vegetables/Vegetable Products', 'Dairy Products'],
    smallEntityExempt: false,
    createdAt: '2021-03-15',
    updatedAt: '2024-10-20',
  },
];

export default function FDARegistrationScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const registrations = MOCK_REGISTRATIONS;
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<FDARegistration | null>(null);
  const [activeTab, setActiveTab] = useState<'registrations' | 'requirements' | 'renewal'>('registrations');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      return !searchQuery ||
        reg.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.registrationNumber.includes(searchQuery);
    });
  }, [registrations, searchQuery]);

  const stats = useMemo(() => ({
    total: registrations.length,
    active: registrations.filter(r => r.status === 'active').length,
    pendingRenewal: registrations.filter(r => r.status === 'pending_renewal').length,
    facilities: new Set(registrations.map(r => r.facilityType).flat()).size,
  }), [registrations]);

  const openDetail = useCallback((registration: FDARegistration) => {
    setSelectedRegistration(registration);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openFDAPortal = useCallback(() => {
    Linking.openURL('https://www.fda.gov/food/online-registration-food-facilities');
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
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <Building2 size={28} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>FDA Registration</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Food Facility Registration under 21 CFR Part 1
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Facilities</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pendingRenewal}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Renewal</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{stats.facilities}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Types</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(['registrations', 'requirements', 'renewal'] as const).map(tab => (
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

        {activeTab === 'registrations' && (
          <>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search registrations..."
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

            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Registered Facilities ({filteredRegistrations.length})
              </Text>
              <Pressable
                style={[styles.portalButton, { backgroundColor: '#3B82F6' }]}
                onPress={openFDAPortal}
              >
                <Globe size={16} color="#FFFFFF" />
                <Text style={styles.portalButtonText}>FDA Portal</Text>
                <ExternalLink size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            {filteredRegistrations.map(registration => {
              const statusConfig = STATUS_CONFIG[registration.status];

              return (
                <Pressable
                  key={registration.id}
                  style={({ pressed }) => [
                    styles.registrationCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderLeftWidth: 3,
                      borderLeftColor: statusConfig.color,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => openDetail(registration)}
                >
                  <View style={styles.registrationHeader}>
                    <View style={styles.registrationInfo}>
                      <Text style={[styles.registrationName, { color: colors.text }]}>{registration.facilityName}</Text>
                      <Text style={[styles.registrationNumber, { color: colors.textSecondary }]}>
                        FEI: {registration.feiNumber} | Reg: {registration.registrationNumber}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                    </View>
                  </View>

                  <View style={styles.facilityTypes}>
                    {registration.facilityType.map((type, index) => {
                      const typeConfig = FACILITY_TYPE_CONFIG[type];
                      return (
                        <View key={index} style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
                          <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.registrationMeta}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {registration.city}, {registration.state}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        Renew by: {registration.nextRenewalDate}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
                </Pressable>
              );
            })}
          </>
        )}

        {activeTab === 'requirements' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Registration Requirements</Text>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Building2 size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Who Must Register</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Domestic and foreign facilities that manufacture, process, pack, or hold food for consumption in the U.S.{'\n'}
                • Facilities must register before beginning operations{'\n'}
                • Exemptions: Farms, retail food establishments, restaurants, nonprofit food establishments, fishing vessels
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                  <FileText size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Required Information</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Facility name, address, and contact information{'\n'}
                • Unique Facility Identifier (UFI) / DUNS number{'\n'}
                • Parent company information (if applicable){'\n'}
                • U.S. Agent information (for foreign facilities){'\n'}
                • Emergency contact available 24/7{'\n'}
                • Product categories manufactured/processed
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#10B981' + '20' }]}>
                  <Globe size={20} color="#10B981" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Foreign Facility Requirements</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Must designate a U.S. Agent located in the United States{'\n'}
                • U.S. Agent must be available 24 hours a day, 7 days a week{'\n'}
                • U.S. Agent acts as communications link with FDA{'\n'}
                • Registration required before food is imported to the U.S.
              </Text>
            </View>

            <View style={[styles.alertCard, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' }]}>
              <AlertTriangle size={20} color="#EF4444" />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: '#EF4444' }]}>Failure to Register</Text>
                <Text style={[styles.alertText, { color: colors.text }]}>
                  Food from an unregistered facility is subject to detention and refusal of admission at U.S. ports of entry.
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'renewal' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Biennial Renewal</Text>

            <View style={[styles.renewalCard, { backgroundColor: '#F59E0B' + '15', borderColor: '#F59E0B' }]}>
              <RefreshCw size={24} color="#F59E0B" />
              <View style={styles.renewalInfo}>
                <Text style={[styles.renewalTitle, { color: colors.text }]}>Renewal Period</Text>
                <Text style={[styles.renewalPeriod, { color: '#F59E0B' }]}>
                  October 1 - December 31 of Even-Numbered Years
                </Text>
                <Text style={[styles.renewalNote, { color: colors.textSecondary }]}>
                  Next renewal period: October 1 - December 31, 2026
                </Text>
              </View>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#6366F1' + '20' }]}>
                  <Clock size={20} color="#6366F1" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Renewal Process</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                1. Access FDA&apos;s Unified Registration and Listing System (FURLS){'\n'}
                2. Review and update all registration information{'\n'}
                3. Verify emergency contact information is current{'\n'}
                4. Confirm U.S. Agent information (foreign facilities){'\n'}
                5. Submit renewal before December 31{'\n'}
                6. Retain confirmation for your records
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#EF4444' + '20' }]}>
                  <AlertTriangle size={20} color="#EF4444" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Important Updates</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Registration must be updated within 60 days of any changes{'\n'}
                • Changes include: facility name, address, contact info, product categories{'\n'}
                • Cancellation required when facility ceases operations{'\n'}
                • Annual registration fee may apply (check current requirements)
              </Text>
            </View>

            <Pressable
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={openFDAPortal}
            >
              <Globe size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Access FDA FURLS Portal</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Registration Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedRegistration && (() => {
            const statusConfig = STATUS_CONFIG[selectedRegistration.status];

            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.detailHeader, { backgroundColor: statusConfig.color + '15' }]}>
                  <View style={[styles.detailIcon, { backgroundColor: statusConfig.color + '30' }]}>
                    <Building2 size={28} color={statusConfig.color} />
                  </View>
                  <Text style={[styles.detailName, { color: colors.text }]}>{selectedRegistration.facilityName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.surface, marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Registration Numbers</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>FEI Number</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRegistration.feiNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Registration #</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRegistration.registrationNumber}</Text>
                  </View>
                  {selectedRegistration.dunsBradstreet && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DUNS</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRegistration.dunsBradstreet}</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Facility Types</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.facilityTypes}>
                    {selectedRegistration.facilityType.map((type, index) => {
                      const typeConfig = FACILITY_TYPE_CONFIG[type];
                      return (
                        <View key={index} style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
                          <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Location</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.addressBox}>
                    <MapPin size={16} color={colors.primary} />
                    <Text style={[styles.addressText, { color: colors.text }]}>
                      {selectedRegistration.address}{'\n'}
                      {selectedRegistration.city}, {selectedRegistration.state} {selectedRegistration.zipCode}{'\n'}
                      {selectedRegistration.country}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Emergency Contact</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.contactRow}>
                    <User size={16} color={colors.primary} />
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactName, { color: colors.text }]}>{selectedRegistration.emergencyContact.name}</Text>
                      <Text style={[styles.contactDetail, { color: colors.textSecondary }]}>{selectedRegistration.emergencyContact.phone}</Text>
                      <Text style={[styles.contactDetail, { color: colors.primary }]}>{selectedRegistration.emergencyContact.email}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Renewal Information</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Registration Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRegistration.registrationDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Renewal</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRegistration.lastRenewalDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next Renewal</Text>
                    <Text style={[styles.detailValue, { color: '#F59E0B' }]}>{selectedRegistration.nextRenewalDate}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Product Categories</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {selectedRegistration.productCategories.map((category, index) => (
                    <View key={index} style={styles.categoryItem}>
                      <CheckCircle size={14} color="#10B981" />
                      <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
                    </View>
                  ))}
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
  registrationCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  registrationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  registrationInfo: { flex: 1 },
  registrationName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  registrationNumber: { fontSize: 11 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  facilityTypes: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: { fontSize: 10, fontWeight: '500' as const },
  registrationMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  metaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  metaText: { fontSize: 11 },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
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
    marginTop: 8,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  alertText: { fontSize: 13, lineHeight: 18 },
  renewalCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
  },
  renewalInfo: { flex: 1 },
  renewalTitle: { fontSize: 14, fontWeight: '600' as const },
  renewalPeriod: { fontSize: 16, fontWeight: '700' as const, marginVertical: 4 },
  renewalNote: { fontSize: 12 },
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
  detailName: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  addressBox: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  addressText: { flex: 1, fontSize: 14, lineHeight: 20 },
  contactRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '600' as const },
  contactDetail: { fontSize: 13, marginTop: 2 },
  categoryItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  categoryText: { fontSize: 13 },
});
