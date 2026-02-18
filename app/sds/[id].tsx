import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  AlertTriangle,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  Hash,
  Shield,
  Clock,
  Phone,
  Beaker,
  ShieldAlert,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Department prefix mapping for QR labels
const DEPARTMENT_PREFIXES: Record<string, string> = {
  maintenance: 'MAINT',
  sanitation: 'SANI',
  production: 'PROD',
  quality: 'QUAL',
  warehouse: 'WHSE',
  cold_storage: 'COLD',
  refrigeration: 'REFRIG',
  receiving: 'RECV',
  safety: 'SAFE',
  general: 'GEN',
};

const ALLERGEN_LABELS: Record<string, { label: string; color: string }> = {
  peanut: { label: 'Peanut', color: '#DC2626' },
  tree_nut: { label: 'Tree Nut', color: '#DC2626' },
  milk: { label: 'Milk/Dairy', color: '#2563EB' },
  egg: { label: 'Egg', color: '#F59E0B' },
  wheat: { label: 'Wheat/Gluten', color: '#D97706' },
  soy: { label: 'Soy', color: '#65A30D' },
  fish: { label: 'Fish', color: '#0891B2' },
  shellfish: { label: 'Shellfish', color: '#0E7490' },
  sesame: { label: 'Sesame', color: '#A16207' },
  coconut: { label: 'Coconut', color: '#15803D' },
  corn: { label: 'Corn', color: '#CA8A04' },
  sulfites: { label: 'Sulfites', color: '#7C3AED' },
  latex: { label: 'Latex', color: '#BE185D' },
  other: { label: 'Other', color: '#6B7280' },
};

// Format date helper (inline so no dependency issues)
const formatDate = (date: string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date;
  }
};

export default function PublicSDSViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sdsRecord, setSdsRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch directly by ID — no auth or org context required
  // RLS policy allows anon SELECT for OSHA compliance
  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError('No SDS ID provided');
      return;
    }

    const fetchSDS = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('sds_records')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Public SDS fetch error:', fetchError);
          setError(fetchError.message);
          setSdsRecord(null);
        } else {
          setSdsRecord(data);
        }
      } catch (err: any) {
        console.error('Public SDS error:', err);
        setError(err.message || 'Failed to load SDS');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSDS();
  }, [id]);

  const handleViewPDF = () => {
    if (sdsRecord?.file_url) {
      Linking.openURL(sdsRecord.file_url);
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading Safety Data Sheet...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error || !sdsRecord) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <AlertTriangle size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>SDS Not Found</Text>
            <Text style={styles.errorText}>
              The requested Safety Data Sheet could not be found.
            </Text>
            {error && <Text style={styles.errorDetail}>{error}</Text>}
            <Text style={styles.errorId}>ID: {id}</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#10B981';
      case 'expired': return '#EF4444';
      case 'superseded': return '#F59E0B';
      case 'archived': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'superseded': return 'Superseded';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  const getSignalWordColor = (word: string | null): string => {
    switch (word) {
      case 'danger': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const statusColor = getStatusColor(sdsRecord.status || 'active');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoSection}>
              <View style={styles.companyBadge}>
                <Shield size={20} color="#EF4444" />
                <Text style={styles.headerLabel}>SAFETY DATA SHEET</Text>
              </View>
            </View>
          </View>

          {/* Product Card */}
          <View style={styles.sdsCard}>
            <View style={styles.sdsIconRow}>
              <View style={styles.sdsIcon}>
                <AlertTriangle size={32} color="#EF4444" />
              </View>
              <View style={styles.sdsTitleSection}>
                <Text style={styles.chemicalName}>
                  {sdsRecord.product_name}
                </Text>
                {sdsRecord.sds_number && (
                  <View style={styles.materialRow}>
                    <Hash size={14} color="#666" />
                    <Text style={styles.materialNumber}>
                      SDS # {sdsRecord.sds_number}
                    </Text>
                  </View>
                )}
                {sdsRecord.sds_master_number && (
                  <Text style={styles.masterNumber}>
                    {DEPARTMENT_PREFIXES[sdsRecord.primary_department] || 'SDS'} #{sdsRecord.sds_master_number}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(sdsRecord.status || 'active')}
                </Text>
              </View>
              {sdsRecord.signal_word && sdsRecord.signal_word !== 'none' && (
                <View style={[styles.statusBadge, { backgroundColor: getSignalWordColor(sdsRecord.signal_word) + '20' }]}>
                  <ShieldAlert size={12} color={getSignalWordColor(sdsRecord.signal_word)} />
                  <Text style={[styles.statusText, { color: getSignalWordColor(sdsRecord.signal_word) }]}>
                    {sdsRecord.signal_word.toUpperCase()}
                  </Text>
                </View>
              )}
              {sdsRecord.physical_state && (
                <View style={[styles.deptBadge, { backgroundColor: '#6366F1' + '20' }]}>
                  <Beaker size={12} color="#6366F1" />
                  <Text style={[styles.deptText, { color: '#6366F1' }]}>
                    {sdsRecord.physical_state}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Product Info */}
          <View style={styles.documentSection}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Building2 size={16} color="#666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Manufacturer</Text>
                  <Text style={styles.detailValue}>{sdsRecord.manufacturer || 'N/A'}</Text>
                </View>
              </View>

              {sdsRecord.emergency_phone && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Phone size={16} color="#EF4444" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Emergency Phone</Text>
                      <Pressable onPress={() => Linking.openURL(`tel:${sdsRecord.emergency_phone}`)}>
                        <Text style={[styles.detailValue, { color: '#EF4444', textDecorationLine: 'underline' }]}>
                          {sdsRecord.emergency_phone}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}

              {sdsRecord.cas_number && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Hash size={16} color="#666" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>CAS Number</Text>
                      <Text style={styles.detailValue}>{sdsRecord.cas_number}</Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <FileText size={16} color="#666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Version</Text>
                  <Text style={styles.detailValue}>{sdsRecord.version || '1.0'}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Calendar size={16} color="#666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Issue Date</Text>
                  <Text style={styles.detailValue}>{formatDate(sdsRecord.issue_date)}</Text>
                </View>
              </View>

              {sdsRecord.expiration_date && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Clock size={16} color="#666" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Expiration Date</Text>
                      <Text style={styles.detailValue}>{formatDate(sdsRecord.expiration_date)}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Hazard Statements */}
          {(sdsRecord.hazard_class && sdsRecord.hazard_class.length > 0) && (
            <View style={styles.documentSection}>
              <Text style={styles.sectionTitle}>Hazard Classification</Text>
              <View style={styles.detailsCard}>
                <View style={styles.hazardChips}>
                  {sdsRecord.hazard_class.map((hazard: string, index: number) => (
                    <View key={index} style={styles.hazardChip}>
                      <AlertTriangle size={12} color="#EF4444" />
                      <Text style={styles.hazardChipText}>{hazard}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Allergen Information */}
          <View style={styles.documentSection}>
            <Text style={styles.sectionTitle}>Allergen Status</Text>
            {sdsRecord.contains_allergens ? (
              <View style={[styles.detailsCard, { borderWidth: 2, borderColor: '#DC262640' }]}>
                <View style={styles.allergenHeader}>
                  <AlertTriangle size={20} color="#DC2626" />
                  <Text style={styles.allergenTitle}>CONTAINS KNOWN ALLERGENS</Text>
                </View>
                <View style={styles.allergenChipRow}>
                  {(sdsRecord.allergens || []).map((a: string, idx: number) => {
                    const info = ALLERGEN_LABELS[a];
                    return info ? (
                      <View key={idx} style={[styles.allergenChipPublic, { backgroundColor: info.color + '15', borderColor: info.color + '30' }]}>
                        <Text style={[styles.allergenChipPublicText, { color: info.color }]}>{info.label}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
                {sdsRecord.allergen_notes && (
                  <Text style={styles.allergenNotes}>{sdsRecord.allergen_notes}</Text>
                )}
              </View>
            ) : (
              <View style={[styles.detailsCard, { borderWidth: 1, borderColor: '#10B98130' }]}>
                <View style={styles.allergenHeader}>
                  <Shield size={20} color="#10B981" />
                  <Text style={[styles.allergenTitle, { color: '#10B981' }]}>No Known Allergens</Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            {sdsRecord.file_url ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={handleViewPDF}
                >
                  <ExternalLink size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>View Full SDS Document</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={handleViewPDF}
                >
                  <Download size={20} color="#0066CC" />
                  <Text style={styles.secondaryButtonText}>Download PDF</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.noPdfNotice}>
                <FileText size={20} color="#F59E0B" />
                <Text style={styles.noPdfText}>
                  No PDF attached yet. Contact your facility safety manager for the full SDS document.
                </Text>
              </View>
            )}
          </View>

          {/* Compliance Note */}
          <View style={styles.complianceNote}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={styles.complianceText}>
              This Safety Data Sheet is provided for informational purposes.
              Always refer to the most current version and follow all safety
              guidelines when handling this material.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last Updated: {formatDate(sdsRecord.updated_at)}
            </Text>
            <Text style={styles.footerText}>
              Version: {sdsRecord.version || '1.0'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  logoSection: {
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  companyBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#EF4444',
    letterSpacing: 2,
  },
  sdsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EF4444' + '30',
  },
  sdsIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    marginBottom: 16,
  },
  sdsIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EF4444' + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sdsTitleSection: {
    flex: 1,
  },
  chemicalName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    marginBottom: 4,
  },
  materialRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  materialNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500' as const,
  },
  masterNumber: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    alignItems: 'center' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  deptBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  deptText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  documentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500' as const,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 14,
  },
  hazardChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    padding: 14,
  },
  hazardChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  hazardChipText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500' as const,
  },
  allergenHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 14,
  },
  allergenTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  allergenChipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  allergenChipPublic: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  allergenChipPublicText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  allergenNotes: {
    fontSize: 12,
    color: '#92400E',
    paddingHorizontal: 14,
    paddingBottom: 14,
    fontStyle: 'italic' as const,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  secondaryButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  noPdfNotice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noPdfText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  complianceNote: {
    flexDirection: 'row' as const,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    alignItems: 'flex-start' as const,
  },
  complianceText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center' as const,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  errorId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});
