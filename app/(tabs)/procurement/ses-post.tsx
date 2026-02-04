import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle,
  FileText,
  DollarSign,
  Calendar,
  Receipt,
  ArrowRight,
  Send,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useServiceRequisitionQuery,
  usePostServiceRequisitionToSES,
} from '@/hooks/useSupabaseProcurementExtended';

export default function SESPostScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{ requisitionId: string }>();

  const { data: requisition, isLoading } = useServiceRequisitionQuery(params.requisitionId);

  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const postToSES = usePostServiceRequisitionToSES({
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'SES Posted',
        `Service Entry Sheet ${data.ses.ses_number} has been created successfully.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePost = () => {
    if (!requisition) return;
    if (!completionDate) {
      Alert.alert('Error', 'Please enter a completion date');
      return;
    }

    const posterName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || 'Unknown';

    Alert.alert(
      'Confirm SES Posting',
      `This will create a Service Entry Sheet for invoice ${requisition.invoice_number || 'N/A'} totaling ${formatCurrency(requisition.invoice_amount)}.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post to SES',
          onPress: () => {
            postToSES.mutate({
              requisitionId: requisition.id,
              postedBy: posterName,
              completionDate,
              notes: notes || undefined,
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Post to SES' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading requisition...</Text>
        </View>
      </View>
    );
  }

  if (!requisition) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Post to SES' }} />
        <View style={styles.errorContainer}>
          <FileText size={40} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Requisition not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (requisition.status !== 'approved') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Post to SES' }} />
        <View style={styles.errorContainer}>
          <Clock size={40} color="#F59E0B" />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Only approved requisitions can be posted to SES
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textTertiary }]}>
            Current status: {requisition.status}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Post to SES' }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.flowBanner, { backgroundColor: '#05966915', borderColor: '#059669' }]}>
          <View style={styles.flowStep}>
            <View style={[styles.flowStepIcon, { backgroundColor: '#10B981' }]}>
              <CheckCircle size={16} color="#fff" />
            </View>
            <Text style={[styles.flowStepText, { color: colors.text }]}>Service PO</Text>
          </View>
          <ArrowRight size={16} color={colors.textSecondary} />
          <View style={styles.flowStep}>
            <View style={[styles.flowStepIcon, { backgroundColor: '#10B981' }]}>
              <CheckCircle size={16} color="#fff" />
            </View>
            <Text style={[styles.flowStepText, { color: colors.text }]}>Invoice Req</Text>
          </View>
          <ArrowRight size={16} color={colors.textSecondary} />
          <View style={styles.flowStep}>
            <View style={[styles.flowStepIcon, { backgroundColor: '#10B981' }]}>
              <CheckCircle size={16} color="#fff" />
            </View>
            <Text style={[styles.flowStepText, { color: colors.text }]}>Approved</Text>
          </View>
          <ArrowRight size={16} color={colors.textSecondary} />
          <View style={styles.flowStep}>
            <View style={[styles.flowStepIcon, { backgroundColor: '#059669' }]}>
              <Send size={16} color="#fff" />
            </View>
            <Text style={[styles.flowStepText, { color: '#059669' }]}>SES</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Receipt size={18} color="#F97316" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Requisition Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requisition #</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.requisition_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Source PO</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.source_po_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vendor</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.vendor_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Service Type</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.service_type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.department_name}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <DollarSign size={18} color="#F97316" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Invoice & Financials</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Invoice #</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.invoice_number || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Invoice Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(requisition.invoice_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>GL Account</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.gl_account || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Cost Center</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{requisition.cost_center || '-'}</Text>
          </View>

          <View style={[styles.amountCard, { backgroundColor: colors.backgroundTertiary }]}>
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Original Estimate</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(requisition.original_estimate)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Invoice Amount</Text>
              <Text style={[styles.amountValue, { color: colors.text, fontWeight: '700' as const }]}>{formatCurrency(requisition.invoice_amount)}</Text>
            </View>
            <View style={[styles.varianceDivider, { backgroundColor: colors.border }]} />
            <View style={styles.amountRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {requisition.variance > 0 ? (
                  <TrendingUp size={14} color="#EF4444" />
                ) : requisition.variance < 0 ? (
                  <TrendingDown size={14} color="#10B981" />
                ) : null}
                <Text style={[styles.amountLabel, { 
                  color: requisition.variance > 0 ? '#EF4444' : requisition.variance < 0 ? '#10B981' : colors.textSecondary 
                }]}>
                  Variance
                </Text>
              </View>
              <Text style={[styles.amountValue, { 
                color: requisition.variance > 0 ? '#EF4444' : requisition.variance < 0 ? '#10B981' : colors.text 
              }]}>
                {requisition.variance > 0 ? '+' : ''}{formatCurrency(requisition.variance)} ({requisition.variance_percent.toFixed(1)}%)
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={18} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Approvals</Text>
          </View>

          {requisition.tier2_approved_by && (
            <View style={styles.approvalRow}>
              <View style={[styles.tierBadge, { backgroundColor: '#F59E0B15' }]}>
                <Text style={[styles.tierBadgeText, { color: '#F59E0B' }]}>Tier 2</Text>
              </View>
              <View style={styles.approvalInfo}>
                <Text style={[styles.approvalName, { color: colors.text }]}>{requisition.tier2_approved_by}</Text>
                <Text style={[styles.approvalDate, { color: colors.textSecondary }]}>{formatDate(requisition.tier2_approved_at)}</Text>
              </View>
              <CheckCircle size={18} color="#10B981" />
            </View>
          )}

          {requisition.tier3_approved_by && (
            <View style={[styles.approvalRow, { marginTop: 10 }]}>
              <View style={[styles.tierBadge, { backgroundColor: '#8B5CF615' }]}>
                <Text style={[styles.tierBadgeText, { color: '#8B5CF6' }]}>Tier 3</Text>
              </View>
              <View style={styles.approvalInfo}>
                <Text style={[styles.approvalName, { color: colors.text }]}>{requisition.tier3_approved_by}</Text>
                <Text style={[styles.approvalDate, { color: colors.textSecondary }]}>{formatDate(requisition.tier3_approved_at)}</Text>
              </View>
              <CheckCircle size={18} color="#10B981" />
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#F97316" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>SES Details</Text>
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Completion Date *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={completionDate}
              onChangeText={setCompletionDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#059669', opacity: postToSES.isPending ? 0.7 : 1 }]}
            onPress={handlePost}
            disabled={postToSES.isPending}
          >
            {postToSES.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Send size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Post to SES</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  flowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  flowStep: {
    alignItems: 'center',
    gap: 6,
  },
  flowStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowStepText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 12,
  },
  amountCard: {
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  amountLabel: {
    fontSize: 13,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  varianceDivider: {
    height: 1,
    marginVertical: 8,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  approvalDate: {
    fontSize: 12,
    marginTop: 2,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
