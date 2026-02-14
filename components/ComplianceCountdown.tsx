import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, CalendarClock, Rocket, Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AuditDate {
  label: string;
  date: Date;
  color: string;
}

interface ComplianceCountdownProps {
  audits?: AuditDate[];
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // total ms
}

function getTimeLeft(target: Date): TimeLeft {
  const now = new Date().getTime();
  const t = new Date(target).getTime();
  const diff = t - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: diff };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function getUrgencyColor(days: number, total: number): string {
  if (total <= 0) return '#8B5CF6';
  if (days <= 1) return '#8B5CF6';
  if (days <= 30) return '#EF4444';
  if (days <= 90) return '#F59E0B';
  return '#10B981';
}

const GO_TIME_MESSAGES = [
  { text: "It's Go Time!", sub: "We're ready. We've got this." },
  { text: "All Ducks in a Row", sub: "Prepared. Confident. Let's do this." },
  { text: "Bring It On!", sub: "Every checklist complete. Every team aligned." },
];

const DEFAULT_AUDITS: AuditDate[] = [
  { label: 'SQF Audit', date: new Date(2026, 1, 15, 9, 0, 0), color: '#3B82F6' },      // Feb 15, 2026 9am
  { label: 'FSMA Inspection', date: new Date(2026, 8, 1, 9, 0, 0), color: '#8B5CF6' },  // Sep 1, 2026
  { label: 'OSHA Inspection', date: new Date(2026, 10, 1, 9, 0, 0), color: '#F59E0B' },  // Nov 1, 2026
];

export default function ComplianceCountdown({ audits = DEFAULT_AUDITS }: ComplianceCountdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ShieldCheck size={16} color="#10B981" />
          <Text style={styles.title}>Compliance Countdown</Text>
        </View>
      </View>
      <View style={styles.cardColumn}>
        {audits.map((audit, idx) => {
          const tl = getTimeLeft(audit.date);
          const urgency = getUrgencyColor(tl.days, tl.total);
          const isGoTime = tl.days <= 1 && tl.total > 0;
          const isPast = tl.total <= 0;
          const isToday = tl.days === 0 && tl.total > 0;
          const msg = GO_TIME_MESSAGES[idx % GO_TIME_MESSAGES.length];

          if (isPast || isGoTime || isToday) {
            return (
              <View key={idx} style={[styles.goTimeCard, { borderColor: audit.color + '60' }]}>
                <View style={styles.goTimeInner}>
                  <View style={[styles.goTimeIconBg, { backgroundColor: audit.color + '20' }]}>
                    <Rocket size={22} color={audit.color} />
                  </View>
                  <View style={styles.goTimeTextWrap}>
                    <Text style={[styles.goTimeLabel, { color: colors.textSecondary }]}>{audit.label}</Text>
                    <Text style={[styles.goTimeHeadline, { color: audit.color }]}>{isPast ? "Complete!" : msg.text}</Text>
                    <Text style={[styles.goTimeSub, { color: colors.textSecondary }]}>
                      {isPast 
                        ? "This audit window has passed."
                        : msg.sub}
                    </Text>
                  </View>
                  <Star size={16} color={audit.color} style={{ opacity: 0.4 }} />
                </View>
                <Text style={styles.goTimeDateLine}>
                  {audit.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {isToday ? '  ·  TODAY' : isPast ? '' : '  ·  TOMORROW'}
                </Text>
              </View>
            );
          }

          return (
            <View key={idx} style={[styles.card, { borderColor: colors.border }]}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconDot, { backgroundColor: audit.color + '20' }]}>
                  <CalendarClock size={14} color={audit.color} />
                </View>
                <View style={styles.labelWrap}>
                  <Text style={styles.auditLabel}>{audit.label}</Text>
                  <Text style={styles.dateText}>
                    {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={styles.timerWrap}>
                <View style={styles.timerSegments}>
                  <View style={styles.segment}>
                    <Text style={[styles.timerNum, { color: urgency }]}>{tl.days}</Text>
                    <Text style={styles.timerUnit}>days</Text>
                  </View>
                  <Text style={[styles.timerColon, { color: urgency }]}>:</Text>
                  <View style={styles.segment}>
                    <Text style={[styles.timerNum, { color: urgency }]}>{String(tl.hours).padStart(2, '0')}</Text>
                    <Text style={styles.timerUnit}>hrs</Text>
                  </View>
                  <Text style={[styles.timerColon, { color: urgency }]}>:</Text>
                  <View style={styles.segment}>
                    <Text style={[styles.timerNum, { color: urgency }]}>{String(tl.minutes).padStart(2, '0')}</Text>
                    <Text style={styles.timerUnit}>min</Text>
                  </View>
                  <Text style={[styles.timerColon, { color: urgency }]}>:</Text>
                  <View style={styles.segment}>
                    <Text style={[styles.timerNum, { color: urgency }]}>{String(tl.seconds).padStart(2, '0')}</Text>
                    <Text style={styles.timerUnit}>sec</Text>
                  </View>
                </View>
              </View>
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
  cardColumn: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelWrap: {
    gap: 2,
  },
  auditLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dateText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  timerWrap: {
    alignItems: 'flex-end',
  },
  timerSegments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  segment: {
    alignItems: 'center',
    minWidth: 28,
  },
  timerNum: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  timerUnit: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '500',
    marginTop: -2,
  },
  timerColon: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: -8,
  },

  // Go Time Card
  goTimeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
  },
  goTimeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goTimeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goTimeTextWrap: {
    flex: 1,
    gap: 2,
  },
  goTimeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  goTimeHeadline: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  goTimeSub: {
    fontSize: 12,
  },
  goTimeDateLine: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
