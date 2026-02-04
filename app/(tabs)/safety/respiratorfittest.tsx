import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Plus,
  Search,
  Filter,
  X,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Edit,
  FileText,
} from 'lucide-react-native';
import {
  useRespiratorFitTests,
  useRespiratorTypes,
  useExpiringFitTests,
  useCreateRespiratorFitTest,
  useUpdateRespiratorFitTest,
  useDeleteRespiratorFitTest,
} from '@/hooks/useRespiratorFitTests';
import { RespiratorFitTest, RespiratorFitTestFormData } from '@/types/ppeManagement';

const TEST_METHODS = [
  'Qualitative - Saccharin',
  'Qualitative - Bitrex',
  'Qualitative - Irritant Smoke',
  'Quantitative - PortaCount',
  'Quantitative - Controlled Negative Pressure',
];

const RESPIRATOR_SIZES = ['XS', 'S', 'M', 'M/L', 'L', 'XL'];

export default function RespiratorFitTestScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<RespiratorFitTest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: fitTests, isLoading, refetch } = useRespiratorFitTests();
  const { data: respiratorTypes } = useRespiratorTypes();
  const { data: expiringTests } = useExpiringFitTests(30);
  const createMutation = useCreateRespiratorFitTest();
  const updateMutation = useUpdateRespiratorFitTest();
  const deleteMutation = useDeleteRespiratorFitTest();

  const [formData, setFormData] = useState<RespiratorFitTestFormData>({
    employee_name: '',
    department: '',
    test_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    respirator_type: '',
    respirator_model: '',
    respirator_size: '',
    test_method: '',
    test_result: 'pass',
    tester_name: '',
    training_completed: false,
    notes: '',
  });

  const resetForm = useCallback(() => {
    setFormData({
      employee_name: '',
      department: '',
      test_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      respirator_type: '',
      respirator_model: '',
      respirator_size: '',
      test_method: '',
      test_result: 'pass',
      tester_name: '',
      training_completed: false,
      notes: '',
    });
    setSelectedTest(null);
  }, []);

  const handleOpenForm = useCallback((test?: RespiratorFitTest) => {
    if (test) {
      setSelectedTest(test);
      setFormData({
        employee_name: test.employee_name,
        department: test.department || '',
        test_date: test.test_date,
        expiration_date: test.expiration_date,
        respirator_type: test.respirator_type,
        respirator_model: test.respirator_model,
        respirator_size: test.respirator_size,
        test_method: test.test_method,
        fit_factor: test.fit_factor || undefined,
        test_result: test.test_result,
        tester_name: test.tester_name,
        tester_certification: test.tester_certification || undefined,
        medical_clearance_date: test.medical_clearance_date || undefined,
        medical_clearance_status: test.medical_clearance_status || undefined,
        training_completed: test.training_completed,
        training_date: test.training_date || undefined,
        notes: test.notes || '',
      });
    } else {
      resetForm();
    }
    setShowFormModal(true);
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!formData.employee_name || !formData.respirator_type || !formData.test_method || !formData.tester_name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const expirationDate = formData.expiration_date || (() => {
      const date = new Date(formData.test_date);
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().split('T')[0];
    })();

    const submitData = {
      ...formData,
      expiration_date: expirationDate,
    };

    try {
      if (selectedTest) {
        await updateMutation.mutateAsync({ id: selectedTest.id, ...submitData });
        Alert.alert('Success', 'Fit test record updated successfully');
      } else {
        await createMutation.mutateAsync(submitData);
        Alert.alert('Success', 'Fit test record created successfully');
      }
      setShowFormModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving fit test:', error);
      Alert.alert('Error', 'Failed to save fit test record');
    }
  }, [formData, selectedTest, createMutation, updateMutation, resetForm]);

  const handleDelete = useCallback((test: RespiratorFitTest) => {
    Alert.alert(
      'Delete Fit Test',
      `Are you sure you want to delete the fit test for ${test.employee_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(test.id);
              Alert.alert('Success', 'Fit test record deleted');
            } catch (error) {
              console.error('Error deleting fit test:', error);
              Alert.alert('Error', 'Failed to delete fit test record');
            }
          },
        },
      ]
    );
  }, [deleteMutation]);

  const filteredTests = fitTests?.filter((test) => {
    const matchesSearch =
      test.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.respirator_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterResult === 'all' || test.test_result === filterResult;
    return matchesSearch && matchesFilter;
  }) || [];

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass':
        return '#10B981';
      case 'fail':
        return '#EF4444';
      case 'incomplete':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass':
        return <CheckCircle size={16} color="#10B981" />;
      case 'fail':
        return <XCircle size={16} color="#EF4444" />;
      case 'incomplete':
        return <Clock size={16} color="#F59E0B" />;
      default:
        return null;
    }
  };

  const isExpiringSoon = (expirationDate: string) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  const isExpired = (expirationDate: string) => {
    return new Date(expirationDate) < new Date();
  };

  const passCount = fitTests?.filter(t => t.test_result === 'pass').length || 0;
  const failCount = fitTests?.filter(t => t.test_result === 'fail').length || 0;
  const expiringCount = expiringTests?.length || 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading fit tests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Shield size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Respirator Fit Testing</Text>
            <Text style={styles.headerSubtitle}>Track and manage employee fit tests</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{passCount}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <XCircle size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{failCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{expiringCount}</Text>
            <Text style={styles.statLabel}>Expiring</Text>
          </View>
        </View>

        <View style={styles.searchFilterRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, type..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenForm()}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>New Fit Test</Text>
        </TouchableOpacity>

        {expiringTests && expiringTests.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={styles.alertTitle}>Expiring Soon</Text>
            </View>
            {expiringTests.slice(0, 3).map((test) => (
              <TouchableOpacity
                key={test.id}
                style={styles.alertItem}
                onPress={() => {
                  setSelectedTest(test);
                  setShowDetailModal(true);
                }}
              >
                <Text style={styles.alertItemText}>{test.employee_name}</Text>
                <Text style={styles.alertItemDate}>Expires: {test.expiration_date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Fit Test Records ({filteredTests.length})</Text>
          {filteredTests.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No fit test records found</Text>
              <Text style={styles.emptySubtext}>Add a new fit test to get started</Text>
            </View>
          ) : (
            filteredTests.map((test) => (
              <TouchableOpacity
                key={test.id}
                style={styles.testCard}
                onPress={() => {
                  setSelectedTest(test);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.testCardHeader}>
                  <View style={styles.testCardLeft}>
                    <View style={styles.employeeInfo}>
                      <User size={16} color="#6B7280" />
                      <Text style={styles.employeeName}>{test.employee_name}</Text>
                    </View>
                    {test.department && (
                      <Text style={styles.departmentText}>{test.department}</Text>
                    )}
                  </View>
                  <View style={[styles.resultBadge, { backgroundColor: `${getResultColor(test.test_result)}20` }]}>
                    {getResultIcon(test.test_result)}
                    <Text style={[styles.resultText, { color: getResultColor(test.test_result) }]}>
                      {test.test_result.charAt(0).toUpperCase() + test.test_result.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.testCardBody}>
                  <View style={styles.testDetail}>
                    <Text style={styles.detailLabel}>Respirator:</Text>
                    <Text style={styles.detailValue}>{test.respirator_type}</Text>
                  </View>
                  <View style={styles.testDetail}>
                    <Text style={styles.detailLabel}>Model/Size:</Text>
                    <Text style={styles.detailValue}>{test.respirator_model} / {test.respirator_size}</Text>
                  </View>
                  <View style={styles.testDetail}>
                    <Text style={styles.detailLabel}>Method:</Text>
                    <Text style={styles.detailValue}>{test.test_method}</Text>
                  </View>
                </View>

                <View style={styles.testCardFooter}>
                  <View style={styles.dateInfo}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.dateText}>Tested: {test.test_date}</Text>
                  </View>
                  <View style={[
                    styles.expirationInfo,
                    isExpired(test.expiration_date) && styles.expiredInfo,
                    isExpiringSoon(test.expiration_date) && styles.expiringSoonInfo,
                  ]}>
                    <Text style={[
                      styles.expirationText,
                      isExpired(test.expiration_date) && styles.expiredText,
                      isExpiringSoon(test.expiration_date) && styles.expiringSoonText,
                    ]}>
                      {isExpired(test.expiration_date) ? 'EXPIRED' : `Expires: ${test.expiration_date}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleOpenForm(test)}
                  >
                    <Edit size={16} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleDelete(test)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                  <ChevronRight size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Results</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {['all', 'pass', 'fail', 'incomplete'].map((result) => (
              <TouchableOpacity
                key={result}
                style={[styles.filterOption, filterResult === result && styles.filterOptionActive]}
                onPress={() => {
                  setFilterResult(result);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, filterResult === result && styles.filterOptionTextActive]}>
                  {result === 'all' ? 'All Results' : result.charAt(0).toUpperCase() + result.slice(1)}
                </Text>
                {filterResult === result && <CheckCircle size={18} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showFormModal} animationType="slide">
        <SafeAreaView style={styles.formModal}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setShowFormModal(false); resetForm(); }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>
              {selectedTest ? 'Edit Fit Test' : 'New Fit Test'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Employee Information</Text>

              <Text style={styles.inputLabel}>Employee Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.employee_name}
                onChangeText={(text) => setFormData({ ...formData, employee_name: text })}
                placeholder="Enter employee name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Department</Text>
              <TextInput
                style={styles.textInput}
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
                placeholder="Enter department"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Respirator Details</Text>

              <Text style={styles.inputLabel}>Respirator Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {respiratorTypes?.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.chip, formData.respirator_type === type.name && styles.chipActive]}
                    onPress={() => setFormData({ ...formData, respirator_type: type.name })}
                  >
                    <Text style={[styles.chipText, formData.respirator_type === type.name && styles.chipTextActive]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Model</Text>
              <TextInput
                style={styles.textInput}
                value={formData.respirator_model}
                onChangeText={(text) => setFormData({ ...formData, respirator_model: text })}
                placeholder="Enter model number"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Size *</Text>
              <View style={styles.sizeRow}>
                {RESPIRATOR_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeButton, formData.respirator_size === size && styles.sizeButtonActive]}
                    onPress={() => setFormData({ ...formData, respirator_size: size })}
                  >
                    <Text style={[styles.sizeButtonText, formData.respirator_size === size && styles.sizeButtonTextActive]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Test Details</Text>

              <Text style={styles.inputLabel}>Test Date *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.test_date}
                onChangeText={(text) => setFormData({ ...formData, test_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Test Method *</Text>
              {TEST_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodOption, formData.test_method === method && styles.methodOptionActive]}
                  onPress={() => setFormData({ ...formData, test_method: method })}
                >
                  <Text style={[styles.methodOptionText, formData.test_method === method && styles.methodOptionTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.inputLabel}>Fit Factor (for quantitative tests)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.fit_factor?.toString() || ''}
                onChangeText={(text) => setFormData({ ...formData, fit_factor: text ? parseFloat(text) : undefined })}
                placeholder="Enter fit factor"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Test Result *</Text>
              <View style={styles.resultRow}>
                {(['pass', 'fail', 'incomplete'] as const).map((result) => (
                  <TouchableOpacity
                    key={result}
                    style={[
                      styles.resultButton,
                      formData.test_result === result && {
                        backgroundColor: getResultColor(result),
                        borderColor: getResultColor(result),
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, test_result: result })}
                  >
                    <Text style={[
                      styles.resultButtonText,
                      formData.test_result === result && styles.resultButtonTextActive,
                    ]}>
                      {result.charAt(0).toUpperCase() + result.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Tester Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.tester_name}
                onChangeText={(text) => setFormData({ ...formData, tester_name: text })}
                placeholder="Enter tester name"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Tester Certification</Text>
              <TextInput
                style={styles.textInput}
                value={formData.tester_certification}
                onChangeText={(text) => setFormData({ ...formData, tester_certification: text })}
                placeholder="Enter certification number"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Medical & Training</Text>

              <Text style={styles.inputLabel}>Medical Clearance Status</Text>
              <View style={styles.clearanceRow}>
                {(['cleared', 'pending', 'restricted', 'not_cleared'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.clearanceButton, formData.medical_clearance_status === status && styles.clearanceButtonActive]}
                    onPress={() => setFormData({ ...formData, medical_clearance_status: status })}
                  >
                    <Text style={[styles.clearanceButtonText, formData.medical_clearance_status === status && styles.clearanceButtonTextActive]}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, training_completed: !formData.training_completed })}
              >
                <View style={[styles.checkbox, formData.training_completed && styles.checkboxChecked]}>
                  {formData.training_completed && <CheckCircle size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Training Completed</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Add any additional notes..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide">
        <SafeAreaView style={styles.detailModal}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setShowDetailModal(false); setSelectedTest(null); }}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Fit Test Details</Text>
            <TouchableOpacity onPress={() => { setShowDetailModal(false); handleOpenForm(selectedTest!); }}>
              <Edit size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {selectedTest && (
            <ScrollView style={styles.detailContent}>
              <View style={[styles.resultBanner, { backgroundColor: `${getResultColor(selectedTest.test_result)}20` }]}>
                {getResultIcon(selectedTest.test_result)}
                <Text style={[styles.resultBannerText, { color: getResultColor(selectedTest.test_result) }]}>
                  {selectedTest.test_result.toUpperCase()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Employee</Text>
                <Text style={styles.detailMainValue}>{selectedTest.employee_name}</Text>
                {selectedTest.department && (
                  <Text style={styles.detailSubValue}>{selectedTest.department}</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Respirator</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Type:</Text>
                  <Text style={styles.detailRowValue}>{selectedTest.respirator_type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Model:</Text>
                  <Text style={styles.detailRowValue}>{selectedTest.respirator_model}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Size:</Text>
                  <Text style={styles.detailRowValue}>{selectedTest.respirator_size}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Test Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Method:</Text>
                  <Text style={styles.detailRowValue}>{selectedTest.test_method}</Text>
                </View>
                {selectedTest.fit_factor && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Fit Factor:</Text>
                    <Text style={styles.detailRowValue}>{selectedTest.fit_factor}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Test Date:</Text>
                  <Text style={styles.detailRowValue}>{selectedTest.test_date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Expiration:</Text>
                  <Text style={[
                    styles.detailRowValue,
                    isExpired(selectedTest.expiration_date) && styles.expiredDetailText,
                  ]}>
                    {selectedTest.expiration_date}
                    {isExpired(selectedTest.expiration_date) && ' (EXPIRED)'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Tester:</Text>
                  <Text style={styles.detailRowValue}>{selectedTest.tester_name}</Text>
                </View>
                {selectedTest.tester_certification && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Certification:</Text>
                    <Text style={styles.detailRowValue}>{selectedTest.tester_certification}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Medical & Training</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Medical Clearance:</Text>
                  <Text style={styles.detailRowValue}>
                    {selectedTest.medical_clearance_status?.replace('_', ' ') || 'Not recorded'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Training:</Text>
                  <Text style={styles.detailRowValue}>
                    {selectedTest.training_completed ? 'Completed' : 'Not completed'}
                  </Text>
                </View>
              </View>

              {selectedTest.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Notes</Text>
                  <Text style={styles.notesText}>{selectedTest.notes}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteDetailButton}
                onPress={() => {
                  setShowDetailModal(false);
                  handleDelete(selectedTest);
                }}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.deleteDetailButtonText}>Delete Record</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertSection: {
    margin: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  alertItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  alertItemDate: {
    fontSize: 12,
    color: '#B45309',
  },
  listSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  testCardLeft: {
    flex: 1,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  departmentText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 24,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testCardBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  testDetail: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  testCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expirationInfo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  expiredInfo: {
    backgroundColor: '#FEE2E2',
  },
  expiringSoonInfo: {
    backgroundColor: '#FEF3C7',
  },
  expirationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  expiredText: {
    color: '#DC2626',
  },
  expiringSoonText: {
    color: '#D97706',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  cardActionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  formModal: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  detailModal: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  formContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipScroll: {
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3B82F6',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sizeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  sizeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sizeButtonTextActive: {
    color: '#fff',
  },
  methodOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  methodOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  methodOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  resultButtonTextActive: {
    color: '#fff',
  },
  clearanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clearanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  clearanceButtonActive: {
    backgroundColor: '#3B82F6',
  },
  clearanceButtonText: {
    fontSize: 13,
    color: '#374151',
  },
  clearanceButtonTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  resultBannerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailMainValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  expiredDetailText: {
    color: '#DC2626',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  deleteDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  deleteDetailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});
