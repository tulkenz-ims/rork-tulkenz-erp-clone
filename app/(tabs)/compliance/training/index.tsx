import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrainingComplianceStats, useTrainingSessions, useTrainingCertifications } from '@/hooks/useTraining';

const HUD_BG = '#0a0e1a';
const HUD_CARD = '#0d1117';
const HUD_BORDER = '#1a2332';
const HUD_ACCENT = '#00d4ff';
const HUD_GREEN = '#00ff88';
const HUD_YELLOW = '#ffcc00';
const HUD_RED = '#ff4444';
const HUD_ORANGE = '#ff8800';
const HUD_PURPLE = '#9945ff';
const HUD_TEXT = '#e2e8f0';
const HUD_TEXT_DIM = '#64748b';
const HUD_TEXT_BRIGHT = '#ffffff';

export default function TrainingIndexScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTrainingComplianceStats();
  const { data: activeSessions = [], isLoading: sessionsLoading, refetch: refetchSessions } =
    useTrainingSessions({ status: 'in_progress', limit: 5 });
  const { data: overdueSessions = [], refetch: refetchOverdue } =
    useTrainingSessions({ limit: 5 });
  const { data: expiringCerts = [], refetch: refetchCerts } =
    useTrainingCertifications({ expiringWithinDays: 30, status: 'active' });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchSessions(), refetchOverdue(), refetchCerts()]);
    setRefreshing(false);
  };

  const isLoading = statsLoading || sessionsLoading;

  const navModules = [
    {
      id: 'templates',
      title: 'Template Library',
      subtitle: 'Build & manage training programs',
      icon: 'library-outline' as const,
      color: HUD_ACCENT,
      route: '/(tabs)/compliance/training/template-library',
    },
    {
      id: 'sessions',
      title: 'Session Tracker',
      subtitle: 'Assign & track training progress',
      icon: 'people-outline' as const,
      color: HUD_GREEN,
      route: '/(tabs)/compliance/training/session-tracker',
    },
    {
      id: 'certifications',
      title: 'Certifications',
      subtitle: 'Issued certs & expiration tracking',
      icon: 'ribbon-outline' as const,
      color: HUD_YELLOW,
      route: '/(tabs)/compliance/training/certifications',
    },
    {
      id: 'departments',
      title: 'Department Requirements',
      subtitle: 'Required training by department',
      icon: 'business-outline' as const,
      color: HUD_PURPLE,
      route: '/(tabs)/compliance/training/department-requirements',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return HUD_GREEN;
      case 'in_progress': return HUD_ACCENT;
      case 'assigned': return HUD_YELLOW;
      case 'failed': return HUD_RED;
      case 'pending_evaluation': return HUD_ORANGE;
      default: return HUD_TEXT_DIM;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'IN PROGRESS';
      case 'assigned': return 'ASSIGNED';
      case 'pending_evaluation': return 'PENDING EVAL';
      case 'completed': return 'COMPLETED';
      case 'failed': return 'FAILED';
      default: return status.toUpperCase();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>TRAINING & COMPLIANCE</Text>
          <Text style={styles.headerSub}>SQF 2.9.1 — Training Records</Text>
        </View>
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => router.push('/(tabs)/compliance/training/session-tracker')}
        >
          <Ionicons name="add" size={18} color={HUD_BG} />
          <Text style={styles.assignBtnText}>Assign</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={HUD_ACCENT}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={HUD_ACCENT} />
            <Text style={styles.loadingText}>Loading training data...</Text>
          </View>
        ) : (
          <>
            {/* SQF Compliance Banner */}
            <View style={styles.sqfBanner}>
              <View style={styles.sqfBannerLeft}>
                <Ionicons name="shield-checkmark" size={16} color={HUD_GREEN} />
                <Text style={styles.sqfBannerText}>SQF Edition 10 — Clause 2.9.1</Text>
              </View>
              <Text style={styles.sqfBannerSub}>Training Records Active</Text>
            </View>

            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderColor: HUD_ACCENT }]}>
                <Text style={[styles.kpiValue, { color: HUD_ACCENT }]}>
                  {stats?.activeSessions ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>ACTIVE</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: HUD_GREEN }]}>
                <Text style={[styles.kpiValue, { color: HUD_GREEN }]}>
                  {stats?.completedSessions ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>COMPLETED</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: HUD_RED }]}>
                <Text style={[styles.kpiValue, { color: HUD_RED }]}>
                  {stats?.overdueSessions ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>OVERDUE</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: HUD_YELLOW }]}>
                <Text style={[styles.kpiValue, { color: HUD_YELLOW }]}>
                  {stats?.activeCertifications ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>CERTS</Text>
              </View>
            </View>

            {/* Alert Strip */}
            {(stats?.overdueSessions ?? 0) > 0 || (stats?.expiringCertifications ?? 0) > 0 ? (
              <View style={styles.alertStrip}>
                {(stats?.overdueSessions ?? 0) > 0 && (
                  <View style={styles.alertItem}>
                    <Ionicons name="warning" size={14} color={HUD_RED} />
                    <Text style={styles.alertText}>
                      {stats?.overdueSessions} overdue training session{(stats?.overdueSessions ?? 0) > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {(stats?.expiringCertifications ?? 0) > 0 && (
                  <View style={styles.alertItem}>
                    <Ionicons name="time-outline" size={14} color={HUD_YELLOW} />
                    <Text style={styles.alertText}>
                      {stats?.expiringCertifications} cert{(stats?.expiringCertifications ?? 0) > 1 ? 's' : ''} expiring within 30 days
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Navigation Modules */}
            <Text style={styles.sectionLabel}>MODULES</Text>
            <View style={styles.moduleGrid}>
              {navModules.map(mod => (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.moduleCard}
                  onPress={() => router.push(mod.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.moduleIconWrap, { backgroundColor: mod.color + '22' }]}>
                    <Ionicons name={mod.icon} size={24} color={mod.color} />
                  </View>
                  <Text style={styles.moduleTitle}>{mod.title}</Text>
                  <Text style={styles.moduleSub}>{mod.subtitle}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={HUD_TEXT_DIM}
                    style={styles.moduleChevron}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>IN PROGRESS</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/compliance/training/session-tracker' as any)}
                  >
                    <Text style={styles.sectionLink}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.card}>
                  {activeSessions.map((session, index) => (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.sessionRow,
                        index < activeSessions.length - 1 && styles.sessionRowBorder,
                      ]}
                      onPress={() =>
                        router.push(`/(tabs)/compliance/training/session/${session.id}` as any)
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.sessionLeft}>
                        <Text style={styles.sessionName}>{session.employee_name}</Text>
                        <Text style={styles.sessionTemplate}>{session.template_title}</Text>
                        <Text style={styles.sessionMeta}>
                          {session.session_number}
                          {session.department_name ? ` · ${session.department_name}` : ''}
                        </Text>
                      </View>
                      <View style={styles.sessionRight}>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(session.status) + '22' }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: getStatusColor(session.status) }
                          ]}>
                            {getStatusLabel(session.status)}
                          </Text>
                        </View>
                        {session.ojt_steps_total > 0 && (
                          <Text style={styles.progressText}>
                            {session.ojt_steps_completed}/{session.ojt_steps_total} steps
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Expiring Certifications */}
            {expiringCerts.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>CERTS EXPIRING SOON</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/compliance/training/certifications' as any)}
                  >
                    <Text style={styles.sectionLink}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.card}>
                  {expiringCerts.map((cert, index) => {
                    const daysLeft = cert.expiration_date
                      ? Math.ceil(
                          (new Date(cert.expiration_date).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : null;
                    return (
                      <View
                        key={cert.id}
                        style={[
                          styles.sessionRow,
                          index < expiringCerts.length - 1 && styles.sessionRowBorder,
                        ]}
                      >
                        <View style={styles.sessionLeft}>
                          <Text style={styles.sessionName}>{cert.employee_name}</Text>
                          <Text style={styles.sessionTemplate}>{cert.certification_name}</Text>
                          <Text style={styles.sessionMeta}>{cert.certification_number}</Text>
                        </View>
                        <View style={styles.sessionRight}>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: HUD_YELLOW + '22' }
                          ]}>
                            <Text style={[styles.statusText, { color: HUD_YELLOW }]}>
                              {daysLeft !== null ? `${daysLeft}d LEFT` : 'EXPIRING'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Empty State */}
            {!isLoading &&
              activeSessions.length === 0 &&
              expiringCerts.length === 0 &&
              (stats?.totalSessions ?? 0) === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={48} color={HUD_TEXT_DIM} />
                <Text style={styles.emptyTitle}>No Training Sessions Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start by building a training template, then assign it to employees.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(tabs)/compliance/training/template-library' as any)}
                >
                  <Text style={styles.emptyBtnText}>Build First Template</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HUD_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: HUD_CARD,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: HUD_ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 11,
    color: HUD_ACCENT,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: HUD_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  loadingText: {
    color: HUD_TEXT_DIM,
    fontSize: 14,
  },
  sqfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: HUD_GREEN + '15',
    borderWidth: 1,
    borderColor: HUD_GREEN + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sqfBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sqfBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: HUD_GREEN,
    letterSpacing: 0.5,
  },
  sqfBannerSub: {
    fontSize: 11,
    color: HUD_GREEN + 'aa',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiLabel: {
    fontSize: 9,
    color: HUD_TEXT_DIM,
    letterSpacing: 1,
    marginTop: 2,
    fontWeight: '600',
  },
  alertStrip: {
    backgroundColor: HUD_RED + '11',
    borderWidth: 1,
    borderColor: HUD_RED + '33',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 6,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertText: {
    fontSize: 12,
    color: HUD_TEXT,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HUD_TEXT_DIM,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLink: {
    fontSize: 12,
    color: HUD_ACCENT,
    fontWeight: '600',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  moduleCard: {
    width: '47.5%',
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    position: 'relative',
  },
  moduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    marginBottom: 4,
  },
  moduleSub: {
    fontSize: 11,
    color: HUD_TEXT_DIM,
    lineHeight: 15,
  },
  moduleChevron: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  card: {
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  sessionLeft: {
    flex: 1,
    marginRight: 12,
  },
  sessionName: {
    fontSize: 13,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    marginBottom: 2,
  },
  sessionTemplate: {
    fontSize: 12,
    color: HUD_TEXT,
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: 11,
    color: HUD_TEXT_DIM,
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressText: {
    fontSize: 10,
    color: HUD_TEXT_DIM,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: HUD_TEXT_DIM,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyBtn: {
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: HUD_BG,
  },
});
