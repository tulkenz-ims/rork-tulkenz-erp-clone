import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, CalendarClock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AuditDate {
  label: string;
  date: Date;
  color: string;
}

interface ComplianceCountdownProps {
  audits?: AuditDate[];
}

function getDaysUntil(target: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyColor(days: number): string {
  if (days < 0) return '#EF4444';
  if (days <= 30) return '#EF4444';
  if (days <= 90) return '#F59E0B';
  return '#10B981';
}

const DEFAULT_AUDITS: AuditDate[] = [
  { label: 'SQF Audit', date: new Date(2026, 5, 15), color: '#3B82F6' },        // June 15, 2026
  { label: 'FSMA Inspection', date: new Date(2026, 8, 1), color: '#8B5CF6' },    // Sep 1, 2026
  { label: 'OSHA Inspection', date: new Date(2026, 10, 1), color: '#F59E0B' },   // Nov 1, 2026
];

export default function ComplianceCountdown({ audits = DEFAULT_AUDITS }: ComplianceCountdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ShieldCheck size={16} color="#10B981" />
          <Text style={styles.title}>Compliance</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        {audits.map((audit, idx) => {
          const days = getDaysUntil(audit.date);
          const urgency = getUrgencyColor(days);
          const isPast = days < 0;

          return (
            <View key={idx} style={[styles.card, { borderColor: colors.border }]}>
              <View style={[styles.iconDot, { backgroundColor: audit.color + '20' }]}>
                <CalendarClock size={14} color={audit.color} />
              </View>
              <Text style={styles.auditLabel} numberOfLines={1}>{audit.label}</Text>
              <Text style={[styles.countdown, { color: urgency }]}>
                {isPast ? `${Math.abs(days)}d overdue` : `${days}d`}
              </Text>
              <Text style={styles.dateText}>
                {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
});
