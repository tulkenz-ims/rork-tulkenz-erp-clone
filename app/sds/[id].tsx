import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
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
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { formatDate } from '@/constants/documentsConstants';
import { INVENTORY_DEPARTMENTS } from '@/constants/inventoryDepartmentCodes';
import { getStatusColor, getStatusLabel, type Document } from '@/types/documents';
import { useSupabaseDocuments } from '@/hooks/useSupabaseDocuments';

export default function PublicSDSViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents } = useSupabaseDocuments();

  const document = useMemo(() => {
    return documents.find((doc: Document) => doc.id === id);
  }, [documents, id]);

  const department = useMemo(() => {
    if (!document) return null;
    return INVENTORY_DEPARTMENTS[document.departmentId];
  }, [document]);

  const handleViewPDF = () => {
    if (document?.fileUrl) {
      Linking.openURL(document.fileUrl);
    }
  };

  const handleDownload = () => {
    if (document?.fileUrl) {
      Linking.openURL(document.fileUrl);
    }
  };

  if (!document) {
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
            <Text style={styles.errorId}>Document ID: {id}</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const statusColor = getStatusColor(document.status);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View style={styles.logoSection}>
              <View style={styles.companyBadge}>
                <Shield size={20} color="#0066CC" />
                <Text style={styles.companyName}>TulKenz OPS</Text>
              </View>
              <Text style={styles.headerLabel}>SAFETY DATA SHEET</Text>
            </View>
          </View>

          <View style={styles.sdsCard}>
            <View style={styles.sdsIconRow}>
              <View style={styles.sdsIcon}>
                <AlertTriangle size={32} color="#EF4444" />
              </View>
              <View style={styles.sdsTitleSection}>
                <Text style={styles.chemicalName}>
                  {document.linkedChemicalName || document.title}
                </Text>
                <View style={styles.materialRow}>
                  <Hash size={14} color="#666" />
                  <Text style={styles.materialNumber}>
                    Material # {document.linkedMaterialNumber || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusLabel(document.status)}
                </Text>
              </View>
              {department && (
                <View style={[styles.deptBadge, { backgroundColor: department.color + '20' }]}>
                  <Building2 size={12} color={department.color} />
                  <Text style={[styles.deptText, { color: department.color }]}>
                    {department.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.documentSection}>
            <Text style={styles.sectionTitle}>Document Information</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <FileText size={16} color="#666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Document Title</Text>
                  <Text style={styles.detailValue}>{document.title}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Hash size={16} color="#666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Version</Text>
                  <Text style={styles.detailValue}>{document.version}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Calendar size={16} color="#666" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Effective Date</Text>
                  <Text style={styles.detailValue}>{formatDate(document.effectiveDate)}</Text>
                </View>
              </View>

              {document.expirationDate && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Clock size={16} color="#666" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Expiration Date</Text>
                      <Text style={styles.detailValue}>{formatDate(document.expirationDate)}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {document.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{document.description}</Text>
              </View>
            </View>
          )}

          <View style={styles.actionsSection}>
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
              onPress={handleDownload}
            >
              <Download size={20} color="#0066CC" />
              <Text style={styles.secondaryButtonText}>Download PDF</Text>
            </Pressable>
          </View>

          <View style={styles.complianceNote}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={styles.complianceText}>
              This Safety Data Sheet is provided for informational purposes. 
              Always refer to the most current version and follow all safety 
              guidelines when handling this material.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last Updated: {formatDate(document.updatedAt)}
            </Text>
            <Text style={styles.footerText}>
              Uploaded by: {document.uploadedBy}
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
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0066CC',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
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
  statusRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
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
    marginBottom: 20,
  },
  errorId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});
