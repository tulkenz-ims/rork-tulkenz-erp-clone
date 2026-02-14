import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Package,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDashboardAlertWidget } from '@/hooks/useDashboardAlertWidget';
import * as Haptics from 'expo-haptics';
import type { LowStockAlertSeverity } from '@/constants/mroPartsConstants';

interface AlertSummaryWidgetProps {
  onPress: () => void;
  compact?: boolean;
}

export default function AlertSummaryWidget({ onPress, compact = false }: AlertSummaryWidgetProps) {
  const { colors } = useTheme();
  const alertData = useDashboardAlertWidget();

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  const getSeverityConfig = (severity: LowStockAlertSeverity) => {
    switch (severity) {
      case 'critical':
        return { color: colors.error, icon: AlertTriangle, label: 'Critical' };
      case 'warning':
        return { color: colors.warning, icon: AlertCircle, label: 'Warning' };
      case 'info':
        return { color: colors.info, icon: Info, label: 'Low' };
    }
  };

  if (alertData.totalAlerts === 0) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
        onPress={handlePress}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: colors.successBg }]}>
            <Package size={20} color=colors.success />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Stock Alerts</Text>
            <Text style={[styles.subtitle, { color: colors.success }]}>All Clear</Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          All inventory levels are healthy
        </Text>
      </Pressable>
    );
  }

  if (compact) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compactContainer,
          { 
            backgroundColor: alertData.hasCriticalAlerts ? colors.errorBg : colors.warningBg,
            borderColor: alertData.hasCriticalAlerts ? `${colors.error}40` : `${colors.warning}40`,
          },
          pressed && styles.pressed,
        ]}
        onPress={handlePress}
      >
        <AlertTriangle 
          size={16} 
          color={alertData.hasCriticalAlerts ? colors.error : colors.warning} 
        />
        <Text style={[
          styles.compactText, 
          { color: alertData.hasCriticalAlerts ? colors.error : colors.warning }
        ]}>
          {alertData.totalAlerts} Stock Alert{alertData.totalAlerts !== 1 ? 's' : ''}
        </Text>
        <ChevronRight 
          size={16} 
          color={alertData.hasCriticalAlerts ? colors.error : colors.warning} 
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.errorBg }]}>
          <AlertTriangle size={20} color=colors.error />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Stock Alerts</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {alertData.totalAlerts} item{alertData.totalAlerts !== 1 ? 's' : ''} need attention
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textTertiary} />
      </View>

      <View style={styles.severityRow}>
        {alertData.criticalCount > 0 && (
          <View style={[styles.severityBadge, { backgroundColor: colors.errorBg }]}>
            <AlertTriangle size={12} color=colors.error />
            <Text style={[styles.severityCount, { color: colors.error }]}>
              {alertData.criticalCount}
            </Text>
            <Text style={[styles.severityLabel, { color: colors.error }]}>Critical</Text>
          </View>
        )}
        {alertData.warningCount > 0 && (
          <View style={[styles.severityBadge, { backgroundColor: colors.warningBg }]}>
            <AlertCircle size={12} color=colors.warning />
            <Text style={[styles.severityCount, { color: colors.warning }]}>
              {alertData.warningCount}
            </Text>
            <Text style={[styles.severityLabel, { color: colors.warning }]}>Warning</Text>
          </View>
        )}
        {alertData.infoCount > 0 && (
          <View style={[styles.severityBadge, { backgroundColor: colors.infoBg }]}>
            <Info size={12} color=colors.info />
            <Text style={[styles.severityCount, { color: colors.info }]}>
              {alertData.infoCount}
            </Text>
            <Text style={[styles.severityLabel, { color: colors.info }]}>Low</Text>
          </View>
        )}
      </View>

      {alertData.topAlerts.length > 0 && (
        <View style={[styles.topAlertsSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.topAlertsTitle, { color: colors.textTertiary }]}>
            TOP PRIORITY
          </Text>
          {alertData.topAlerts.slice(0, 3).map((alert) => {
            const config = getSeverityConfig(alert.severity);
            return (
              <View key={alert.id} style={styles.alertItem}>
                <View style={[styles.alertDot, { backgroundColor: config.color }]} />
                <View style={styles.alertInfo}>
                  <Text 
                    style={[styles.alertName, { color: colors.text }]} 
                    numberOfLines={1}
                  >
                    {alert.materialName}
                  </Text>
                  <Text style={[styles.alertSku, { color: colors.textTertiary }]}>
                    {alert.materialSku}
                  </Text>
                </View>
                <View style={styles.alertStock}>
                  <Text style={[styles.alertStockValue, { color: config.color }]}>
                    {alert.currentStock}
                  </Text>
                  <Text style={[styles.alertStockMin, { color: colors.textTertiary }]}>
                    /{alert.minLevel}
                  </Text>
                </View>
              </View>
            );
          })}
          {alertData.topAlerts.length > 3 && (
            <Text style={[styles.moreText, { color: colors.primary }]}>
              +{alertData.topAlerts.length - 3} more items
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center' as const,
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  severityCount: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  severityLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  topAlertsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  topAlertsTitle: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  alertSku: {
    fontSize: 11,
    marginTop: 1,
  },
  alertStock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  alertStockValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  alertStockMin: {
    fontSize: 12,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    marginTop: 6,
  },
});
