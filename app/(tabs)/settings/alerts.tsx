import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Mail,
  Smartphone,
  TrendingUp,
  CheckCircle,
  RotateCcw,
  Layers,
  ToggleLeft,
  ToggleRight,
  CircleDot,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAlertPreferences,
  useUpdateAlertPreferences,
  useResetAlertPreferences,
} from '@/hooks/useSupabaseAlertPreferences';
import {
  type AlertNotificationChannel,
  type AlertPreferences,
  type AlertCategoryOverride,
  type ThresholdMode,
  type BadgeCountType,
  DEFAULT_ALERT_PREFERENCES,
  DEFAULT_CATEGORY_OVERRIDES,
} from '@/types/alertPreferences';

type SectionId = 'thresholds' | 'notifications' | 'inAppBadge' | 'escalation' | 'snooze' | 'display' | 'alertTypes' | 'categories';

export default function AlertSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { data: alertPreferences, isLoading: isLoadingPrefs } = useAlertPreferences();
  const updatePrefsMutation = useUpdateAlertPreferences();
  const resetPrefsMutation = useResetAlertPreferences();

  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(['thresholds', 'alertTypes', 'categories']));
  const [localPrefs, setLocalPrefs] = useState<AlertPreferences>(DEFAULT_ALERT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  React.useEffect(() => {
    if (alertPreferences && !isInitialized) {
      setLocalPrefs(alertPreferences);
      setIsInitialized(true);
      console.log('[AlertSettings] Initialized with preferences from server');
    }
  }, [alertPreferences, isInitialized]);

  const toggleSection = useCallback((section: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const updateLocal = useCallback(<K extends keyof AlertPreferences>(
    key: K,
    value: AlertPreferences[K]
  ) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const updateNestedLocal = useCallback(<
    K extends 'thresholds' | 'notifications' | 'autoEscalation' | 'snooze' | 'display'
  >(
    section: K,
    key: keyof AlertPreferences[K],
    value: AlertPreferences[K][keyof AlertPreferences[K]]
  ) => {
    setLocalPrefs(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    updatePrefsMutation.mutate(localPrefs, {
      onSuccess: () => {
        setHasChanges(false);
        Alert.alert('Saved', 'Alert preferences have been updated.');
        console.log('[AlertSettings] Preferences saved successfully');
      },
      onError: (error) => {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
        console.error('[AlertSettings] Save error:', error);
      },
    });
  }, [localPrefs, updatePrefsMutation]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all alert preferences to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetPrefsMutation.mutate(undefined, {
              onSuccess: () => {
                setLocalPrefs(DEFAULT_ALERT_PREFERENCES);
                setHasChanges(false);
                console.log('[AlertSettings] Preferences reset to defaults');
              },
              onError: (error) => {
                Alert.alert('Error', 'Failed to reset preferences.');
                console.error('[AlertSettings] Reset error:', error);
              },
            });
          },
        },
      ]
    );
  }, [resetPrefsMutation]);

  const toggleCategoryEnabled = useCallback((categoryId: string) => {
    const currentOverrides = localPrefs.categoryOverrides.length > 0 
      ? localPrefs.categoryOverrides 
      : DEFAULT_CATEGORY_OVERRIDES;
    
    const updatedOverrides = currentOverrides.map(cat => 
      cat.categoryId === categoryId 
        ? { ...cat, enabled: !cat.enabled }
        : cat
    );
    
    setLocalPrefs(prev => ({ ...prev, categoryOverrides: updatedOverrides }));
    setHasChanges(true);
    console.log(`Toggled category ${categoryId}:`, updatedOverrides.find(c => c.categoryId === categoryId)?.enabled);
  }, [localPrefs.categoryOverrides]);

  const enableAllCategories = useCallback(() => {
    const currentOverrides = localPrefs.categoryOverrides.length > 0 
      ? localPrefs.categoryOverrides 
      : DEFAULT_CATEGORY_OVERRIDES;
    
    const updatedOverrides = currentOverrides.map(cat => ({ ...cat, enabled: true }));
    setLocalPrefs(prev => ({ ...prev, categoryOverrides: updatedOverrides }));
    setHasChanges(true);
    console.log('Enabled all categories');
  }, [localPrefs.categoryOverrides]);

  const disableAllCategories = useCallback(() => {
    const currentOverrides = localPrefs.categoryOverrides.length > 0 
      ? localPrefs.categoryOverrides 
      : DEFAULT_CATEGORY_OVERRIDES;
    
    const updatedOverrides = currentOverrides.map(cat => ({ ...cat, enabled: false }));
    setLocalPrefs(prev => ({ ...prev, categoryOverrides: updatedOverrides }));
    setHasChanges(true);
    console.log('Disabled all categories');
  }, [localPrefs.categoryOverrides]);

  const getCategoryOverrides = useCallback((): AlertCategoryOverride[] => {
    return localPrefs.categoryOverrides.length > 0 
      ? localPrefs.categoryOverrides 
      : DEFAULT_CATEGORY_OVERRIDES;
  }, [localPrefs.categoryOverrides]);

  const toggleChannel = useCallback((
    channelKey: 'enabledChannels' | 'criticalChannels' | 'warningChannels' | 'infoChannels',
    channel: AlertNotificationChannel
  ) => {
    const current = localPrefs.notifications[channelKey];
    const updated = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    updateNestedLocal('notifications', channelKey, updated);
  }, [localPrefs.notifications, updateNestedLocal]);

  const styles = createStyles(colors);

  const renderSectionHeader = (
    id: SectionId,
    title: string,
    icon: React.ReactNode,
    description?: string
  ) => {
    const isExpanded = expandedSections.has(id);
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(id)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
            {icon}
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {description && (
              <Text style={styles.sectionDescription}>{description}</Text>
            )}
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderNumberInput = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    suffix?: string,
    min?: number,
    max?: number
  ) => (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.numberInputContainer}>
        <TextInput
          style={styles.numberInput}
          value={String(value)}
          onChangeText={(text) => {
            const num = parseInt(text) || 0;
            const bounded = Math.max(min ?? 0, Math.min(max ?? 999, num));
            onChange(bounded);
          }}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );

  const renderToggle = (
    label: string,
    value: boolean,
    onChange: (val: boolean) => void,
    description?: string
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description && <Text style={styles.toggleDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + '60' }}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
    </View>
  );

  const renderChannelButton = (
    channel: AlertNotificationChannel,
    channelKey: 'enabledChannels' | 'criticalChannels' | 'warningChannels' | 'infoChannels',
    icon: React.ReactNode,
    label: string
  ) => {
    const isActive = localPrefs.notifications[channelKey].includes(channel);
    return (
      <TouchableOpacity
        style={[
          styles.channelButton,
          isActive && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
        ]}
        onPress={() => toggleChannel(channelKey, channel)}
        activeOpacity={0.7}
      >
        {icon}
        <Text style={[styles.channelLabel, isActive && { color: colors.primary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDigestOption = (
    value: AlertPreferences['notifications']['digestFrequency'],
    label: string
  ) => {
    const isSelected = localPrefs.notifications.digestFrequency === value;
    return (
      <TouchableOpacity
        style={[
          styles.digestOption,
          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
        onPress={() => updateNestedLocal('notifications', 'digestFrequency', value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.digestLabel, isSelected && { color: '#FFFFFF' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSortOption = (
    value: AlertPreferences['display']['defaultSortBy'],
    label: string
  ) => {
    const isSelected = localPrefs.display.defaultSortBy === value;
    return (
      <TouchableOpacity
        style={[
          styles.sortOption,
          isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
        ]}
        onPress={() => updateNestedLocal('display', 'defaultSortBy', value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sortLabel, isSelected && { color: colors.primary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const isSaving = updatePrefsMutation.isPending;
  const isResetting = resetPrefsMutation.isPending;

  if (isLoadingPrefs && !isInitialized) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alert Settings</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Settings</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <RotateCcw size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Types Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'alertTypes',
            'Alert Types',
            <Bell size={18} color={colors.primary} />,
            'Enable or disable specific alert types'
          )}
          {expandedSections.has('alertTypes') && (
            <View style={styles.sectionContent}>
              {renderToggle(
                'Low Stock Alerts',
                localPrefs.enableLowStockAlerts,
                (val) => updateLocal('enableLowStockAlerts', val),
                'Alert when stock falls below minimum level'
              )}
              {renderToggle(
                'Out of Stock Alerts',
                localPrefs.enableOutOfStockAlerts,
                (val) => updateLocal('enableOutOfStockAlerts', val),
                'Alert when stock reaches zero'
              )}
              {renderToggle(
                'Overstock Alerts',
                localPrefs.enableOverstockAlerts,
                (val) => updateLocal('enableOverstockAlerts', val),
                'Alert when stock exceeds maximum level'
              )}
              {renderToggle(
                'High Consumption Alerts',
                localPrefs.enableHighConsumptionAlerts,
                (val) => updateLocal('enableHighConsumptionAlerts', val),
                'Alert on unusual consumption patterns'
              )}
              {renderToggle(
                'Lead Time Alerts',
                localPrefs.enableLeadTimeAlerts,
                (val) => updateLocal('enableLeadTimeAlerts', val),
                'Alert when reorder timing is critical'
              )}
            </View>
          )}
        </View>

        {/* Category Alerts Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'categories',
            'Category Alerts',
            <Layers size={18} color={colors.accent} />,
            'Enable or disable alerts by inventory category'
          )}
          {expandedSections.has('categories') && (
            <View style={styles.sectionContent}>
              <View style={styles.categoryBulkActions}>
                <TouchableOpacity
                  style={styles.bulkActionButton}
                  onPress={enableAllCategories}
                  activeOpacity={0.7}
                >
                  <ToggleRight size={14} color={colors.success} />
                  <Text style={[styles.bulkActionText, { color: colors.success }]}>Enable All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkActionButton}
                  onPress={disableAllCategories}
                  activeOpacity={0.7}
                >
                  <ToggleLeft size={14} color={colors.textSecondary} />
                  <Text style={[styles.bulkActionText, { color: colors.textSecondary }]}>Disable All</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.categoryCountInfo}>
                <Text style={styles.categoryCountText}>
                  {getCategoryOverrides().filter(c => c.enabled).length} of {getCategoryOverrides().length} categories enabled
                </Text>
              </View>

              <View style={styles.categoryGrid}>
                {getCategoryOverrides().map((category) => (
                  <TouchableOpacity
                    key={category.categoryId}
                    style={[
                      styles.categoryChip,
                      category.enabled && {
                        backgroundColor: colors.primary + '15',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleCategoryEnabled(category.categoryId)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.categoryIndicator,
                      { backgroundColor: category.enabled ? colors.primary : colors.textTertiary },
                    ]} />
                    <Text
                      style={[
                        styles.categoryChipText,
                        category.enabled && { color: colors.primary },
                      ]}
                    >
                      {category.categoryName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.categoryHint}>
                Tap a category to toggle alerts for items in that category
              </Text>
            </View>
          )}
        </View>

        {/* Thresholds Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'thresholds',
            'Thresholds',
            <AlertTriangle size={18} color={colors.warning} />,
            'Configure severity trigger levels'
          )}
          {expandedSections.has('thresholds') && (
            <View style={styles.sectionContent}>
              <Text style={styles.subsectionTitle}>Threshold Mode</Text>
              <View style={styles.thresholdModeRow}>
                {(['percentage', 'fixed'] as ThresholdMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.thresholdModeOption,
                      localPrefs.thresholds.thresholdMode === mode && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => updateNestedLocal('thresholds', 'thresholdMode', mode)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.thresholdModeLabel,
                        localPrefs.thresholds.thresholdMode === mode && { color: colors.primary },
                      ]}
                    >
                      {mode === 'percentage' ? '% of Min Level' : 'Fixed Quantity'}
                    </Text>
                    <Text style={styles.thresholdModeDesc}>
                      {mode === 'percentage' 
                        ? 'Trigger when stock is X% of minimum' 
                        : 'Trigger when stock falls below X units'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              {localPrefs.thresholds.thresholdMode === 'percentage' ? (
                <>
                  <View style={styles.thresholdRow}>
                    <View style={[styles.severityIndicator, { backgroundColor: colors.error }]} />
                    {renderNumberInput(
                      'Critical (% of min)',
                      localPrefs.thresholds.criticalThresholdPercent,
                      (val) => updateNestedLocal('thresholds', 'criticalThresholdPercent', val),
                      '%',
                      0,
                      100
                    )}
                  </View>
                  <View style={styles.thresholdRow}>
                    <View style={[styles.severityIndicator, { backgroundColor: colors.warning }]} />
                    {renderNumberInput(
                      'Warning (% of min)',
                      localPrefs.thresholds.warningThresholdPercent,
                      (val) => updateNestedLocal('thresholds', 'warningThresholdPercent', val),
                      '%',
                      0,
                      100
                    )}
                  </View>
                  <View style={styles.thresholdRow}>
                    <View style={[styles.severityIndicator, { backgroundColor: colors.info }]} />
                    {renderNumberInput(
                      'Info (% of min)',
                      localPrefs.thresholds.infoThresholdPercent,
                      (val) => updateNestedLocal('thresholds', 'infoThresholdPercent', val),
                      '%',
                      0,
                      100
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.thresholdRow}>
                    <View style={[styles.severityIndicator, { backgroundColor: colors.error }]} />
                    {renderNumberInput(
                      'Critical (units)',
                      localPrefs.thresholds.criticalThresholdFixed,
                      (val) => updateNestedLocal('thresholds', 'criticalThresholdFixed', val),
                      'units',
                      0,
                      9999
                    )}
                  </View>
                  <View style={styles.thresholdRow}>
                    <View style={[styles.severityIndicator, { backgroundColor: colors.warning }]} />
                    {renderNumberInput(
                      'Warning (units)',
                      localPrefs.thresholds.warningThresholdFixed,
                      (val) => updateNestedLocal('thresholds', 'warningThresholdFixed', val),
                      'units',
                      0,
                      9999
                    )}
                  </View>
                  <View style={styles.thresholdRow}>
                    <View style={[styles.severityIndicator, { backgroundColor: colors.info }]} />
                    {renderNumberInput(
                      'Info (units)',
                      localPrefs.thresholds.infoThresholdFixed,
                      (val) => updateNestedLocal('thresholds', 'infoThresholdFixed', val),
                      'units',
                      0,
                      9999
                    )}
                  </View>
                </>
              )}

              <View style={styles.divider} />

              {renderNumberInput(
                'Stockout Days Threshold',
                localPrefs.thresholds.stockoutDaysThreshold,
                (val) => updateNestedLocal('thresholds', 'stockoutDaysThreshold', val),
                'days',
                1,
                30
              )}
              {renderToggle(
                'Use Safety Stock for Critical',
                localPrefs.thresholds.useSafetyStockForCritical,
                (val) => updateNestedLocal('thresholds', 'useSafetyStockForCritical', val),
                'Factor safety stock into critical calculations'
              )}
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'notifications',
            'Notifications',
            <Smartphone size={18} color={colors.info} />,
            'Configure how you receive alerts'
          )}
          {expandedSections.has('notifications') && (
            <View style={styles.sectionContent}>
              <Text style={styles.subsectionTitle}>Enabled Channels</Text>
              <View style={styles.channelRow}>
                {renderChannelButton('in_app', 'enabledChannels', <Bell size={16} color={localPrefs.notifications.enabledChannels.includes('in_app') ? colors.primary : colors.textSecondary} />, 'In-App')}
                {renderChannelButton('push', 'enabledChannels', <Smartphone size={16} color={localPrefs.notifications.enabledChannels.includes('push') ? colors.primary : colors.textSecondary} />, 'Push')}
                {renderChannelButton('email', 'enabledChannels', <Mail size={16} color={localPrefs.notifications.enabledChannels.includes('email') ? colors.primary : colors.textSecondary} />, 'Email')}
              </View>

              <Text style={styles.subsectionTitle}>Critical Alert Channels</Text>
              <View style={styles.channelRow}>
                {renderChannelButton('in_app', 'criticalChannels', <Bell size={16} color={localPrefs.notifications.criticalChannels.includes('in_app') ? colors.primary : colors.textSecondary} />, 'In-App')}
                {renderChannelButton('push', 'criticalChannels', <Smartphone size={16} color={localPrefs.notifications.criticalChannels.includes('push') ? colors.primary : colors.textSecondary} />, 'Push')}
                {renderChannelButton('email', 'criticalChannels', <Mail size={16} color={localPrefs.notifications.criticalChannels.includes('email') ? colors.primary : colors.textSecondary} />, 'Email')}
              </View>

              <Text style={styles.subsectionTitle}>Digest Frequency</Text>
              <View style={styles.digestRow}>
                {renderDigestOption('realtime', 'Real-time')}
                {renderDigestOption('hourly', 'Hourly')}
                {renderDigestOption('daily', 'Daily')}
                {renderDigestOption('weekly', 'Weekly')}
              </View>

              <View style={styles.divider} />

              {renderToggle(
                'Quiet Hours',
                localPrefs.notifications.quietHoursEnabled,
                (val) => updateNestedLocal('notifications', 'quietHoursEnabled', val),
                'Suppress notifications during set hours'
              )}
              {localPrefs.notifications.quietHoursEnabled && (
                <View style={styles.quietHoursContainer}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={localPrefs.notifications.quietHoursStart}
                      onChangeText={(val) => updateNestedLocal('notifications', 'quietHoursStart', val)}
                      placeholder="22:00"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>End</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={localPrefs.notifications.quietHoursEnd}
                      onChangeText={(val) => updateNestedLocal('notifications', 'quietHoursEnd', val)}
                      placeholder="07:00"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  {renderToggle(
                    'Critical Bypass Quiet Hours',
                    localPrefs.notifications.criticalBypassQuietHours,
                    (val) => updateNestedLocal('notifications', 'criticalBypassQuietHours', val),
                    'Allow critical alerts during quiet hours'
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* In-App & Badge Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'inAppBadge',
            'In-App & Badge',
            <CircleDot size={18} color={colors.success} />,
            'Configure in-app banners and badge counts'
          )}
          {expandedSections.has('inAppBadge') && (
            <View style={styles.sectionContent}>
              <Text style={styles.subsectionTitle}>In-App Notifications</Text>
              {renderToggle(
                'Show In-App Banner',
                localPrefs.notifications.showInAppBanner,
                (val) => updateNestedLocal('notifications', 'showInAppBanner', val),
                'Display banner at top of screen for new alerts'
              )}
              {localPrefs.notifications.showInAppBanner && (
                renderNumberInput(
                  'Banner Duration',
                  localPrefs.notifications.inAppBannerDuration,
                  (val) => updateNestedLocal('notifications', 'inAppBannerDuration', val),
                  'sec',
                  1,
                  30
                )
              )}

              <View style={styles.divider} />

              <Text style={styles.subsectionTitle}>Badge Count</Text>
              {renderToggle(
                'Show Badge Count',
                localPrefs.notifications.showBadgeCount,
                (val) => updateNestedLocal('notifications', 'showBadgeCount', val),
                'Display alert count on app icon and tabs'
              )}
              {localPrefs.notifications.showBadgeCount && (
                <>
                  <View style={styles.badgeTypeContainer}>
                    <Text style={styles.inputLabel}>Badge Shows</Text>
                    <View style={styles.badgeTypePicker}>
                      {(['total', 'critical', 'unread'] as BadgeCountType[]).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.badgeTypeOption,
                            localPrefs.notifications.badgeCountType === type && {
                              backgroundColor: colors.primary + '20',
                              borderColor: colors.primary,
                            },
                          ]}
                          onPress={() => updateNestedLocal('notifications', 'badgeCountType', type)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.badgeTypeLabel,
                              localPrefs.notifications.badgeCountType === type && { color: colors.primary },
                            ]}
                          >
                            {type === 'total' ? 'All Alerts' : type === 'critical' ? 'Critical Only' : 'Unread'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {renderToggle(
                    'Clear Badge on View',
                    localPrefs.notifications.clearBadgeOnView,
                    (val) => updateNestedLocal('notifications', 'clearBadgeOnView', val),
                    'Reset badge count when viewing alerts'
                  )}
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.subsectionTitle}>Alert Feedback</Text>
              {renderToggle(
                'Play Alert Sound',
                localPrefs.notifications.playAlertSound,
                (val) => updateNestedLocal('notifications', 'playAlertSound', val),
                'Play sound for critical alerts'
              )}
              {renderToggle(
                'Vibrate on Alert',
                localPrefs.notifications.vibrateOnAlert,
                (val) => updateNestedLocal('notifications', 'vibrateOnAlert', val),
                'Vibrate device for new alerts'
              )}
            </View>
          )}
        </View>

        {/* Auto-Escalation Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'escalation',
            'Auto-Escalation',
            <TrendingUp size={18} color={colors.error} />,
            'Automatically escalate unresolved alerts'
          )}
          {expandedSections.has('escalation') && (
            <View style={styles.sectionContent}>
              {renderToggle(
                'Enable Auto-Escalation',
                localPrefs.autoEscalation.enabled,
                (val) => updateNestedLocal('autoEscalation', 'enabled', val)
              )}
              {localPrefs.autoEscalation.enabled && (
                <>
                  {renderNumberInput(
                    'Escalate After',
                    localPrefs.autoEscalation.escalateAfterHours,
                    (val) => updateNestedLocal('autoEscalation', 'escalateAfterHours', val),
                    'hours',
                    1,
                    168
                  )}
                  <View style={styles.escalateToRow}>
                    <Text style={styles.inputLabel}>Escalate To</Text>
                    <View style={styles.severityPicker}>
                      {(['warning', 'critical'] as const).map((severity) => (
                        <TouchableOpacity
                          key={severity}
                          style={[
                            styles.severityOption,
                            localPrefs.autoEscalation.escalateToSeverity === severity && {
                              backgroundColor: severity === 'critical' ? colors.error + '20' : colors.warning + '20',
                              borderColor: severity === 'critical' ? colors.error : colors.warning,
                            },
                          ]}
                          onPress={() => updateNestedLocal('autoEscalation', 'escalateToSeverity', severity)}
                        >
                          <Text
                            style={[
                              styles.severityOptionLabel,
                              localPrefs.autoEscalation.escalateToSeverity === severity && {
                                color: severity === 'critical' ? colors.error : colors.warning,
                              },
                            ]}
                          >
                            {severity.charAt(0).toUpperCase() + severity.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {renderToggle(
                    'Notify Managers',
                    localPrefs.autoEscalation.notifyManagers,
                    (val) => updateNestedLocal('autoEscalation', 'notifyManagers', val),
                    'Send email to managers on escalation'
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Snooze Settings Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'snooze',
            'Snooze Settings',
            <Clock size={18} color={colors.purple} />,
            'Configure alert snooze behavior'
          )}
          {expandedSections.has('snooze') && (
            <View style={styles.sectionContent}>
              {renderNumberInput(
                'Default Snooze Duration',
                localPrefs.snooze.defaultSnoozeDurationMinutes,
                (val) => updateNestedLocal('snooze', 'defaultSnoozeDurationMinutes', val),
                'min',
                5,
                1440
              )}
              {renderNumberInput(
                'Max Snooze Duration',
                localPrefs.snooze.maxSnoozeDurationHours,
                (val) => updateNestedLocal('snooze', 'maxSnoozeDurationHours', val),
                'hours',
                1,
                168
              )}
              {renderNumberInput(
                'Max Snooze Count',
                localPrefs.snooze.maxSnoozeCount,
                (val) => updateNestedLocal('snooze', 'maxSnoozeCount', val),
                'times',
                1,
                10
              )}
            </View>
          )}
        </View>

        {/* Display Settings Section */}
        <View style={styles.section}>
          {renderSectionHeader(
            'display',
            'Display Settings',
            <Eye size={18} color={colors.accent} />,
            'Configure how alerts are displayed'
          )}
          {expandedSections.has('display') && (
            <View style={styles.sectionContent}>
              {renderToggle(
                'Show on Dashboard',
                localPrefs.display.showOnDashboard,
                (val) => updateNestedLocal('display', 'showOnDashboard', val)
              )}
              {localPrefs.display.showOnDashboard && (
                renderNumberInput(
                  'Max Alerts on Dashboard',
                  localPrefs.display.dashboardMaxAlerts,
                  (val) => updateNestedLocal('display', 'dashboardMaxAlerts', val),
                  '',
                  1,
                  20
                )
              )}

              <Text style={styles.subsectionTitle}>Default Sort By</Text>
              <View style={styles.sortRow}>
                {renderSortOption('severity', 'Severity')}
                {renderSortOption('date', 'Date')}
                {renderSortOption('material', 'Material')}
                {renderSortOption('daysUntilStockout', 'Stockout')}
              </View>

              <View style={styles.sortOrderRow}>
                <Text style={styles.inputLabel}>Sort Order</Text>
                <View style={styles.sortOrderPicker}>
                  {(['desc', 'asc'] as const).map((order) => (
                    <TouchableOpacity
                      key={order}
                      style={[
                        styles.sortOrderOption,
                        localPrefs.display.defaultSortOrder === order && {
                          backgroundColor: colors.primary + '20',
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => updateNestedLocal('display', 'defaultSortOrder', order)}
                    >
                      <Text
                        style={[
                          styles.sortOrderLabel,
                          localPrefs.display.defaultSortOrder === order && { color: colors.primary },
                        ]}
                      >
                        {order === 'desc' ? 'Descending' : 'Ascending'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              {renderToggle(
                'Group by Category',
                localPrefs.display.groupByCategory,
                (val) => updateNestedLocal('display', 'groupByCategory', val)
              )}
              {renderToggle(
                'Group by Facility',
                localPrefs.display.groupByFacility,
                (val) => updateNestedLocal('display', 'groupByFacility', val)
              )}
              {renderToggle(
                'Show Resolved Alerts',
                localPrefs.display.showResolvedAlerts,
                (val) => updateNestedLocal('display', 'showResolvedAlerts', val)
              )}
              {localPrefs.display.showResolvedAlerts && (
                renderNumberInput(
                  'Resolved Alert Retention',
                  localPrefs.display.resolvedAlertRetentionDays,
                  (val) => updateNestedLocal('display', 'resolvedAlertRetentionDays', val),
                  'days',
                  1,
                  365
                )
              )}
              {renderToggle(
                'Show Acknowledged Alerts',
                localPrefs.display.showAcknowledgedAlerts,
                (val) => updateNestedLocal('display', 'showAcknowledgedAlerts', val)
              )}

              <View style={styles.divider} />

              {renderToggle(
                'Auto-Refresh',
                localPrefs.display.autoRefreshEnabled,
                (val) => updateNestedLocal('display', 'autoRefreshEnabled', val)
              )}
              {localPrefs.display.autoRefreshEnabled && (
                renderNumberInput(
                  'Refresh Interval',
                  localPrefs.display.autoRefreshIntervalSeconds,
                  (val) => updateNestedLocal('display', 'autoRefreshIntervalSeconds', val),
                  'sec',
                  30,
                  3600
                )
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {hasChanges && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setLocalPrefs(alertPreferences || DEFAULT_ALERT_PREFERENCES);
              setHasChanges(false);
            }}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            <CheckCircle size={18} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    resetButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    sectionTitleContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    sectionDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    subsectionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    inputLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    numberInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    numberInput: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      width: 70,
      textAlign: 'center' as const,
    },
    inputSuffix: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 8,
      width: 40,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    toggleLeft: {
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontSize: 14,
      color: colors.text,
    },
    toggleDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    thresholdRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    severityIndicator: {
      width: 4,
      height: 32,
      borderRadius: 2,
      marginRight: 12,
    },
    channelRow: {
      flexDirection: 'row',
      gap: 8,
    },
    channelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    channelLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    digestRow: {
      flexDirection: 'row',
      gap: 8,
    },
    digestOption: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
    },
    digestLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    quietHoursContainer: {
      marginLeft: 12,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    timeLabel: {
      fontSize: 14,
      color: colors.text,
    },
    timeInput: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      width: 90,
      textAlign: 'center' as const,
    },
    escalateToRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    severityPicker: {
      flexDirection: 'row',
      gap: 8,
    },
    severityOption: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    severityOptionLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    sortRow: {
      flexDirection: 'row',
      flexWrap: 'wrap' as const,
      gap: 8,
    },
    sortOption: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    sortLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    sortOrderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      marginTop: 8,
    },
    sortOrderPicker: {
      flexDirection: 'row',
      gap: 8,
    },
    sortOrderOption: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    sortOrderLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    badgeTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    badgeTypePicker: {
      flexDirection: 'row',
      gap: 6,
    },
    badgeTypeOption: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    badgeTypeLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    categoryBulkActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    bulkActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bulkActionText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    categoryCountInfo: {
      marginBottom: 12,
    },
    categoryCountText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap' as const,
      gap: 8,
      marginBottom: 12,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
      gap: 8,
    },
    categoryIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    categoryChipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    categoryHint: {
      fontSize: 12,
      color: colors.textTertiary,
      fontStyle: 'italic' as const,
    },
    thresholdModeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 4,
    },
    thresholdModeOption: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    thresholdModeLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 4,
    },
    thresholdModeDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 14,
    },
    saveBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 2,
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
  });
