import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Switch,
  Platform,
} from 'react-native';
import {
  Users,
  Search,
  X,
  Calendar,
  ChevronRight,
  Shield,
  Clock,
  DollarSign,
  Check,
  AlertTriangle,
  UserCheck,
  Briefcase,
  Mail,
  CalendarDays,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useEligibleDelegates,
  useCreateDelegation,
  useUpdateDelegation,
  useCheckDelegationConflicts,
  useCheckReDelegation,
  delegationTypeLabels,
  delegationTypeDescriptions,
  type EligibleApprover,
  type CreateDelegationInput,
  type UpdateDelegationInput,
} from '@/hooks/useSupabaseDelegations';
import type {
  DelegationRule,
  DelegationType,
  WorkflowCategory,
  DelegationLimits,
  ApprovalTierLevel,
} from '@/types/approvalWorkflows';
import { tierLevelColors } from '@/types/approvalWorkflows';
import { workflowCategoryLabels, workflowCategoryColors } from '@/mocks/workflowsData';
import DatePickerModal from '@/components/DatePickerModal';

interface DelegationSetupProps {
  visible: boolean;
  onClose: () => void;
  existingDelegation?: DelegationRule | null;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  onSuccess?: (delegation: DelegationRule) => void;
}

export default function DelegationSetup({
  visible,
  onClose,
  existingDelegation,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserRole,
  onSuccess,
}: DelegationSetupProps) {
  const { colors } = useTheme();
  const [activeStep, setActiveStep] = useState<'delegate' | 'type' | 'details' | 'review'>('delegate');
  
  const [selectedDelegate, setSelectedDelegate] = useState<EligibleApprover | null>(null);
  const [delegationType, setDelegationType] = useState<DelegationType>('full');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<WorkflowCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [maxApprovalAmount, setMaxApprovalAmount] = useState('');
  const [maxApprovalsPerDay, setMaxApprovalsPerDay] = useState('');
  const [excludeHighPriority, setExcludeHighPriority] = useState(false);
  const [requireNotification, setRequireNotification] = useState(true);
  const [maxTierLevel, setMaxTierLevel] = useState<ApprovalTierLevel | null>(null);
  const [allowReDelegation, setAllowReDelegation] = useState(true);
  const [requireJustificationAbove, setRequireJustificationAbove] = useState('');
  const [reDelegationWarning, setReDelegationWarning] = useState<string | null>(null);
  
  const [conflicts, setConflicts] = useState<DelegationRule[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const { data: eligibleDelegates = [], isLoading: delegatesLoading } = useEligibleDelegates({
    excludeUserId: currentUserId,
    searchQuery: searchQuery.length >= 2 ? searchQuery : undefined,
  });
  
  const createDelegation = useCreateDelegation();
  const updateDelegation = useUpdateDelegation();
  const checkConflicts = useCheckDelegationConflicts();
  const checkReDelegation = useCheckReDelegation();

  useEffect(() => {
    if (visible) {
      if (existingDelegation) {
        setSelectedDelegate({
          id: existingDelegation.toUserId,
          name: existingDelegation.toUserName,
          email: existingDelegation.toUserEmail || '',
          role: existingDelegation.toUserRole || '',
          canReceiveDelegation: true,
        });
        setDelegationType(existingDelegation.delegationType);
        setStartDate(existingDelegation.startDate);
        setEndDate(existingDelegation.endDate);
        setReason(existingDelegation.reason || '');
        setSelectedCategories(existingDelegation.workflowCategories || []);
        setMaxApprovalAmount(existingDelegation.limits?.maxApprovalAmount?.toString() || '');
        setMaxApprovalsPerDay(existingDelegation.limits?.maxApprovalsPerDay?.toString() || '');
        setExcludeHighPriority(existingDelegation.limits?.excludeHighPriority || false);
        setRequireNotification(existingDelegation.limits?.requireNotification ?? true);
        setMaxTierLevel(existingDelegation.limits?.maxTierLevel || null);
        setAllowReDelegation(existingDelegation.limits?.allowReDelegation !== false);
        setRequireJustificationAbove(existingDelegation.limits?.requireJustificationAbove?.toString() || '');
        setReDelegationWarning(null);
        setActiveStep('review');
      } else {
        setSelectedDelegate(null);
        setDelegationType('full');
        setStartDate('');
        setEndDate('');
        setReason('');
        setSelectedCategories([]);
        setSearchQuery('');
        setMaxApprovalAmount('');
        setMaxApprovalsPerDay('');
        setExcludeHighPriority(false);
        setRequireNotification(true);
        setMaxTierLevel(null);
        setAllowReDelegation(true);
        setRequireJustificationAbove('');
        setReDelegationWarning(null);
        setConflicts([]);
        setShowConflictWarning(false);
        setActiveStep('delegate');
      }
    }
  }, [visible, existingDelegation]);

  const resetForm = useCallback(() => {
    setSelectedDelegate(null);
    setDelegationType('full');
    setStartDate('');
    setEndDate('');
    setReason('');
    setSelectedCategories([]);
    setSearchQuery('');
    setMaxApprovalAmount('');
    setMaxApprovalsPerDay('');
    setExcludeHighPriority(false);
    setRequireNotification(true);
    setMaxTierLevel(null);
    setAllowReDelegation(true);
    setRequireJustificationAbove('');
    setReDelegationWarning(null);
    setConflicts([]);
    setShowConflictWarning(false);
    setActiveStep('delegate');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSelectDelegate = useCallback(async (delegate: EligibleApprover) => {
    setSelectedDelegate(delegate);
    
    const result = await checkReDelegation.mutateAsync(delegate.id);
    if (result.reason) {
      setReDelegationWarning(result.reason);
    } else {
      setReDelegationWarning(null);
    }
    
    if (!result.canReceiveDelegation) {
      Alert.alert(
        'Re-delegation Not Allowed',
        result.reason || 'This user cannot receive delegations at this time.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setActiveStep('type');
  }, [checkReDelegation]);

  const handleSelectType = useCallback((type: DelegationType) => {
    setDelegationType(type);
  }, []);

  const toggleCategory = useCallback((category: WorkflowCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const validateDates = useCallback(async () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select both start and end dates');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today && !existingDelegation) {
      Alert.alert('Error', 'Start date cannot be in the past');
      return false;
    }

    if (end < start) {
      Alert.alert('Error', 'End date must be after start date');
      return false;
    }

    const result = await checkConflicts.mutateAsync({
      fromUserId: currentUserId,
      startDate,
      endDate,
      excludeDelegationId: existingDelegation?.id,
    });

    if (result.length > 0) {
      setConflicts(result);
      setShowConflictWarning(true);
      return false;
    }

    return true;
  }, [startDate, endDate, currentUserId, existingDelegation, checkConflicts]);

  const handleProceedToDetails = useCallback(async () => {
    const isValid = await validateDates();
    if (isValid) {
      setActiveStep('details');
    }
  }, [validateDates]);

  const handleProceedToReview = useCallback(() => {
    if (delegationType === 'specific' && selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one workflow category');
      return;
    }
    setActiveStep('review');
  }, [delegationType, selectedCategories]);

  const handleSave = useCallback(async () => {
    if (!selectedDelegate) {
      Alert.alert('Error', 'Please select a delegate');
      return;
    }

    const limits: DelegationLimits = {};
    if (maxApprovalAmount) limits.maxApprovalAmount = parseFloat(maxApprovalAmount);
    if (maxApprovalsPerDay) limits.maxApprovalsPerDay = parseInt(maxApprovalsPerDay);
    if (excludeHighPriority) limits.excludeHighPriority = true;
    if (requireNotification) limits.requireNotification = true;
    if (maxTierLevel) limits.maxTierLevel = maxTierLevel;
    if (!allowReDelegation) limits.allowReDelegation = false;
    if (requireJustificationAbove) limits.requireJustificationAbove = parseFloat(requireJustificationAbove);
    if (delegationType === 'specific' && selectedCategories.length > 0) {
      const allCategories: WorkflowCategory[] = ['purchase', 'time_off', 'permit', 'expense', 'contract', 'custom'];
      limits.excludeCategories = allCategories.filter(c => !selectedCategories.includes(c));
    }

    try {
      if (existingDelegation) {
        const updates: UpdateDelegationInput = {
          delegationType,
          startDate,
          endDate,
          workflowCategories: delegationType === 'specific' ? selectedCategories : undefined,
          limits: Object.keys(limits).length > 0 ? limits : undefined,
          reason: reason || undefined,
        };

        const result = await updateDelegation.mutateAsync({
          id: existingDelegation.id,
          updates,
          updatedBy: currentUserName,
        });

        console.log('[DelegationSetup] Updated delegation:', result.id);
        onSuccess?.(result);
      } else {
        const input: CreateDelegationInput = {
          fromUserId: currentUserId,
          fromUserName: currentUserName,
          fromUserEmail: currentUserEmail,
          fromUserRole: currentUserRole,
          toUserId: selectedDelegate.id,
          toUserName: selectedDelegate.name,
          toUserEmail: selectedDelegate.email,
          toUserRole: selectedDelegate.role,
          delegationType,
          startDate,
          endDate,
          workflowCategories: delegationType === 'specific' ? selectedCategories : undefined,
          limits: Object.keys(limits).length > 0 ? limits : undefined,
          reason: reason || undefined,
        };

        const result = await createDelegation.mutateAsync(input);
        console.log('[DelegationSetup] Created delegation:', result.id);
        onSuccess?.(result);
      }

      handleClose();
    } catch (error) {
      console.error('[DelegationSetup] Error saving delegation:', error);
      Alert.alert('Error', 'Failed to save delegation. Please try again.');
    }
  }, [
    selectedDelegate,
    delegationType,
    startDate,
    endDate,
    selectedCategories,
    maxApprovalAmount,
    maxApprovalsPerDay,
    excludeHighPriority,
    requireNotification,
    maxTierLevel,
    allowReDelegation,
    requireJustificationAbove,
    reason,
    existingDelegation,
    currentUserId,
    currentUserName,
    currentUserEmail,
    currentUserRole,
    createDelegation,
    updateDelegation,
    onSuccess,
    handleClose,
  ]);

  const filteredDelegates = useMemo(() => {
    if (searchQuery.length < 2) return eligibleDelegates;
    const query = searchQuery.toLowerCase();
    return eligibleDelegates.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.email.toLowerCase().includes(query) ||
      d.role.toLowerCase().includes(query)
    );
  }, [eligibleDelegates, searchQuery]);

  const categories: WorkflowCategory[] = ['purchase', 'time_off', 'permit', 'expense', 'contract', 'custom'];

  const stepIndicator = useMemo(() => {
    const steps = [
      { key: 'delegate', label: 'Select' },
      { key: 'type', label: 'Type' },
      { key: 'details', label: 'Details' },
      { key: 'review', label: 'Review' },
    ];
    const currentIndex = steps.findIndex(s => s.key === activeStep);
    
    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <TouchableOpacity
              style={[
                styles.stepDot,
                { backgroundColor: index <= currentIndex ? colors.primary : colors.border },
              ]}
              onPress={() => {
                if (index < currentIndex) {
                  setActiveStep(step.key as typeof activeStep);
                }
              }}
              disabled={index > currentIndex}
            >
              {index < currentIndex ? (
                <Check size={12} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, { color: index <= currentIndex ? '#FFFFFF' : colors.textSecondary }]}>
                  {index + 1}
                </Text>
              )}
            </TouchableOpacity>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: index < currentIndex ? colors.primary : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  }, [activeStep, colors]);

  const renderDelegateStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select Delegate</Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Choose who will receive your approval authority
      </Text>

      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, email, or role..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {delegatesLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView style={styles.delegateList} showsVerticalScrollIndicator={false}>
          {filteredDelegates.map(delegate => (
            <TouchableOpacity
              key={delegate.id}
              style={[
                styles.delegateCard,
                { backgroundColor: colors.background },
                selectedDelegate?.id === delegate.id && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => handleSelectDelegate(delegate)}
              activeOpacity={0.7}
            >
              <View style={[styles.delegateAvatar, { backgroundColor: colors.primary + '20' }]}>
                <UserCheck size={24} color={colors.primary} />
              </View>
              <View style={styles.delegateInfo}>
                <Text style={[styles.delegateName, { color: colors.text }]}>{delegate.name}</Text>
                <View style={styles.delegateMetaRow}>
                  <Briefcase size={12} color={colors.textSecondary} />
                  <Text style={[styles.delegateMeta, { color: colors.textSecondary }]}>{delegate.role}</Text>
                </View>
                <View style={styles.delegateMetaRow}>
                  <Mail size={12} color={colors.textSecondary} />
                  <Text style={[styles.delegateMeta, { color: colors.textSecondary }]}>{delegate.email}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
          {filteredDelegates.length === 0 && (
            <View style={styles.emptyState}>
              <Users size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No eligible delegates found
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Delegation Type</Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Choose how much authority to delegate
      </Text>

      <View style={styles.typeOptions}>
        {(['full', 'specific', 'temporary'] as DelegationType[]).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeCard,
              { backgroundColor: colors.background, borderColor: colors.border },
              delegationType === type && { borderColor: colors.primary, borderWidth: 2 },
            ]}
            onPress={() => handleSelectType(type)}
            activeOpacity={0.7}
          >
            <View style={[styles.typeIcon, { backgroundColor: delegationType === type ? colors.primary + '20' : colors.surface }]}>
              {type === 'full' && <Shield size={24} color={delegationType === type ? colors.primary : colors.textSecondary} />}
              {type === 'specific' && <Users size={24} color={delegationType === type ? colors.primary : colors.textSecondary} />}
              {type === 'temporary' && <Clock size={24} color={delegationType === type ? colors.primary : colors.textSecondary} />}
            </View>
            <Text style={[styles.typeLabel, { color: colors.text }]}>{delegationTypeLabels[type]}</Text>
            <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
              {delegationTypeDescriptions[type]}
            </Text>
            {delegationType === type && (
              <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
                <Check size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {delegationType === 'specific' && (
        <View style={styles.categorySection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Workflow Categories</Text>
          <View style={styles.categoryGrid}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  selectedCategories.includes(category) && {
                    backgroundColor: workflowCategoryColors[category] + '20',
                    borderColor: workflowCategoryColors[category],
                  },
                ]}
                onPress={() => toggleCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: selectedCategories.includes(category) ? workflowCategoryColors[category] : colors.text },
                  ]}
                >
                  {workflowCategoryLabels[category]}
                </Text>
                {selectedCategories.includes(category) && (
                  <Check size={14} color={workflowCategoryColors[category]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.dateSection}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Delegation Period</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Start Date</Text>
            <View style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <CalendarDays size={18} color={startDate ? colors.primary : colors.textSecondary} />
              <Text style={[styles.datePickerText, { color: startDate ? colors.text : colors.textSecondary }]}>
                {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>End Date</Text>
            <View style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <CalendarDays size={18} color={endDate ? colors.primary : colors.textSecondary} />
              <Text style={[styles.datePickerText, { color: endDate ? colors.text : colors.textSecondary }]}>
                {endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={setStartDate}
        selectedDate={startDate}
        minDate={new Date().toISOString().split('T')[0]}
        title="Start Date"
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onSelect={setEndDate}
        selectedDate={endDate}
        minDate={startDate || new Date().toISOString().split('T')[0]}
        title="End Date"
      />

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }]}
        onPress={handleProceedToDetails}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const tierLevels: ApprovalTierLevel[] = [1, 2, 3, 4, 5];

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Delegation Limits</Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Set optional restrictions for this delegation
      </Text>

      {reDelegationWarning && (
        <View style={[styles.warningBanner, { backgroundColor: '#F59E0B' + '15', borderColor: '#F59E0B' }]}>
          <AlertTriangle size={16} color="#F59E0B" />
          <Text style={[styles.warningText, { color: '#F59E0B' }]}>{reDelegationWarning}</Text>
        </View>
      )}

      <View style={styles.limitsSection}>
        <View style={styles.limitInput}>
          <View style={styles.limitLabelRow}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={[styles.limitLabel, { color: colors.text }]}>Max Approval Amount</Text>
          </View>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={maxApprovalAmount}
            onChangeText={setMaxApprovalAmount}
            placeholder="No limit"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.limitInput}>
          <View style={styles.limitLabelRow}>
            <DollarSign size={16} color={colors.textSecondary} />
            <Text style={[styles.limitLabel, { color: colors.text }]}>Require Justification Above</Text>
          </View>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={requireJustificationAbove}
            onChangeText={setRequireJustificationAbove}
            placeholder="No threshold"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.limitInput}>
          <View style={styles.limitLabelRow}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={[styles.limitLabel, { color: colors.text }]}>Max Approvals Per Day</Text>
          </View>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={maxApprovalsPerDay}
            onChangeText={setMaxApprovalsPerDay}
            placeholder="Unlimited"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.tierLevelSection}>
          <View style={styles.limitLabelRow}>
            <Shield size={16} color={colors.textSecondary} />
            <Text style={[styles.limitLabel, { color: colors.text }]}>Max Tier Level</Text>
          </View>
          <Text style={[styles.tierLevelHint, { color: colors.textSecondary }]}>
            Delegate can only approve up to this tier level
          </Text>
          <View style={styles.tierLevelGrid}>
            <TouchableOpacity
              style={[
                styles.tierLevelChip,
                { backgroundColor: colors.background, borderColor: colors.border },
                !maxTierLevel && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
              ]}
              onPress={() => setMaxTierLevel(null)}
            >
              <Text style={[styles.tierLevelChipText, { color: !maxTierLevel ? colors.primary : colors.text }]}>
                No Limit
              </Text>
            </TouchableOpacity>
            {tierLevels.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.tierLevelChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  maxTierLevel === level && { 
                    backgroundColor: tierLevelColors[level] + '20', 
                    borderColor: tierLevelColors[level] 
                  },
                ]}
                onPress={() => setMaxTierLevel(level)}
              >
                <Text 
                  style={[
                    styles.tierLevelChipText, 
                    { color: maxTierLevel === level ? tierLevelColors[level] : colors.text }
                  ]}
                >
                  Tier {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.switchRow, styles.switchRowBorder, { borderTopColor: colors.border }]}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Exclude High Priority</Text>
            <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
              Critical requests still require your approval
            </Text>
          </View>
          <Switch
            value={excludeHighPriority}
            onValueChange={setExcludeHighPriority}
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
            thumbColor={excludeHighPriority ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Notify Me of Actions</Text>
            <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
              Receive notifications when delegate approves
            </Text>
          </View>
          <Switch
            value={requireNotification}
            onValueChange={setRequireNotification}
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
            thumbColor={requireNotification ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Allow Re-delegation</Text>
            <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
              Delegate can pass authority to another user
            </Text>
          </View>
          <Switch
            value={allowReDelegation}
            onValueChange={setAllowReDelegation}
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
            thumbColor={allowReDelegation ? colors.primary : colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.reasonSection}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Reason (Optional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={reason}
          onChangeText={setReason}
          placeholder="e.g., Out of office, vacation, training..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }]}
        onPress={handleProceedToReview}
      >
        <Text style={styles.continueButtonText}>Review Delegation</Text>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Review Delegation</Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Confirm the delegation details before saving
      </Text>

      <View style={[styles.reviewCard, { backgroundColor: colors.background }]}>
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Delegating To</Text>
          <View style={styles.reviewDelegateRow}>
            <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + '20' }]}>
              <UserCheck size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedDelegate?.name}</Text>
              <Text style={[styles.reviewSubValue, { color: colors.textSecondary }]}>{selectedDelegate?.role}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />

        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Delegation Type</Text>
          <Text style={[styles.reviewValue, { color: colors.text }]}>{delegationTypeLabels[delegationType]}</Text>
        </View>

        {delegationType === 'specific' && selectedCategories.length > 0 && (
          <>
            <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Workflow Categories</Text>
              <View style={styles.reviewCategoriesRow}>
                {selectedCategories.map(cat => (
                  <View key={cat} style={[styles.reviewCategoryBadge, { backgroundColor: workflowCategoryColors[cat] + '20' }]}>
                    <Text style={[styles.reviewCategoryText, { color: workflowCategoryColors[cat] }]}>
                      {workflowCategoryLabels[cat]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />

        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Period</Text>
          <View style={styles.reviewPeriodRow}>
            <Calendar size={16} color={colors.primary} />
            <Text style={[styles.reviewValue, { color: colors.text }]}>
              {startDate} → {endDate}
            </Text>
          </View>
        </View>

        {(maxApprovalAmount || maxApprovalsPerDay || excludeHighPriority || maxTierLevel || !allowReDelegation || requireJustificationAbove) && (
          <>
            <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Limits & Restrictions</Text>
              <View style={styles.reviewLimitsColumn}>
                {maxApprovalAmount && (
                  <Text style={[styles.reviewLimitText, { color: colors.text }]}>
                    • Max amount: ${parseFloat(maxApprovalAmount).toLocaleString()}
                  </Text>
                )}
                {requireJustificationAbove && (
                  <Text style={[styles.reviewLimitText, { color: colors.text }]}>
                    • Justification required above ${parseFloat(requireJustificationAbove).toLocaleString()}
                  </Text>
                )}
                {maxApprovalsPerDay && (
                  <Text style={[styles.reviewLimitText, { color: colors.text }]}>
                    • Max {maxApprovalsPerDay} approvals/day
                  </Text>
                )}
                {maxTierLevel && (
                  <View style={styles.reviewTierRow}>
                    <Text style={[styles.reviewLimitText, { color: colors.text }]}>• Max tier level: </Text>
                    <View style={[styles.reviewTierBadge, { backgroundColor: tierLevelColors[maxTierLevel] + '20' }]}>
                      <Text style={[styles.reviewTierBadgeText, { color: tierLevelColors[maxTierLevel] }]}>
                        Tier {maxTierLevel}
                      </Text>
                    </View>
                  </View>
                )}
                {excludeHighPriority && (
                  <Text style={[styles.reviewLimitText, { color: colors.text }]}>
                    • Excludes high priority requests
                  </Text>
                )}
                {!allowReDelegation && (
                  <Text style={[styles.reviewLimitText, { color: '#EF4444' }]}>
                    • No re-delegation allowed
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        {reason && (
          <>
            <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Reason</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{reason}</Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={createDelegation.isPending || updateDelegation.isPending}
      >
        {(createDelegation.isPending || updateDelegation.isPending) ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {existingDelegation ? 'Update Delegation' : 'Create Delegation'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {existingDelegation ? 'Edit Delegation' : 'New Delegation'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {stepIndicator}

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {activeStep === 'delegate' && renderDelegateStep()}
            {activeStep === 'type' && renderTypeStep()}
            {activeStep === 'details' && renderDetailsStep()}
            {activeStep === 'review' && renderReviewStep()}
          </ScrollView>
        </View>
      </View>

      <Modal visible={showConflictWarning} transparent animationType="fade">
        <View style={styles.conflictOverlay}>
          <View style={[styles.conflictModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.conflictIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <AlertTriangle size={32} color="#F59E0B" />
            </View>
            <Text style={[styles.conflictTitle, { color: colors.text }]}>Conflicting Delegations</Text>
            <Text style={[styles.conflictText, { color: colors.textSecondary }]}>
              You have {conflicts.length} existing delegation(s) that overlap with these dates:
            </Text>
            {conflicts.map(c => (
              <View key={c.id} style={[styles.conflictItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.conflictItemText, { color: colors.text }]}>
                  To {c.toUserName}: {c.startDate} - {c.endDate}
                </Text>
              </View>
            ))}
            <View style={styles.conflictActions}>
              <TouchableOpacity
                style={[styles.conflictButton, { backgroundColor: colors.border }]}
                onPress={() => setShowConflictWarning(false)}
              >
                <Text style={[styles.conflictButtonText, { color: colors.text }]}>Change Dates</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  modalScroll: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 16,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  stepContent: {
    padding: 20,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loader: {
    marginTop: 40,
  },
  delegateList: {
    maxHeight: 400,
  },
  delegateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  delegateAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  delegateInfo: {
    flex: 1,
  },
  delegateName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  delegateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  delegateMeta: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 12,
  },
  typeOptions: {
    gap: 12,
    marginBottom: 20,
  },
  typeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
  },
  selectedCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tierLevelSection: {
    marginTop: 8,
  },
  tierLevelHint: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  tierLevelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierLevelChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierLevelChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  switchRowBorder: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 16,
  },
  reviewTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewTierBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  datePickerText: {
    fontSize: 15,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  limitsSection: {
    gap: 16,
    marginBottom: 20,
  },
  limitInput: {
    gap: 8,
  },
  limitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limitLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  switchHint: {
    fontSize: 12,
    marginTop: 2,
  },
  reasonSection: {
    marginBottom: 20,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reviewSection: {
    paddingVertical: 12,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  reviewSubValue: {
    fontSize: 13,
    marginTop: 2,
  },
  reviewDelegateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewDivider: {
    height: 1,
  },
  reviewCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reviewCategoryText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  reviewPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewLimitsColumn: {
    gap: 4,
  },
  reviewLimitText: {
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  conflictOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  conflictModal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  conflictIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  conflictTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  conflictText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  conflictItem: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  conflictItemText: {
    fontSize: 13,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  conflictButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  conflictButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
