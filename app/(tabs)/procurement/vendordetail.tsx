import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  FileText,
  Plus,
  X,
  Calendar,
  DollarSign,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Package,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useProcurementVendorById,
  useVendorDocumentsQuery,
  useCreateVendorDocument,
  useDeleteVendorDocument,
  useVendorRatingsQuery,
  useCreateVendorRating,
  useVendorAverageRating,
  useVendorOrderHistory,
} from '@/hooks/useSupabaseProcurement';
import {
  VendorDocumentType,
  VendorDocumentStatus,
  VENDOR_DOCUMENT_TYPE_LABELS,
  VENDOR_DOCUMENT_STATUS_LABELS,
  VENDOR_DOCUMENT_STATUS_COLORS,
  PAYMENT_TERMS_LABELS,
  PaymentTerms,
} from '@/types/procurement';
import DatePickerModal from '@/components/DatePickerModal';

type TabType = 'overview' | 'contracts' | 'warranties' | 'guarantees' | 'ratings';

interface DocumentFormData {
  title: string;
  description: string;
  document_number: string;
  start_date: string;
  expiration_date: string;
  value: string;
  terms: string;
  notes: string;
}

const INITIAL_DOCUMENT_FORM: DocumentFormData = {
  title: '',
  description: '',
  document_number: '',
  start_date: new Date().toISOString().split('T')[0],
  expiration_date: '',
  value: '',
  terms: '',
  notes: '',
};

interface RatingFormData {
  quality_score: number;
  delivery_score: number;
  price_score: number;
  service_score: number;
  comments: string;
}

const INITIAL_RATING_FORM: RatingFormData = {
  quality_score: 3,
  delivery_score: 3,
  price_score: 3,
  service_score: 3,
  comments: '',
};

export default function VendorDetailScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentFormData>(INITIAL_DOCUMENT_FORM);
  const [ratingForm, setRatingForm] = useState<RatingFormData>(INITIAL_RATING_FORM);
  const [documentType, setDocumentType] = useState<VendorDocumentType>('contract');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);

  const vendorQuery = useProcurementVendorById(vendorId);
  const contractsQuery = useVendorDocumentsQuery(vendorId, 'contract');
  const warrantiesQuery = useVendorDocumentsQuery(vendorId, 'warranty');
  const guaranteesQuery = useVendorDocumentsQuery(vendorId, 'guarantee');
  const ratingsQuery = useVendorRatingsQuery(vendorId);
  const averageRatingQuery = useVendorAverageRating(vendorId);
  const orderHistoryQuery = useVendorOrderHistory(vendorId);

  const createDocumentMutation = useCreateVendorDocument({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDocumentModalVisible(false);
      setDocumentForm(INITIAL_DOCUMENT_FORM);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to create document: ${error.message}`);
    },
  });

  const deleteDocumentMutation = useDeleteVendorDocument({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to delete document: ${error.message}`);
    },
  });

  const createRatingMutation = useCreateVendorRating({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRatingModalVisible(false);
      setRatingForm(INITIAL_RATING_FORM);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to create rating: ${error.message}`);
    },
  });

  const vendor = vendorQuery.data;
  const contracts = contractsQuery.data || [];
  const warranties = warrantiesQuery.data || [];
  const guarantees = guaranteesQuery.data || [];
  const ratings = ratingsQuery.data || [];
  const averageRating = averageRatingQuery.averageRating;
  const orderHistory = orderHistoryQuery.data;

  const isLoading = vendorQuery.isLoading;
  const refreshing = vendorQuery.isFetching;

  const onRefresh = useCallback(() => {
    vendorQuery.refetch();
    contractsQuery.refetch();
    warrantiesQuery.refetch();
    guaranteesQuery.refetch();
    ratingsQuery.refetch();
    orderHistoryQuery.refetch();
  }, [vendorQuery, contractsQuery, warrantiesQuery, guaranteesQuery, ratingsQuery, orderHistoryQuery]);

  const handleAddDocument = (type: VendorDocumentType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDocumentType(type);
    setDocumentForm(INITIAL_DOCUMENT_FORM);
    setDocumentModalVisible(true);
  };

  const handleSaveDocument = () => {
    if (!documentForm.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!vendorId) return;

    createDocumentMutation.mutate({
      vendor_id: vendorId,
      document_type: documentType,
      title: documentForm.title.trim(),
      description: documentForm.description.trim() || undefined,
      document_number: documentForm.document_number.trim() || undefined,
      start_date: documentForm.start_date,
      expiration_date: documentForm.expiration_date || undefined,
      value: documentForm.value ? parseFloat(documentForm.value) : undefined,
      terms: documentForm.terms.trim() || undefined,
      status: 'active' as VendorDocumentStatus,
      notes: documentForm.notes.trim() || undefined,
      created_by: user?.first_name + ' ' + user?.last_name || 'System',
    });
  };

  const handleDeleteDocument = (documentId: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDocumentMutation.mutate(documentId),
        },
      ]
    );
  };

  const handleAddRating = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRatingForm(INITIAL_RATING_FORM);
    setRatingModalVisible(true);
  };

  const handleSaveRating = () => {
    if (!vendorId) return;

    const overallScore = (ratingForm.quality_score + ratingForm.delivery_score + ratingForm.price_score + ratingForm.service_score) / 4;

    createRatingMutation.mutate({
      vendor_id: vendorId,
      rating_period: new Date().toISOString().slice(0, 7),
      quality_score: ratingForm.quality_score,
      delivery_score: ratingForm.delivery_score,
      price_score: ratingForm.price_score,
      service_score: ratingForm.service_score,
      overall_score: overallScore,
      comments: ratingForm.comments.trim() || undefined,
      rated_by: user?.id || '',
      rated_by_name: user?.first_name + ' ' + user?.last_name || 'System',
    });
  };

  const getDocumentStatusColor = (status: VendorDocumentStatus) => {
    return VENDOR_DOCUMENT_STATUS_COLORS[status] || colors.textSecondary;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (score: number, size: number = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= score ? '#F59E0B' : colors.border}
            fill={star <= score ? '#F59E0B' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const renderRatingSelector = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => (
    <View style={styles.ratingSelector}>
      <Text style={[styles.ratingSelectorLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.ratingStarsSelector}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(star);
            }}
          >
            <Star
              size={28}
              color={star <= value ? '#F59E0B' : colors.border}
              fill={star <= value ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTab = (tab: TabType, label: string, count?: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tab,
          {
            backgroundColor: isActive ? colors.primary : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveTab(tab);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            { color: isActive ? '#fff' : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View
            style={[
              styles.tabBadge,
              { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${colors.primary}20` },
            ]}
          >
            <Text style={[styles.tabBadgeText, { color: isActive ? '#fff' : colors.primary }]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOverviewTab = () => {
    if (!vendor) return null;

    const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zip_code]
      .filter(Boolean)
      .join(', ');

    return (
      <View style={styles.tabContent}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.vendorIcon, { backgroundColor: '#3B82F615' }]}>
              <Building2 size={24} color="#3B82F6" />
            </View>
            <View style={styles.vendorHeaderInfo}>
              <Text style={[styles.vendorName, { color: colors.text }]}>{vendor.name}</Text>
              {vendor.vendor_code && (
                <Text style={[styles.vendorCode, { color: colors.textSecondary }]}>
                  Code: {vendor.vendor_code}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: vendor.active ? '#10B98115' : '#EF444415' },
              ]}
            >
              {vendor.active ? (
                <CheckCircle size={14} color="#10B981" />
              ) : (
                <AlertCircle size={14} color="#EF4444" />
              )}
              <Text
                style={[styles.statusText, { color: vendor.active ? '#10B981' : '#EF4444' }]}
              >
                {vendor.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.contactSection}>
            {vendor.contact_name && (
              <View style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Building2 size={14} color={colors.primary} />
                </View>
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {vendor.contact_name}
                </Text>
              </View>
            )}
            {vendor.phone && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
              >
                <View style={[styles.contactIcon, { backgroundColor: '#10B98115' }]}>
                  <Phone size={14} color="#10B981" />
                </View>
                <Text style={[styles.contactText, { color: colors.primary }]}>
                  {vendor.phone}
                </Text>
              </TouchableOpacity>
            )}
            {vendor.email && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`mailto:${vendor.email}`)}
              >
                <View style={[styles.contactIcon, { backgroundColor: '#3B82F615' }]}>
                  <Mail size={14} color="#3B82F6" />
                </View>
                <Text style={[styles.contactText, { color: colors.primary }]}>
                  {vendor.email}
                </Text>
              </TouchableOpacity>
            )}
            {fullAddress && (
              <View style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: '#F59E0B15' }]}>
                  <MapPin size={14} color="#F59E0B" />
                </View>
                <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                  {fullAddress}
                </Text>
              </View>
            )}
          </View>

          {vendor.payment_terms && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Payment Terms
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {PAYMENT_TERMS_LABELS[vendor.payment_terms as PaymentTerms] || vendor.payment_terms}
                </Text>
              </View>
            </>
          )}
        </View>

        {averageRating && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Vendor Rating</Text>
            <View style={styles.ratingOverview}>
              <View style={styles.overallRating}>
                <Text style={[styles.overallScore, { color: colors.text }]}>
                  {averageRating.overall.toFixed(1)}
                </Text>
                {renderStars(Math.round(averageRating.overall), 20)}
                <Text style={[styles.totalRatings, { color: colors.textSecondary }]}>
                  {averageRating.totalRatings} rating{averageRating.totalRatings !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.ratingBreakdown}>
                <View style={styles.ratingItem}>
                  <Text style={[styles.ratingItemLabel, { color: colors.textSecondary }]}>Quality</Text>
                  <Text style={[styles.ratingItemScore, { color: colors.text }]}>
                    {averageRating.quality.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Text style={[styles.ratingItemLabel, { color: colors.textSecondary }]}>Delivery</Text>
                  <Text style={[styles.ratingItemScore, { color: colors.text }]}>
                    {averageRating.delivery.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Text style={[styles.ratingItemLabel, { color: colors.textSecondary }]}>Price</Text>
                  <Text style={[styles.ratingItemScore, { color: colors.text }]}>
                    {averageRating.price.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Text style={[styles.ratingItemLabel, { color: colors.textSecondary }]}>Service</Text>
                  <Text style={[styles.ratingItemScore, { color: colors.text }]}>
                    {averageRating.service.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {orderHistory?.stats && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Order History</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: `${colors.primary}10` }]}>
                <Package size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {orderHistory.stats.totalOrders}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Orders</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#10B98110' }]}>
                <TrendingUp size={20} color="#10B981" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatCurrency(orderHistory.stats.totalSpend)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spend</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#F59E0B10' }]}>
                <Clock size={20} color="#F59E0B" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {orderHistory.stats.openOrders}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open Orders</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDocumentCard = (doc: any) => {
    const isExpired = doc.expiration_date && new Date(doc.expiration_date) < new Date();
    const status = isExpired ? 'expired' : (doc.status || 'active');

    return (
      <View
        key={doc.id}
        style={[styles.documentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.documentHeader}>
          <View style={styles.documentTitleRow}>
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.documentTitle, { color: colors.text }]} numberOfLines={1}>
              {doc.title}
            </Text>
          </View>
          <View
            style={[
              styles.documentStatus,
              { backgroundColor: `${getDocumentStatusColor(status)}15` },
            ]}
          >
            <Text style={[styles.documentStatusText, { color: getDocumentStatusColor(status) }]}>
              {VENDOR_DOCUMENT_STATUS_LABELS[status as VendorDocumentStatus] || status}
            </Text>
          </View>
        </View>

        {doc.document_number && (
          <Text style={[styles.documentNumber, { color: colors.textSecondary }]}>
            #{doc.document_number}
          </Text>
        )}

        <View style={styles.documentDetails}>
          {doc.start_date && (
            <View style={styles.documentDetailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.documentDetailText, { color: colors.textSecondary }]}>
                Start: {formatDate(doc.start_date)}
              </Text>
            </View>
          )}
          {doc.expiration_date && (
            <View style={styles.documentDetailRow}>
              <Clock size={14} color={isExpired ? '#EF4444' : colors.textSecondary} />
              <Text
                style={[
                  styles.documentDetailText,
                  { color: isExpired ? '#EF4444' : colors.textSecondary },
                ]}
              >
                Expires: {formatDate(doc.expiration_date)}
              </Text>
            </View>
          )}
          {doc.value && (
            <View style={styles.documentDetailRow}>
              <DollarSign size={14} color={colors.textSecondary} />
              <Text style={[styles.documentDetailText, { color: colors.textSecondary }]}>
                Value: {formatCurrency(doc.value)}
              </Text>
            </View>
          )}
        </View>

        {doc.description && (
          <Text style={[styles.documentDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {doc.description}
          </Text>
        )}

        <View style={[styles.documentActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.documentAction, { backgroundColor: '#EF444415' }]}
            onPress={() => handleDeleteDocument(doc.id, doc.title)}
            disabled={deleteDocumentMutation.isPending}
          >
            <Trash2 size={14} color="#EF4444" />
            <Text style={[styles.documentActionText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDocumentsTab = (documents: any[], type: VendorDocumentType) => {
    const typeLabels: Record<VendorDocumentType, string> = {
      contract: 'Contract',
      warranty: 'Warranty',
      guarantee: 'Guarantee',
      certificate: 'Certificate',
      insurance: 'Insurance',
      other: 'Document',
    };

    return (
      <View style={styles.tabContent}>
        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No {typeLabels[type]}s Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add a {typeLabels[type].toLowerCase()} to track vendor agreements
            </Text>
          </View>
        ) : (
          documents.map(renderDocumentCard)
        )}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => handleAddDocument(type)}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add {typeLabels[type]}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRatingsTab = () => (
    <View style={styles.tabContent}>
      {ratings.length === 0 ? (
        <View style={styles.emptyState}>
          <Star size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Ratings Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add a rating to track vendor performance
          </Text>
        </View>
      ) : (
        ratings.map((rating) => (
          <View
            key={rating.id}
            style={[styles.ratingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.ratingCardHeader}>
              <View>
                <Text style={[styles.ratingPeriod, { color: colors.text }]}>
                  {new Date(rating.rating_period + '-01').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </Text>
                <Text style={[styles.ratingBy, { color: colors.textSecondary }]}>
                  By {rating.rated_by_name}
                </Text>
              </View>
              <View style={styles.ratingOverallBadge}>
                <Text style={[styles.ratingOverallScore, { color: colors.text }]}>
                  {rating.overall_score.toFixed(1)}
                </Text>
                {renderStars(Math.round(rating.overall_score))}
              </View>
            </View>

            <View style={styles.ratingScores}>
              <View style={styles.ratingScoreItem}>
                <Text style={[styles.ratingScoreLabel, { color: colors.textSecondary }]}>Quality</Text>
                <Text style={[styles.ratingScoreValue, { color: colors.text }]}>{rating.quality_score}</Text>
              </View>
              <View style={styles.ratingScoreItem}>
                <Text style={[styles.ratingScoreLabel, { color: colors.textSecondary }]}>Delivery</Text>
                <Text style={[styles.ratingScoreValue, { color: colors.text }]}>{rating.delivery_score}</Text>
              </View>
              <View style={styles.ratingScoreItem}>
                <Text style={[styles.ratingScoreLabel, { color: colors.textSecondary }]}>Price</Text>
                <Text style={[styles.ratingScoreValue, { color: colors.text }]}>{rating.price_score}</Text>
              </View>
              <View style={styles.ratingScoreItem}>
                <Text style={[styles.ratingScoreLabel, { color: colors.textSecondary }]}>Service</Text>
                <Text style={[styles.ratingScoreValue, { color: colors.text }]}>{rating.service_score}</Text>
              </View>
            </View>

            {rating.comments && (
              <Text style={[styles.ratingComments, { color: colors.textSecondary }]}>
                &quot;{rating.comments}&quot;
              </Text>
            )}
          </View>
        ))
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={handleAddRating}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Rating</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Vendor Details' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading vendor...</Text>
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Vendor Details' }} />
        <Building2 size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Vendor Not Found</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: vendor.name || 'Vendor Details' }} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsContainer, { backgroundColor: colors.surface }]}
        contentContainerStyle={styles.tabsContent}
      >
        {renderTab('overview', 'Overview')}
        {renderTab('contracts', 'Contracts', contracts.length)}
        {renderTab('warranties', 'Warranties', warranties.length)}
        {renderTab('guarantees', 'Guarantees', guarantees.length)}
        {renderTab('ratings', 'Ratings', ratings.length)}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'contracts' && renderDocumentsTab(contracts, 'contract')}
        {activeTab === 'warranties' && renderDocumentsTab(warranties, 'warranty')}
        {activeTab === 'guarantees' && renderDocumentsTab(guarantees, 'guarantee')}
        {activeTab === 'ratings' && renderRatingsTab()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={documentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDocumentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setDocumentModalVisible(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add {VENDOR_DOCUMENT_TYPE_LABELS[documentType]}
            </Text>
            <TouchableOpacity
              onPress={handleSaveDocument}
              disabled={createDocumentMutation.isPending}
            >
              {createDocumentMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder={`${VENDOR_DOCUMENT_TYPE_LABELS[documentType]} title`}
                placeholderTextColor={colors.textSecondary}
                value={documentForm.title}
                onChangeText={(text) => setDocumentForm((prev) => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Document Number</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., CNT-2024-001"
                placeholderTextColor={colors.textSecondary}
                value={documentForm.document_number}
                onChangeText={(text) => setDocumentForm((prev) => ({ ...prev, document_number: text }))}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.formInput, styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={{ color: colors.text }}>
                    {documentForm.start_date ? formatDate(documentForm.start_date) : 'Select date'}
                  </Text>
                  <Calendar size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Expiration Date</Text>
                <TouchableOpacity
                  style={[styles.formInput, styles.dateInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowExpirationDatePicker(true)}
                >
                  <Text style={{ color: documentForm.expiration_date ? colors.text : colors.textSecondary }}>
                    {documentForm.expiration_date ? formatDate(documentForm.expiration_date) : 'Select date'}
                  </Text>
                  <Calendar size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Value ($)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={documentForm.value}
                onChangeText={(text) => setDocumentForm((prev) => ({ ...prev, value: text }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter description..."
                placeholderTextColor={colors.textSecondary}
                value={documentForm.description}
                onChangeText={(text) => setDocumentForm((prev) => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Terms & Conditions</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter key terms..."
                placeholderTextColor={colors.textSecondary}
                value={documentForm.terms}
                onChangeText={(text) => setDocumentForm((prev) => ({ ...prev, terms: text }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textSecondary}
                value={documentForm.notes}
                onChangeText={(text) => setDocumentForm((prev) => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Rating</Text>
            <TouchableOpacity
              onPress={handleSaveRating}
              disabled={createRatingMutation.isPending}
            >
              {createRatingMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.ratingFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderRatingSelector('Quality', ratingForm.quality_score, (val) =>
                setRatingForm((prev) => ({ ...prev, quality_score: val }))
              )}
              {renderRatingSelector('Delivery', ratingForm.delivery_score, (val) =>
                setRatingForm((prev) => ({ ...prev, delivery_score: val }))
              )}
              {renderRatingSelector('Price', ratingForm.price_score, (val) =>
                setRatingForm((prev) => ({ ...prev, price_score: val }))
              )}
              {renderRatingSelector('Service', ratingForm.service_score, (val) =>
                setRatingForm((prev) => ({ ...prev, service_score: val }))
              )}
            </View>

            <View style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Comments</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Add your comments about this vendor..."
                placeholderTextColor={colors.textSecondary}
                value={ratingForm.comments}
                onChangeText={(text) => setRatingForm((prev) => ({ ...prev, comments: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={(date) => {
          setDocumentForm((prev) => ({ ...prev, start_date: date.toISOString().split('T')[0] }));
          setShowStartDatePicker(false);
        }}
        selectedDate={documentForm.start_date ? new Date(documentForm.start_date) : new Date()}
        title="Select Start Date"
      />

      <DatePickerModal
        visible={showExpirationDatePicker}
        onClose={() => setShowExpirationDatePicker(false)}
        onSelect={(date) => {
          setDocumentForm((prev) => ({ ...prev, expiration_date: date.toISOString().split('T')[0] }));
          setShowExpirationDatePicker(false);
        }}
        selectedDate={documentForm.expiration_date ? new Date(documentForm.expiration_date) : new Date()}
        title="Select Expiration Date"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tabsContainer: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vendorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vendorHeaderInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  vendorCode: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  contactSection: {
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  ratingOverview: {
    flexDirection: 'row',
    gap: 20,
  },
  overallRating: {
    alignItems: 'center',
  },
  overallScore: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  totalRatings: {
    fontSize: 12,
    marginTop: 4,
  },
  ratingBreakdown: {
    flex: 1,
    gap: 8,
  },
  ratingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingItemLabel: {
    fontSize: 13,
  },
  ratingItemScore: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  documentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 10,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  documentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  documentStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  documentNumber: {
    fontSize: 12,
    marginBottom: 10,
  },
  documentDetails: {
    gap: 6,
    marginBottom: 10,
  },
  documentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  documentDetailText: {
    fontSize: 13,
  },
  documentDescription: {
    fontSize: 13,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  documentActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  documentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  documentActionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  ratingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ratingPeriod: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  ratingBy: {
    fontSize: 12,
    marginTop: 2,
  },
  ratingOverallBadge: {
    alignItems: 'flex-end',
  },
  ratingOverallScore: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  ratingScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ratingScoreItem: {
    alignItems: 'center',
  },
  ratingScoreLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  ratingScoreValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  ratingComments: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500' as const,
  },
  formInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top' as const,
  },
  ratingFormSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingSelectorLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  ratingStarsSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBottomPadding: {
    height: 40,
  },
});
