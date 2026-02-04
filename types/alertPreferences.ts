export type AlertSeverityLevel = 'critical' | 'warning' | 'info';

export type AlertNotificationChannel = 'in_app' | 'push' | 'email';

export type ThresholdMode = 'percentage' | 'fixed';

export interface AlertThresholdSettings {
  thresholdMode: ThresholdMode;
  criticalThresholdPercent: number;
  warningThresholdPercent: number;
  infoThresholdPercent: number;
  criticalThresholdFixed: number;
  warningThresholdFixed: number;
  infoThresholdFixed: number;
  stockoutDaysThreshold: number;
  useSafetyStockForCritical: boolean;
}

export type BadgeCountType = 'total' | 'critical' | 'unread';

export interface AlertNotificationSettings {
  enabledChannels: AlertNotificationChannel[];
  criticalChannels: AlertNotificationChannel[];
  warningChannels: AlertNotificationChannel[];
  infoChannels: AlertNotificationChannel[];
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  criticalBypassQuietHours: boolean;
  showInAppBanner: boolean;
  inAppBannerDuration: number;
  showBadgeCount: boolean;
  badgeCountType: BadgeCountType;
  clearBadgeOnView: boolean;
  playAlertSound: boolean;
  vibrateOnAlert: boolean;
}

export interface AlertAutoEscalationSettings {
  enabled: boolean;
  escalateAfterHours: number;
  escalateToSeverity: AlertSeverityLevel;
  notifyManagers: boolean;
  managerEmailList: string[];
}

export interface AlertSnoozeSettings {
  defaultSnoozeDurationMinutes: number;
  maxSnoozeDurationHours: number;
  maxSnoozeCount: number;
  snoozeDurationOptions: number[];
}

export interface AlertDisplaySettings {
  showOnDashboard: boolean;
  dashboardMaxAlerts: number;
  defaultSortBy: 'severity' | 'date' | 'material' | 'daysUntilStockout';
  defaultSortOrder: 'asc' | 'desc';
  groupByCategory: boolean;
  groupByFacility: boolean;
  showResolvedAlerts: boolean;
  resolvedAlertRetentionDays: number;
  showAcknowledgedAlerts: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshIntervalSeconds: number;
}

export interface AlertCategoryOverride {
  categoryId: string;
  categoryName: string;
  enabled: boolean;
  criticalThresholdPercent?: number;
  warningThresholdPercent?: number;
  autoEscalate?: boolean;
  notificationChannels?: AlertNotificationChannel[];
}

export interface AlertFacilityOverride {
  facilityId: string;
  facilityName: string;
  enabled: boolean;
  criticalThresholdPercent?: number;
  warningThresholdPercent?: number;
  autoEscalate?: boolean;
  notificationChannels?: AlertNotificationChannel[];
}

export interface AlertPreferences {
  id: string;
  userId?: string;
  isGlobal: boolean;
  thresholds: AlertThresholdSettings;
  notifications: AlertNotificationSettings;
  autoEscalation: AlertAutoEscalationSettings;
  snooze: AlertSnoozeSettings;
  display: AlertDisplaySettings;
  categoryOverrides: AlertCategoryOverride[];
  facilityOverrides: AlertFacilityOverride[];
  enableLowStockAlerts: boolean;
  enableOutOfStockAlerts: boolean;
  enableOverstockAlerts: boolean;
  enableHighConsumptionAlerts: boolean;
  enableLeadTimeAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholdSettings = {
  thresholdMode: 'percentage',
  criticalThresholdPercent: 25,
  warningThresholdPercent: 50,
  infoThresholdPercent: 75,
  criticalThresholdFixed: 10,
  warningThresholdFixed: 25,
  infoThresholdFixed: 50,
  stockoutDaysThreshold: 3,
  useSafetyStockForCritical: true,
};

export const DEFAULT_ALERT_NOTIFICATIONS: AlertNotificationSettings = {
  enabledChannels: ['in_app'],
  criticalChannels: ['in_app', 'push'],
  warningChannels: ['in_app'],
  infoChannels: ['in_app'],
  digestFrequency: 'realtime',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  criticalBypassQuietHours: true,
  showInAppBanner: true,
  inAppBannerDuration: 5,
  showBadgeCount: true,
  badgeCountType: 'critical',
  clearBadgeOnView: true,
  playAlertSound: true,
  vibrateOnAlert: true,
};

export const DEFAULT_ALERT_AUTO_ESCALATION: AlertAutoEscalationSettings = {
  enabled: false,
  escalateAfterHours: 24,
  escalateToSeverity: 'critical',
  notifyManagers: false,
  managerEmailList: [],
};

export const DEFAULT_ALERT_SNOOZE: AlertSnoozeSettings = {
  defaultSnoozeDurationMinutes: 60,
  maxSnoozeDurationHours: 72,
  maxSnoozeCount: 3,
  snoozeDurationOptions: [30, 60, 120, 240, 480, 1440],
};

export const DEFAULT_ALERT_DISPLAY: AlertDisplaySettings = {
  showOnDashboard: true,
  dashboardMaxAlerts: 5,
  defaultSortBy: 'severity',
  defaultSortOrder: 'desc',
  groupByCategory: false,
  groupByFacility: false,
  showResolvedAlerts: false,
  resolvedAlertRetentionDays: 30,
  showAcknowledgedAlerts: true,
  autoRefreshEnabled: true,
  autoRefreshIntervalSeconds: 300,
};

export const DEFAULT_CATEGORY_OVERRIDES: AlertCategoryOverride[] = [
  { categoryId: 'electrical', categoryName: 'Electrical', enabled: true },
  { categoryId: 'plumbing', categoryName: 'Plumbing', enabled: true },
  { categoryId: 'hvac', categoryName: 'HVAC', enabled: true },
  { categoryId: 'mechanical', categoryName: 'Mechanical', enabled: true },
  { categoryId: 'safety', categoryName: 'Safety', enabled: true },
  { categoryId: 'cleaning', categoryName: 'Cleaning', enabled: true },
  { categoryId: 'tools', categoryName: 'Tools', enabled: true },
  { categoryId: 'building', categoryName: 'Building', enabled: true },
  { categoryId: 'consumables', categoryName: 'Consumables', enabled: true },
  { categoryId: 'office', categoryName: 'Office Supplies', enabled: true },
  { categoryId: 'it', categoryName: 'IT Equipment', enabled: true },
  { categoryId: 'medical', categoryName: 'Medical', enabled: true },
];

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  id: 'default-alert-prefs',
  isGlobal: true,
  thresholds: DEFAULT_ALERT_THRESHOLDS,
  notifications: DEFAULT_ALERT_NOTIFICATIONS,
  autoEscalation: DEFAULT_ALERT_AUTO_ESCALATION,
  snooze: DEFAULT_ALERT_SNOOZE,
  display: DEFAULT_ALERT_DISPLAY,
  categoryOverrides: DEFAULT_CATEGORY_OVERRIDES,
  facilityOverrides: [],
  enableLowStockAlerts: true,
  enableOutOfStockAlerts: true,
  enableOverstockAlerts: false,
  enableHighConsumptionAlerts: true,
  enableLeadTimeAlerts: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function createUserAlertPreferences(userId: string, basePrefs?: Partial<AlertPreferences>): AlertPreferences {
  return {
    ...DEFAULT_ALERT_PREFERENCES,
    ...basePrefs,
    id: `alert-prefs-${userId}-${Date.now()}`,
    userId,
    isGlobal: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeAlertPreferences(
  globalPrefs: AlertPreferences,
  userPrefs?: Partial<AlertPreferences>
): AlertPreferences {
  if (!userPrefs) return globalPrefs;
  
  return {
    ...globalPrefs,
    ...userPrefs,
    thresholds: { ...globalPrefs.thresholds, ...userPrefs.thresholds },
    notifications: { ...globalPrefs.notifications, ...userPrefs.notifications },
    autoEscalation: { ...globalPrefs.autoEscalation, ...userPrefs.autoEscalation },
    snooze: { ...globalPrefs.snooze, ...userPrefs.snooze },
    display: { ...globalPrefs.display, ...userPrefs.display },
    categoryOverrides: userPrefs.categoryOverrides?.length 
      ? userPrefs.categoryOverrides 
      : globalPrefs.categoryOverrides,
    facilityOverrides: userPrefs.facilityOverrides?.length 
      ? userPrefs.facilityOverrides 
      : globalPrefs.facilityOverrides,
  };
}

export function getSeverityForStockLevel(
  currentStock: number,
  minLevel: number,
  thresholds: AlertThresholdSettings
): AlertSeverityLevel {
  if (currentStock === 0) return 'critical';
  
  if (thresholds.thresholdMode === 'fixed') {
    if (currentStock <= thresholds.criticalThresholdFixed) return 'critical';
    if (currentStock <= thresholds.warningThresholdFixed) return 'warning';
    if (currentStock <= thresholds.infoThresholdFixed) return 'info';
    return 'info';
  }
  
  const percentOfMin = minLevel > 0 ? (currentStock / minLevel) * 100 : 100;
  
  if (percentOfMin <= thresholds.criticalThresholdPercent) return 'critical';
  if (percentOfMin <= thresholds.warningThresholdPercent) return 'warning';
  return 'info';
}

export function shouldSendNotification(
  severity: AlertSeverityLevel,
  channel: AlertNotificationChannel,
  prefs: AlertNotificationSettings,
  currentTime?: Date
): boolean {
  if (!prefs.enabledChannels.includes(channel)) return false;
  
  const severityChannels = severity === 'critical' 
    ? prefs.criticalChannels 
    : severity === 'warning' 
      ? prefs.warningChannels 
      : prefs.infoChannels;
  
  if (!severityChannels.includes(channel)) return false;
  
  if (prefs.quietHoursEnabled && currentTime) {
    const timeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    const isQuietHours = prefs.quietHoursStart < prefs.quietHoursEnd
      ? timeStr >= prefs.quietHoursStart && timeStr < prefs.quietHoursEnd
      : timeStr >= prefs.quietHoursStart || timeStr < prefs.quietHoursEnd;
    
    if (isQuietHours && !(severity === 'critical' && prefs.criticalBypassQuietHours)) {
      return false;
    }
  }
  
  return true;
}
