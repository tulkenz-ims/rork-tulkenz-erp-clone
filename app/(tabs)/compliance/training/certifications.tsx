import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useTrainingCertifications,
  useIssueCertification,
  useRevokeCertification,
  TrainingCertification,
} from '@/hooks/useTraining';

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

const STATUS_FILTERS = ['all', 'active', 'expired', 'expiring', 'revoked'];

const DEPARTMENTS = [
  { code: '1001', name: 'Maintenance' },
  { code: '1002', name: 'Sanitation' },
  { code: '1003', name: 'Production' },
  { code: '1004', name: 'Quality' },
  { code: '1005', name: 'Safety' },
];

const SOURCES = [
  { value: 'ojt', label: 'OJT' },
  { value: 'rippling', label: 'Rippling' },
  { value: 'external', label: 'External' },
  { value: 'classroom', label: 'Classroom' },
];

export default function CertificationsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [detailCert, setDetailCert] = useState<TrainingCertification | null>(null);
  const [issueModal, setIssueModal] = useState(false);
  const [revokeModal, setRevokeModal] = useState<TrainingCertification | null>(null);
  const [revokeNotes, setRevokeNotes] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Issue manual cert form
  const [certName, setCertName] = useState('');
  const [certEmployeeName, setCertEmployeeName] = useState('');
  const [certEmployeeCode, setCertEmployeeCode] = useState('');
  const [certDeptCode, setCertDeptCode] = useState('');
  const [certSource, setCertSource] = useState('external');
  const [certIssuedDate, setCertIssuedDate] = useState('');
  const [certExpirationDate, setCertExpirationDate] = useState('');
  const [certIsLifetime, setCertIsLifetime] = useState(false);
  const [certIssuedBy, setCertIssuedBy] = useState('');
  const [certNotes, setCertNotes] = useState('');
  const [certRipplingId, setCertRipplingId] = useState('');
  const [issuing, setIssuing] = useState(false);

  const expiringQuery = statusFilter === 'expiring'
    ? { expiringWithinDays: 30, status: 'active' }
    : statusFilter !== 'all'
    ? { status: statusFilter }
    : undefined;

  const { data: certs = [], isLoading, refetch } = useTrainingCertifications(expiringQuery);
  const issueCert = useIssueCertification();
  const revokeCert = useRevokeCertification();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getDaysUntilExpiry = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const diff = new Date(expirationDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getCertStatus = (cert: TrainingCertification) => {
    if (cert.status === 'revoked') return 'revoked';
    if (cert.status === 'expired') return 'expired';
    if (cert.is_lifetime) return 'active';
    if (!cert.expiration_date) return 'active';
    const days = getDaysUntilExpiry(cert.expiration_date);
    if (days === null) return 'active';
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return HUD_GREEN;
      case 'expiring': return HUD_YELLOW;
      case 'expired': return HUD_RED;
      case 'revoked': return HUD_TEXT_DIM;
      default: return HUD_TEXT_DIM;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'ojt': return HUD_ACCENT;
      case 'rippling': return HUD_YELLOW;
      case 'external': return HUD_PURPLE;
      case 'classroom': return HUD_GREEN;
      default: return HUD_TEXT_DIM;
    }
  };

  const filtered = certs.filter(cert => {
    const certStatus = getCertStatus(cert);
    const matchSearch =
      !search ||
      cert.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      cert.certification_name.toLowerCase().includes(search.toLowerCase()) ||
      cert.certification_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      statusFilter === 'expiring'
        ? certStatus === 'expiring'
        : certStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const activeCount = certs.filter(c => getCertStatus(c) === 'active').length;
  const expiringCount = certs.filter(c => getCertStatus(c) === 'expiring').length;
  const expiredCount = certs.filter(c => getCertStatus(c) === 'expired').length;
  const revokedCount = certs.filter(c => getCertStatus(c) === 'revoked').length;

  const handleIssue = async () => {
    if (!certName.trim()) {
      Alert.alert('Required', 'Certification name is required.');
      return;
    }
    if (!certEmployeeName.trim()) {
      Alert.alert('Required', 'Employee name is required.');
      return;
    }
    if (!certIssuedDate.trim()) {
      Alert.alert('Required', 'Issue date is required.');
      return;
    }
    if (!certIsLifetime && !certExpirationDate.trim()) {
      Alert.alert('Required', 'Expiration date is required unless lifetime certification.');
      return;
    }
    if (!certIssuedBy.trim()) {
      Alert.alert('Required', 'Issued by is required.');
      return;
    }

    setIssuing(true);
    try {
      const deptName = DEPARTMENTS.find(d => d.code === certDeptCode)?.name;
      await issueCert.mutateAsync({
        employee_id: `emp_manual_${Date.now()}`,
        employee_name: certEmployeeName.trim(),
        employee_code: certEmployeeCode.trim() || null,
        department_code: certDeptCode || null,
        department_name: deptName || null,
        template_id: null,
        session_id: null,
        certification_name: certName.trim(),
        issued_date: certIssuedDate.trim(),
        expiration_date: certIsLifetime ? null : certExpirationDate.trim(),
        is_lifetime: certIsLifetime,
        status: 'active',
        source: certSource as any,
        issued_by: certIssuedBy.trim(),
        issued_by_id: null,
        certificate_url: null,
        rippling_certification_id: certRipplingId.trim() || null,
        superseded_by_id: null,
        notes: certNotes.trim() || null,
      });
      setIssueModal(false);
      resetIssueForm();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to issue certification.');
    } finally {
      setIssuing(false);
    }
  };

  const resetIssueForm = () => {
    setCertName('');
    setCertEmployeeName('');
    setCertEmployeeCode('');
    setCertDeptCode('');
    setCertSource('external');
    setCertIssuedDate('');
    setCertExpirationDate('');
    setCertIsLifetime(false);
    setCertIssuedBy('');
    setCertNotes('');
    setCertRipplingId('');
  };

  const handleRevoke = async () => {
    if (!revokeModal) return;
    setRevoking(true);
    try {
      await revokeCert.mutateAsync({
        certId: revokeModal.id,
        notes: revokeNotes.trim() || 'Revoked by administrator.',
      });
      setRevokeModal(null);
      setDetailCert(null);
      setRevokeNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to revoke certification.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CERTIFICATIONS</Text>
          <Text style={styles.headerSub}>Personnel training certifications</Text>
        </View>
        <TouchableOpacity
          style={styles.issueBtn}
          onPress={() => setIssueModal(true)}
        >
          <Ionicons name="add" size={18} color={HUD_BG} />
          <Text style={styles.issueBtnText}>Issue</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_ACCENT} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, { borderColor: HUD_GREEN }]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.kpiValue, { color: HUD_GREEN }]}>{activeCount}</Text>
            <Text style={styles.kpiLabel}>ACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.kpiCard, { borderColor: HUD_YELLOW }]}
            onPress={() => setStatusFilter('expiring')}
          >
            <Text style={[styles.kpiValue, { color: HUD_YELLOW }]}>{expiringCount}</Text>
            <Text style={styles.kpiLabel}>EXPIRING</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.kpiCard, { borderColor: HUD_RED }]}
            onPress={() => setStatusFilter('expired')}
          >
            <Text style={[styles.kpiValue, { color: HUD_RED }]}>{expiredCount}</Text>
            <Text style={styles.kpiLabel}>EXPIRED</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.kpiCard, { borderColor: HUD_TEXT_DIM }]}
            onPress={() => setStatusFilter('revoked')}
          >
            <Text style={[styles.kpiValue, { color: HUD_TEXT_DIM }]}>{revokedCount}</Text>
            <Text style={styles.kpiLabel}>REVOKED</Text>
          </TouchableOpacity>
        </View>

        {/* Alert Strip */}
        {expiringCount > 0 && (
          <View style={styles.alertStrip}>
            <Ionicons name="time-outline" size={14} color={HUD_YELLOW} />
            <Text style={styles.alertText}>
              {expiringCount} certification{expiringCount > 1 ? 's' : ''} expiring within 30 days
            </Text>
            <TouchableOpacity onPress={() => setStatusFilter('expiring')}>
              <Text style={styles.alertLink}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={HUD_TEXT_DIM} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee, certification..."
            placeholderTextColor={HUD_TEXT_DIM}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={HUD_TEXT_DIM} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterStrip}
          contentContainerStyle={styles.filterStripContent}
        >
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[
                styles.filterChipText,
                statusFilter === f && styles.filterChipTextActive,
              ]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Certs List */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={HUD_ACCENT} />
            <Text style={styles.loadingText}>Loading certifications...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={48} color={HUD_TEXT_DIM} />
            <Text style={styles.emptyTitle}>No Certifications Found</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different search term.'
                : 'Certifications are issued when employees complete training sessions.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setIssueModal(true)}
            >
              <Text style={styles.emptyBtnText}>Issue Manual Certification</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {filtered.length} certification{filtered.length !== 1 ? 's' : ''}
            </Text>
            {filtered.map(cert => {
              const certStatus = getCertStatus(cert);
              const statusColor = getStatusColor(certStatus);
              const sourceColor = getSourceColor(cert.source);
              const daysLeft = getDaysUntilExpiry(cert.expiration_date);

              return (
                <TouchableOpacity
                  key={cert.id}
                  style={[
                    styles.certCard,
                    certStatus === 'expiring' && styles.certCardWarning,
                    certStatus === 'expired' && styles.certCardDanger,
                  ]}
                  onPress={() => setDetailCert(cert)}
                  activeOpacity={0.8}
                >
                  {/* Left accent */}
                  <View style={[styles.certAccent, { backgroundColor: statusColor }]} />

                  <View style={styles.certBody}>
                    {/* Header Row */}
                    <View style={styles.certHeader}>
                      <View style={styles.certHeaderLeft}>
                        <View style={[
                          styles.sourceBadge,
                          { backgroundColor: sourceColor + '22', borderColor: sourceColor + '44' }
                        ]}>
                          <Text style={[styles.sourceBadgeText, { color: sourceColor }]}>
                            {cert.source.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: statusColor + '22' }
                        ]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {certStatus.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.certNumber}>{cert.certification_number}</Text>
                    </View>

                    {/* Cert Name + Employee */}
                    <Text style={styles.certName}>{cert.certification_name}</Text>
                    <Text style={styles.certEmployee}>{cert.employee_name}</Text>

                    {/* Meta */}
                    <View style={styles.certMeta}>
                      {cert.department_name && (
                        <View style={styles.metaChip}>
                          <Ionicons name="business-outline" size={10} color={HUD_TEXT_DIM} />
                          <Text style={styles.metaChipText}>{cert.department_name}</Text>
                        </View>
                      )}
                      <View style={styles.metaChip}>
                        <Ionicons name="calendar-outline" size={10} color={HUD_TEXT_DIM} />
                        <Text style={styles.metaChipText}>
                          Issued: {new Date(cert.issued_date).toLocaleDateString()}
                        </Text>
                      </View>
                      {cert.issued_by && (
                        <View style={styles.metaChip}>
                          <Ionicons name="person-outline" size={10} color={HUD_TEXT_DIM} />
                          <Text style={styles.metaChipText}>{cert.issued_by}</Text>
                        </View>
                      )}
                    </View>

                    {/* Expiration Row */}
                    <View style={styles.expiryRow}>
                      {cert.is_lifetime ? (
                        <View style={styles.lifetimeBadge}>
                          <Ionicons name="infinite-outline" size={12} color={HUD_GREEN} />
                          <Text style={styles.lifetimeText}>Lifetime Certification</Text>
                        </View>
                      ) : cert.expiration_date ? (
                        <>
                          <Text style={[styles.expiryDate, { color: statusColor }]}>
                            Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                          </Text>
                          {daysLeft !== null && (
                            <Text style={[styles.daysLeft, { color: statusColor }]}>
                              {daysLeft < 0
                                ? `${Math.abs(daysLeft)}d overdue`
                                : daysLeft === 0
                                ? 'Expires today'
                                : `${daysLeft}d left`}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.expiryDate}>No expiration set</Text>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={HUD_TEXT_DIM}
                    style={styles.certChevron}
                  />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── CERT DETAIL MODAL ── */}
      <Modal
        visible={!!detailCert}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailCert(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailClose}
                onPress={() => setDetailCert(null)}
              >
                <Ionicons name="close" size={20} color={HUD_TEXT_DIM} />
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Certification Detail</Text>
              <View style={{ width: 32 }} />
            </View>

            {detailCert && (() => {
              const certStatus = getCertStatus(detailCert);
              const statusColor = getStatusColor(certStatus);
              const daysLeft = getDaysUntilExpiry(detailCert.expiration_date);

              return (
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Cert Hero */}
                  <View style={[
                    styles.certHero,
                    { borderColor: statusColor + '44', backgroundColor: statusColor + '11' }
                  ]}>
                    <View style={[
                      styles.certHeroIcon,
                      { backgroundColor: statusColor + '22' }
                    ]}>
                      <Ionicons name="ribbon" size={32} color={statusColor} />
                    </View>
                    <Text style={styles.certHeroName}>{detailCert.certification_name}</Text>
                    <Text style={styles.certHeroEmployee}>{detailCert.employee_name}</Text>
                    <View style={[
                      styles.certHeroStatus,
                      { backgroundColor: statusColor + '22' }
                    ]}>
                      <Text style={[styles.certHeroStatusText, { color: statusColor }]}>
                        {certStatus.toUpperCase()}
                        {daysLeft !== null && certStatus === 'expiring'
                          ? ` — ${daysLeft}d left`
                          : daysLeft !== null && certStatus === 'expired'
                          ? ` — ${Math.abs(daysLeft)}d ago`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Detail Rows */}
                  <View style={styles.detailCard}>
                    {[
                      { label: 'Cert Number', value: detailCert.certification_number },
                      { label: 'Employee', value: detailCert.employee_name },
                      { label: 'Employee Code', value: detailCert.employee_code || 'N/A' },
                      { label: 'Department', value: detailCert.department_name || 'N/A' },
                      { label: 'Source', value: detailCert.source.toUpperCase() },
                      { label: 'Issued By', value: detailCert.issued_by || 'N/A' },
                      {
                        label: 'Issue Date',
                        value: new Date(detailCert.issued_date).toLocaleDateString(),
                      },
                      {
                        label: 'Expiration',
                        value: detailCert.is_lifetime
                          ? 'Lifetime'
                          : detailCert.expiration_date
                          ? new Date(detailCert.expiration_date).toLocaleDateString()
                          : 'Not set',
                      },
                    ].map(row => (
                      <View key={row.label} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{row.label}</Text>
                        <Text style={styles.detailValue}>{row.value}</Text>
                      </View>
                    ))}
                    {detailCert.rippling_certification_id && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Rippling ID</Text>
                        <Text style={[styles.detailValue, { color: HUD_YELLOW }]}>
                          {detailCert.rippling_certification_id}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Training Links */}
                  {(detailCert.session_id || detailCert.template_id) && (
                    <View style={styles.linkCard}>
                      <Text style={styles.linkCardTitle}>TRAINING RECORD</Text>
                      {detailCert.session_id && (
                        <TouchableOpacity
                          style={styles.linkRow}
                          onPress={() => {
                            setDetailCert(null);
                            router.push(
                              `/(tabs)/compliance/training/session-tracker` as any
                            );
                          }}
                        >
                          <Ionicons name="people-outline" size={16} color={HUD_ACCENT} />
                          <Text style={styles.linkText}>View Training Session</Text>
                          <Ionicons name="chevron-forward" size={14} color={HUD_TEXT_DIM} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Notes */}
                  {detailCert.notes && (
                    <View style={styles.notesCard}>
                      <Text style={styles.notesLabel}>NOTES</Text>
                      <Text style={styles.notesText}>{detailCert.notes}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  {detailCert.status !== 'revoked' && (
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => {
                        setRevokeModal(detailCert);
                        setDetailCert(null);
                      }}
                    >
                      <Ionicons name="ban-outline" size={16} color={HUD_RED} />
                      <Text style={styles.revokeBtnText}>Revoke Certification</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ height: 40 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── ISSUE MANUAL CERT MODAL ── */}
      <Modal
        visible={issueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIssueModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailClose}
                onPress={() => setIssueModal(false)}
              >
                <Ionicons name="close" size={20} color={HUD_TEXT_DIM} />
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Issue Certification</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.issueNote}>
                Use this to manually issue certifications earned outside of a TulKenz OPS
                training session — such as Rippling completions, external courses, or
                legacy certifications.
              </Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Certification Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={certName}
                  onChangeText={setCertName}
                  placeholder="e.g. Certified Forklift Operator"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Employee Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={certEmployeeName}
                  onChangeText={setCertEmployeeName}
                  placeholder="Full name"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Employee Code</Text>
                <TextInput
                  style={styles.input}
                  value={certEmployeeCode}
                  onChangeText={setCertEmployeeCode}
                  placeholder="e.g. EMP-001"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Department</Text>
                <View style={styles.deptGrid}>
                  {DEPARTMENTS.map(dept => (
                    <TouchableOpacity
                      key={dept.code}
                      style={[
                        styles.deptChip,
                        certDeptCode === dept.code && styles.deptChipActive,
                      ]}
                      onPress={() =>
                        setCertDeptCode(certDeptCode === dept.code ? '' : dept.code)
                      }
                    >
                      <Text style={[
                        styles.deptChipText,
                        certDeptCode === dept.code && styles.deptChipTextActive,
                      ]}>
                        {dept.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Source</Text>
                <View style={styles.sourceGrid}>
                  {SOURCES.map(s => (
                    <TouchableOpacity
                      key={s.value}
                      style={[
                        styles.sourceChip,
                        certSource === s.value && {
                          backgroundColor: getSourceColor(s.value) + '22',
                          borderColor: getSourceColor(s.value),
                        },
                      ]}
                      onPress={() => setCertSource(s.value)}
                    >
                      <Text style={[
                        styles.sourceChipText,
                        certSource === s.value && { color: getSourceColor(s.value) },
                      ]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {certSource === 'rippling' && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Rippling Certification ID</Text>
                  <TextInput
                    style={styles.input}
                    value={certRipplingId}
                    onChangeText={setCertRipplingId}
                    placeholder="e.g. rpl_cert_abc123"
                    placeholderTextColor={HUD_TEXT_DIM}
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Issued By <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={certIssuedBy}
                  onChangeText={setCertIssuedBy}
                  placeholder="Name or organization"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Issue Date <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={certIssuedDate}
                  onChangeText={setCertIssuedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>Lifetime Certification</Text>
                  <Text style={styles.switchHint}>No expiration date required</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    certIsLifetime && styles.toggleActive,
                  ]}
                  onPress={() => setCertIsLifetime(!certIsLifetime)}
                >
                  <View style={[
                    styles.toggleThumb,
                    certIsLifetime && styles.toggleThumbActive,
                  ]} />
                </TouchableOpacity>
              </View>

              {!certIsLifetime && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    Expiration Date <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={certExpirationDate}
                    onChangeText={setCertExpirationDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={HUD_TEXT_DIM}
                  />
                </View>
              )}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={certNotes}
                  onChangeText={setCertNotes}
                  placeholder="Course provider, license number, or other details..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.issueLargeBtn}
                onPress={handleIssue}
                disabled={issuing}
              >
                {issuing ? (
                  <ActivityIndicator size="small" color={HUD_BG} />
                ) : (
                  <Text style={styles.issueLargeBtnText}>Issue Certification</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── REVOKE CONFIRM MODAL ── */}
      <Modal
        visible={!!revokeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRevokeModal(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="ban" size={32} color={HUD_RED} />
            </View>
            <Text style={styles.confirmTitle}>Revoke Certification?</Text>
            <Text style={styles.confirmMessage}>
              This will revoke{' '}
              <Text style={{ color: HUD_TEXT_BRIGHT }}>
                {revokeModal?.certification_name}
              </Text>{' '}
              for{' '}
              <Text style={{ color: HUD_TEXT_BRIGHT }}>
                {revokeModal?.employee_name}
              </Text>
              . This action cannot be undone.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Reason for Revocation</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={revokeNotes}
                onChangeText={setRevokeNotes}
                placeholder="Reason for revoking this certification..."
                placeholderTextColor={HUD_TEXT_DIM}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setRevokeModal(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRevoke}
                onPress={handleRevoke}
                disabled={revoking}
              >
                {revoking ? (
                  <ActivityIndicator size="small" color={HUD_TEXT_BRIGHT} />
                ) : (
                  <Text style={styles.confirmRevokeText}>Revoke</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD_BG },
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
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD_TEXT_BRIGHT, letterSpacing: 1 },
  headerSub: { fontSize: 11, color: HUD_TEXT_DIM, marginTop: 2 },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_YELLOW,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  issueBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 9, color: HUD_TEXT_DIM, letterSpacing: 1, marginTop: 2, fontWeight: '600' },
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: HUD_YELLOW + '11',
    borderWidth: 1,
    borderColor: HUD_YELLOW + '33',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  alertText: { flex: 1, fontSize: 12, color: HUD_TEXT },
  alertLink: { fontSize: 12, color: HUD_YELLOW, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, height: 40, color: HUD_TEXT, fontSize: 14 },
  filterStrip: { marginBottom: 12 },
  filterStripContent: { gap: 8, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_CARD,
  },
  filterChipActive: { borderColor: HUD_ACCENT, backgroundColor: HUD_ACCENT + '15' },
  filterChipText: { fontSize: 10, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  filterChipTextActive: { color: HUD_ACCENT },
  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: HUD_TEXT_DIM, fontSize: 14 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: HUD_TEXT_DIM, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    backgroundColor: HUD_YELLOW,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  resultsCount: { fontSize: 11, color: HUD_TEXT_DIM, marginBottom: 10, letterSpacing: 0.5 },
  certCard: {
    flexDirection: 'row',
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  certCardWarning: { borderColor: HUD_YELLOW + '44' },
  certCardDanger: { borderColor: HUD_RED + '44' },
  certAccent: { width: 4 },
  certBody: { flex: 1, padding: 12 },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  certHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  sourceBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  certNumber: { fontSize: 10, color: HUD_TEXT_DIM },
  certName: { fontSize: 14, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginBottom: 2 },
  certEmployee: { fontSize: 12, color: HUD_TEXT, marginBottom: 8 },
  certMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HUD_BG,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: HUD_BORDER,
  },
  metaChipText: { fontSize: 10, color: HUD_TEXT_DIM },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: HUD_BORDER,
  },
  expiryDate: { fontSize: 12, color: HUD_TEXT_DIM, fontWeight: '500' },
  daysLeft: { fontSize: 11, fontWeight: '700' },
  lifetimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lifetimeText: { fontSize: 11, color: HUD_GREEN, fontWeight: '600' },
  certChevron: { alignSelf: 'center', marginRight: 10 },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: HUD_CARD,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: HUD_BORDER,
    height: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  detailClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: HUD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: { fontSize: 15, fontWeight: '700', color: HUD_TEXT_BRIGHT },
  detailScroll: { flex: 1 },
  detailScrollContent: { padding: 16 },
  certHero: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  certHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  certHeroName: { fontSize: 17, fontWeight: '700', color: HUD_TEXT_BRIGHT, textAlign: 'center' },
  certHeroEmployee: { fontSize: 13, color: HUD_TEXT, textAlign: 'center' },
  certHeroStatus: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  certHeroStatusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  detailCard: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  detailLabel: { fontSize: 12, color: HUD_TEXT_DIM },
  detailValue: { fontSize: 12, color: HUD_TEXT_BRIGHT, fontWeight: '500' },
  linkCard: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  linkCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: HUD_TEXT_DIM,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: { flex: 1, fontSize: 13, color: HUD_ACCENT, fontWeight: '500' },
  notesCard: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: HUD_TEXT_DIM,
    letterSpacing: 1.5,
  },
  notesText: { fontSize: 13, color: HUD_TEXT, lineHeight: 19 },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_RED + '44',
    backgroundColor: HUD_RED + '11',
    marginTop: 4,
  },
  revokeBtnText: { fontSize: 13, color: HUD_RED, fontWeight: '600' },
  issueNote: {
    fontSize: 12,
    color: HUD_TEXT_DIM,
    lineHeight: 18,
    backgroundColor: HUD_ACCENT + '11',
    borderWidth: 1,
    borderColor: HUD_ACCENT + '22',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  fieldWrap: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  required: { color: HUD_RED },
  input: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: HUD_TEXT,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  deptChipActive: { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT },
  deptChipText: { fontSize: 12, color: HUD_TEXT_DIM, fontWeight: '500' },
  deptChipTextActive: { color: HUD_ACCENT, fontWeight: '700' },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  sourceChipText: { fontSize: 12, color: HUD_TEXT_DIM, fontWeight: '500' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 4,
  },
  switchLabelWrap: { flex: 1, gap: 2 },
  switchLabel: { fontSize: 13, color: HUD_TEXT, fontWeight: '500' },
  switchHint: { fontSize: 11, color: HUD_TEXT_DIM },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: HUD_BORDER,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: HUD_GREEN + '66' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: HUD_TEXT_DIM,
  },
  toggleThumbActive: {
    backgroundColor: HUD_GREEN,
    alignSelf: 'flex-end',
  },
  issueLargeBtn: {
    backgroundColor: HUD_YELLOW,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  issueLargeBtnText: { fontSize: 15, fontWeight: '700', color: HUD_BG },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  confirmModal: {
    backgroundColor: HUD_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HUD_RED + '44',
    padding: 24,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: HUD_RED + '22',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: HUD_TEXT_DIM,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  confirmButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, color: HUD_TEXT, fontWeight: '600' },
  confirmRevoke: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: HUD_RED,
    alignItems: 'center',
  },
  confirmRevokeText: { fontSize: 14, color: HUD_TEXT_BRIGHT, fontWeight: '700' },
});
