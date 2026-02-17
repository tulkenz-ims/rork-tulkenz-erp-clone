import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Play,
  Square,
  Pause,
  RotateCcw,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
  Trash2,
  Info,
  ChevronRight,
  Activity,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProductionRunsQuery,
  useActiveRunsQuery,
  useStartProductionRun,
  useEndProductionRun,
  usePauseProductionRun,
  useResumeProductionRun,
  useUpdateRunCounts,
  ProductionRun,
} from '@/hooks/useProductionRuns';
import { useLocations } from '@/hooks/useLocations';

// ── Tab types ─────────────────────────────────────────────────
type TabId = 'active' | 'history' | 'setup';

export default function ProductionRunsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null);

  // Form state
  const [runNumber, setRunNumber] = useState('');
  const [productionLine, setProductionLine] = useState('Production Line 1');
  const [productName, setProductName] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [wasteCount, setWasteCount] = useState('');
  const [reworkCount, setReworkCount] = useState('');
  const [wasteReason, setWasteReason] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [endNotes, setEndNotes] = useState('');

  // Queries
  const { data: activeRuns = [], isFetching: activeFetching } = useActiveRunsQuery();
  const { data: allRuns = [], isFetching: historyFetching } = useProductionRunsQuery({ limit: 50 });
  const { data: locations = [] } = useLocations();

  // Mutations
  const startRun = useStartProductionRun({
    onSuccess: () => {
      setShowStartModal(false);
      resetStartForm();
      Alert.alert('Run Started', 'Production run is now active. Sensor counts will be tracked.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const endRun = useEndProductionRun({
    onSuccess: () => {
      setShowEndModal(false);
      setSelectedRun(null);
      resetEndForm();
      Alert.alert('Run Completed', 'Production run has been closed with final counts.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const pauseRun = usePauseProductionRun({
    onSuccess: () => Alert.alert('Run Paused', 'Pause time is being tracked.'),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const resumeRun = useResumeProductionRun({
    onSuccess: () => Alert.alert('Run Resumed', 'Production counting resumed.'),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const updateCounts = useUpdateRunCounts({
    onSuccess: () => {
      setShowWasteModal(false);
      setSelectedRun(null);
      resetEndForm();
      Alert.alert('Updated', 'Waste/rework counts updated.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const hygieneRooms = useMemo(() =>
    locations.filter(loc => loc.status === 'active' && (loc as any).hygiene_log_required === true),
    [locations]
  );

  const completedRuns = useMemo(() =>
    allRuns.filter(r => r.status === 'completed'),
    [allRuns]
  );

  function resetStartForm() {
    setRunNumber('');
    setProductionLine('Production Line 1');
    setProductName('');
    setTargetCount('');
  }

  function resetEndForm() {
    setWasteCount('');
    setReworkCount('');
    setWasteReason('');
    setReworkReason('');
    setEndNotes('');
  }

  function handleStartRun() {
    if (!runNumber.trim()) {
      Alert.alert('Required', 'Enter a run number.');
      return;
    }
    startRun.mutate({
      runNumber: runNumber.trim(),
      productionLine,
      productName: productName.trim() || undefined,
      targetCount: targetCount ? parseInt(targetCount) : undefined,
      roomId: hygieneRooms[0]?.id,
      roomName: hygieneRooms[0]?.name,
    });
  }

  function handleEndRun() {
    if (!selectedRun) return;
    endRun.mutate({
      runId: selectedRun.id,
      wasteCount: wasteCount ? parseInt(wasteCount) : 0,
      reworkCount: reworkCount ? parseInt(reworkCount) : 0,
      wasteReason: wasteReason.trim() || undefined,
      reworkReason: reworkReason.trim() || undefined,
      endOfRunNotes: endNotes.trim() || undefined,
    });
  }

  function handleUpdateWaste() {
    if (!selectedRun) return;
    updateCounts.mutate({
      runId: selectedRun.id,
      wasteCount: wasteCount ? parseInt(wasteCount) : 0,
      reworkCount: reworkCount ? parseInt(reworkCount) : 0,
      wasteReason: wasteReason.trim() || undefined,
      reworkReason: reworkReason.trim() || undefined,
    });
  }

  function formatDuration(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function formatTime(iso?: string) {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(iso?: string) {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString();
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'active', label: 'Active Runs', count: activeRuns.length },
    { id: 'history', label: 'Run History', count: completedRuns.length },
    { id: 'setup', label: 'Setup Guide' },
  ];

  // ── Render ────────────────────────────────────────────────

  const renderActiveRun = (run: ProductionRun) => {
    const progress = run.targetCount > 0 ? Math.min(100, Math.round((run.currentCount / run.targetCount) * 100)) : 0;
    const elapsed = run.startedAt ? Math.round((Date.now() - new Date(run.startedAt).getTime()) / 60000) - run.totalPauseMinutes : 0;

    return (
      <View key={run.id} style={[styles.runCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.runHeader}>
          <View style={styles.runHeaderLeft}>
            <View style={[styles.statusBadge, { backgroundColor: run.status === 'active' ? '#10B981' : '#F59E0B' }]}>
              <Text style={styles.statusText}>{run.status === 'active' ? 'ACTIVE' : 'PAUSED'}</Text>
            </View>
            <Text style={[styles.runNumber, { color: colors.text }]}>Run #{run.runNumber}</Text>
          </View>
          <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>{run.productionLine}</Text>
        </View>

        {run.productName && (
          <Text style={[styles.productName, { color: colors.textSecondary }]}>
            Product: {run.productName}
          </Text>
        )}

        {/* Live Counts */}
        <View style={styles.countsRow}>
          <View style={styles.countBox}>
            <Activity size={16} color="#8B5CF6" />
            <Text style={[styles.countValue, { color: colors.text }]}>{run.currentCount.toLocaleString()}</Text>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Current</Text>
          </View>
          {run.targetCount > 0 && (
            <View style={styles.countBox}>
              <Target size={16} color="#3B82F6" />
              <Text style={[styles.countValue, { color: colors.text }]}>{run.targetCount.toLocaleString()}</Text>
              <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Target</Text>
            </View>
          )}
          <View style={styles.countBox}>
            <Zap size={16} color="#F59E0B" />
            <Text style={[styles.countValue, { color: colors.text }]}>{run.ratePerMinute}</Text>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Per Min</Text>
          </View>
          <View style={styles.countBox}>
            <Clock size={16} color="#10B981" />
            <Text style={[styles.countValue, { color: colors.text }]}>{formatDuration(elapsed)}</Text>
            <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Elapsed</Text>
          </View>
        </View>

        {/* Progress Bar */}
        {run.targetCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? '#10B981' : '#8B5CF6',
              }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress}%</Text>
          </View>
        )}

        {/* Waste/Rework if any */}
        {(run.wasteCount > 0 || run.reworkCount > 0) && (
          <View style={styles.wasteRow}>
            {run.wasteCount > 0 && (
              <View style={[styles.wasteBadge, { backgroundColor: '#EF444420' }]}>
                <Trash2 size={12} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontSize: 12, marginLeft: 4 }}>Waste: {run.wasteCount}</Text>
              </View>
            )}
            {run.reworkCount > 0 && (
              <View style={[styles.wasteBadge, { backgroundColor: '#F59E0B20' }]}>
                <RefreshCw size={12} color="#F59E0B" />
                <Text style={{ color: '#F59E0B', fontSize: 12, marginLeft: 4 }}>Rework: {run.reworkCount}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          {run.status === 'active' ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#F59E0B20' }]}
              onPress={() => pauseRun.mutate({ runId: run.id })}
            >
              <Pause size={16} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', marginLeft: 6, fontWeight: '600' }}>Pause</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#10B98120' }]}
              onPress={() => resumeRun.mutate({ runId: run.id })}
            >
              <Play size={16} color="#10B981" />
              <Text style={{ color: '#10B981', marginLeft: 6, fontWeight: '600' }}>Resume</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#F59E0B20' }]}
            onPress={() => { setSelectedRun(run); setWasteCount(run.wasteCount.toString()); setReworkCount(run.reworkCount.toString()); setWasteReason(run.wasteReason || ''); setReworkReason(run.reworkReason || ''); setShowWasteModal(true); }}
          >
            <Trash2 size={16} color="#F59E0B" />
            <Text style={{ color: '#F59E0B', marginLeft: 6, fontWeight: '600' }}>Waste</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
            onPress={() => { setSelectedRun(run); resetEndForm(); setShowEndModal(true); }}
          >
            <Square size={16} color="#EF4444" />
            <Text style={{ color: '#EF4444', marginLeft: 6, fontWeight: '600' }}>End Run</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderHistoryRow = (run: ProductionRun) => {
    const yieldColor = run.yieldPercentage >= 95 ? '#10B981' : run.yieldPercentage >= 85 ? '#F59E0B' : '#EF4444';
    return (
      <Pressable key={run.id} style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.historyLeft}>
          <Text style={[styles.historyRunNumber, { color: colors.text }]}>#{run.runNumber}</Text>
          <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
            {run.productionLine} {run.productName ? `• ${run.productName}` : ''}
          </Text>
          <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
            {formatDate(run.startedAt)} {formatTime(run.startedAt)} — {formatTime(run.endedAt)} ({formatDuration(run.durationMinutes)})
          </Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={[styles.historyCount, { color: colors.text }]}>{run.currentCount.toLocaleString()}</Text>
          <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>units</Text>
          <View style={styles.yieldRow}>
            {run.wasteCount > 0 && (
              <Text style={{ color: '#EF4444', fontSize: 11 }}>W:{run.wasteCount} </Text>
            )}
            {run.reworkCount > 0 && (
              <Text style={{ color: '#F59E0B', fontSize: 11 }}>R:{run.reworkCount} </Text>
            )}
            <Text style={{ color: yieldColor, fontSize: 12, fontWeight: '700' }}>{run.yieldPercentage}%</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSetupGuide = () => (
    <View style={{ paddingBottom: 40 }}>
      {/* Overview Card */}
      <View style={[styles.guideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.guideBadge, { backgroundColor: '#8B5CF620' }]}>
          <Info size={20} color="#8B5CF6" />
          <Text style={[styles.guideBadgeText, { color: '#8B5CF6' }]}>Sensor-Based Real-Time Counting</Text>
        </View>
        <Text style={[styles.guideText, { color: colors.text }]}>
          This system uses a photoelectric sensor on each production line to count bags, jugs, or packets in real-time.
          Counts are automatically tagged to production runs using the Task Feed's Start Run / End Run workflow.
        </Text>
        <Text style={[styles.guideText, { color: colors.text, marginTop: 8 }]}>
          The sensor doesn't need to know about runs or products — it simply counts units.
          TulKenz OPS knows which run is active on each line and assigns the counts accordingly.
        </Text>
      </View>

      {/* Process Flow */}
      <Text style={[styles.guideHeading, { color: colors.text }]}>How It Works</Text>
      {[
        { step: '1', title: 'Start Run', desc: 'Operator posts "Start Run #XXXXX" in Task Feed, selecting line and product. Creates active run record.' },
        { step: '2', title: 'Sensor Counts', desc: 'Photoelectric sensor detects each unit. ESP32 pushes count to TulKenz OPS every 5-10 seconds via WiFi.' },
        { step: '3', title: 'Live Dashboard', desc: 'This screen shows real-time count, rate per minute, elapsed time, and progress toward target.' },
        { step: '4', title: 'Log Waste/Rework', desc: 'Operator enters waste and rework counts manually at any time. Yield percentage auto-calculates.' },
        { step: '5', title: 'End Run', desc: 'Operator posts "End Run #XXXXX" in Task Feed. Final count, duration, and yield locked in. Auto-logs to Room Hygiene Log.' },
      ].map((item) => (
        <View key={item.step} style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.stepCircle, { backgroundColor: '#8B5CF6' }]}>
            <Text style={styles.stepNum}>{item.step}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
          </View>
        </View>
      ))}

      {/* Equipment */}
      <Text style={[styles.guideHeading, { color: colors.text }]}>Equipment Required (per line)</Text>
      <View style={[styles.guideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.guideCost, { color: '#10B981' }]}>Estimated Total: $150 — $300 per line</Text>
        {[
          { name: 'Photoelectric Sensor', model: 'Omron E3Z-D62 or Banner QS18', cost: '$80-150', desc: 'Detects each bag/unit. No product contact. IP67 washdown safe.' },
          { name: 'ESP32 Microcontroller', model: 'ESP32-WROOM-32 Dev Board', cost: '$10-15', desc: 'Counts pulses, connects to WiFi, pushes data to TulKenz OPS every 5-10 sec.' },
          { name: '24V DC Power Supply', model: 'Mean Well HDR-15-24', cost: '$15-25', desc: 'Powers the sensor. DIN rail or panel mount.' },
          { name: 'IP65 Enclosure', model: 'Food-safe junction box', cost: '$15-30', desc: 'Houses ESP32. Washdown rated for sanitation.' },
          { name: 'Mounting & Wiring', model: 'L-bracket, cable glands, 22AWG', cost: '$20-35', desc: 'Mounts sensor on conveyor frame. Short wire run to ESP32.' },
        ].map((eq, i) => (
          <View key={i} style={[styles.equipRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.equipLeft}>
              <Text style={[styles.equipName, { color: colors.text }]}>{eq.name}</Text>
              <Text style={[styles.equipModel, { color: colors.textSecondary }]}>{eq.model}</Text>
              <Text style={[styles.equipDesc, { color: colors.textSecondary }]}>{eq.desc}</Text>
            </View>
            <Text style={[styles.equipCost, { color: '#8B5CF6' }]}>{eq.cost}</Text>
          </View>
        ))}
      </View>

      {/* Installation */}
      <Text style={[styles.guideHeading, { color: colors.text }]}>Installation Steps</Text>
      <View style={[styles.guideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          'Mount photoelectric sensor on conveyor after Keyence printer, facing the bag path.',
          'Wire sensor to 24V supply (brown=+24V, blue=GND). Signal wire (black) to ESP32 GPIO 34.',
          'Mount ESP32 in IP65 enclosure near sensor. Power via USB or 24V with buck converter.',
          'Flash ESP32 firmware with TulKenz counting program. Configure WiFi + Supabase API key.',
          'Test: pass bags through sensor zone. Verify counts appear on dashboard within 10 seconds.',
          'Create Start/End Run templates in Task Feed. Train operators (15 min).',
        ].map((step, i) => (
          <View key={i} style={[styles.installStep, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={[styles.installNum, { backgroundColor: '#8B5CF620' }]}>
              <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 12 }}>{i + 1}</Text>
            </View>
            <Text style={[styles.installText, { color: colors.text }]}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Food Safety */}
      <Text style={[styles.guideHeading, { color: colors.text }]}>Food Safety</Text>
      <View style={[styles.guideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { icon: CheckCircle, color: '#10B981', text: 'No product contact — sensor uses infrared light only.' },
          { icon: CheckCircle, color: '#10B981', text: 'IP67 sensor + IP65 enclosure withstand washdown.' },
          { icon: CheckCircle, color: '#10B981', text: 'All hardware mounts to conveyor frame, not over product.' },
          { icon: AlertTriangle, color: '#F59E0B', text: 'Add sensor to PM schedule in TulKenz OPS CMMS for SQF compliance.' },
        ].map((item, i) => (
          <View key={i} style={[styles.safetyRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <item.icon size={18} color={item.color} />
            <Text style={[styles.safetyText, { color: colors.text }]}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Scalability */}
      <View style={[styles.guideCard, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF640' }]}>
        <Text style={[styles.scaleTitle, { color: '#8B5CF6' }]}>Scalability</Text>
        <Text style={[styles.guideText, { color: colors.text }]}>
          Add one sensor + ESP32 per additional production line. Software handles unlimited lines.
          Each line operates independently — no shared wiring or controllers needed.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Production Runs</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {activeRuns.length} active {activeRuns.length === 1 ? 'run' : 'runs'}
          </Text>
        </View>
        <Pressable
          style={[styles.startBtn, { backgroundColor: '#8B5CF6' }]}
          onPress={() => { resetStartForm(); setShowStartModal(true); }}
        >
          <Play size={16} color="#FFF" />
          <Text style={styles.startBtnText}>Start Run</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? '#8B5CF6' : colors.textSecondary }]}>
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'active' && (
          <>
            {activeRuns.length === 0 ? (
              <View style={styles.emptyState}>
                <Activity size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active runs</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Start a run from Task Feed or tap "Start Run" above
                </Text>
              </View>
            ) : (
              activeRuns.map(renderActiveRun)
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {completedRuns.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No completed runs</Text>
              </View>
            ) : (
              completedRuns.map(renderHistoryRow)
            )}
          </>
        )}

        {activeTab === 'setup' && renderSetupGuide()}
      </ScrollView>

      {/* ── Start Run Modal ─────────────────────────────── */}
      <Modal visible={showStartModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Start Production Run</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Run Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={runNumber}
              onChangeText={setRunNumber}
              placeholder="e.g. 12234"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Production Line</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={productionLine}
              onChangeText={setProductionLine}
              placeholder="Production Line 1"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Product Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={productName}
              onChangeText={setProductName}
              placeholder="Optional"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Count</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={targetCount}
              onChangeText={setTargetCount}
              placeholder="Optional — expected units"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowStartModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleStartRun}>
                <Play size={16} color="#FFF" />
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Start Run</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── End Run Modal ───────────────────────────────── */}
      <Modal visible={showEndModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>End Run #{selectedRun?.runNumber}</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Current count: {selectedRun?.currentCount.toLocaleString()} units
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Waste Count</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={wasteCount}
              onChangeText={setWasteCount}
              placeholder="Bags that couldn't be used"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Waste Reason</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={wasteReason}
              onChangeText={setWasteReason}
              placeholder="e.g. Seal failure, contamination"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rework Count</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={reworkCount}
              onChangeText={setReworkCount}
              placeholder="Units that need reprocessing"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rework Reason</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={reworkReason}
              onChangeText={setReworkReason}
              placeholder="e.g. Underweight, label misprint"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End of Run Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={endNotes}
              onChangeText={setEndNotes}
              placeholder="Any notes about this run..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowEndModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#EF4444' }]} onPress={handleEndRun}>
                <Square size={16} color="#FFF" />
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>End Run</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Waste/Rework Modal ──────────────────────────── */}
      <Modal visible={showWasteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Update Waste/Rework</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Run #{selectedRun?.runNumber} — {selectedRun?.currentCount.toLocaleString()} total units
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Waste Count</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={wasteCount}
              onChangeText={setWasteCount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Waste Reason</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={wasteReason}
              onChangeText={setWasteReason}
              placeholder="e.g. Seal failure, contamination"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rework Count</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={reworkCount}
              onChangeText={setReworkCount}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rework Reason</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={reworkReason}
              onChangeText={setReworkReason}
              placeholder="e.g. Underweight, label misprint"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowWasteModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#F59E0B' }]} onPress={handleUpdateWaste}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#8B5CF6' },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 16 },

  // Active run cards
  runCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  runHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  runNumber: { fontSize: 18, fontWeight: '700' },
  lineLabel: { fontSize: 13 },
  productName: { fontSize: 13, marginBottom: 12 },
  countsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 },
  countBox: { alignItems: 'center', gap: 4 },
  countValue: { fontSize: 20, fontWeight: '800' },
  countLabel: { fontSize: 11 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },
  wasteRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  wasteBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },

  // History rows
  historyRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 10 },
  historyLeft: { flex: 1 },
  historyRunNumber: { fontSize: 16, fontWeight: '700' },
  historyMeta: { fontSize: 12, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', justifyContent: 'center' },
  historyCount: { fontSize: 18, fontWeight: '800' },
  yieldRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center', maxWidth: 280 },

  // Setup guide
  guideCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  guideBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  guideBadgeText: { fontWeight: '700', fontSize: 13 },
  guideText: { fontSize: 14, lineHeight: 21 },
  guideCost: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  guideHeading: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  stepCard: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 10, alignItems: 'flex-start' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNum: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stepDesc: { fontSize: 13, lineHeight: 19 },
  equipRow: { flexDirection: 'row', paddingVertical: 12, alignItems: 'flex-start' },
  equipLeft: { flex: 1, marginRight: 12 },
  equipName: { fontSize: 14, fontWeight: '700' },
  equipModel: { fontSize: 12, marginTop: 2 },
  equipDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  equipCost: { fontSize: 14, fontWeight: '800', minWidth: 70, textAlign: 'right' },
  installStep: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  installNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  installText: { flex: 1, fontSize: 13, lineHeight: 19 },
  safetyRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  safetyText: { flex: 1, fontSize: 13, lineHeight: 19 },
  scaleTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, gap: 6 },
  modalBtnText: { fontWeight: '700', fontSize: 15 },
});
