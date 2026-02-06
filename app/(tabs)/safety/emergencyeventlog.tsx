import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Filter,
  Flame,
  Tornado,
  ShieldAlert,
  FlaskConical,
  Wind,
  AlertOctagon,
  HeartPulse,
  Activity,
  Waves,
  ZapOff,
  Building,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  X,
  Siren,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmergencyEvents } from '@/hooks/useEmergencyEvents';
import {
  EmergencyEvent,
  EmergencyEventType,
  EmergencyEventStatus,
  EMERGENCY_EVENT_TYPE_CONFIG,
  EMERGENCY_EVENT_STATUS_LABELS,
  EMERGENCY_EVENT_STATUS_COLORS,
  EMERGENCY_SEVERITY_LABELS,
  EMERGENCY_SEVERITY_COLORS,
} from '@/types/emergencyEvents';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Flame,
  Tornado,
  ShieldAlert,
  FlaskConical,
  Wind,
  AlertOctagon,
  HeartPulse,
  Activity,
  Waves,
  ZapOff,
  Building,
  AlertTriangle,
};

type FilterType = 'all' | 'active' | 'drills' | 'resolved';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'drills', label: 'Drills' },
  { key: 'resolved', label: 'Resolved' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

const EventCard = React.memo(({ event, colors, onPress }: { event: EmergencyEvent; colors: any; onPress: () => void }) => {
  const config = EMERGENCY_EVENT_TYPE_CONFIG[event.event_type];
  const IconComp = ICON_MAP[config.icon];
  const statusColor = EMERGENCY_EVENT_STATUS_COLORS[event.status];
  const severityColor = EMERGENCY_SEVERITY_COLORS[event.severity];
  const isActive = event.status === 'initiated' || event.status === 'in_progress';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.eventCard,
        {
          backgroundColor: colors.surface,
          borderColor: isActive ? statusColor + '60' : colors.border,
          borderLeftColor: config.color,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={onPress}
      testID={`event-card-${event.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeIconWrap, { backgroundColor: config.color + '15' }]}>
          {IconComp && <IconComp size={20} color={config.color} />}
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {event.title}
            </Text>
            {event.drill && (
              <View style={[styles.drillBadge, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
                <Text style={styles.drillBadgeText}>DRILL</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {EMERGENCY_EVENT_STATUS_LABELS[event.status]}
              </Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: severityColor + '15' }]}>
              <Text style={[styles.severityText, { color: severityColor }]}>
                {EMERGENCY_SEVERITY_LABELS[event.severity]}
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Clock size={13} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {getRelativeTime(event.initiated_at)}
          </Text>
        </View>
        {event.location_details ? (
          <View style={styles.footerItem}>
            <MapPin size={13} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]} numberOfLines={1}>
              {event.location_details}
            </Text>
          </View>
        ) : null}
        {event.emergency_services_called && (
          <View style={styles.footerItem}>
            <Siren size={13} color="#EF4444" />
            <Text style={[styles.footerText, { color: '#EF4444' }]}>911</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

export default function EmergencyEventLogScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { events, isLoading, refetch } = useEmergencyEvents();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (activeFilter === 'active') {
      result = result.filter((e) => e.status === 'initiated' || e.status === 'in_progress');
    } else if (activeFilter === 'drills') {
      result = result.filter((e) => e.drill);
    } else if (activeFilter === 'resolved') {
      result = result.filter((e) => e.status === 'resolved' || e.status === 'all_clear' || e.status === 'cancelled');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.event_type.toLowerCase().includes(q) ||
          (e.location_details || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [events, activeFilter, search]);

  const stats = useMemo(() => {
    const active = events.filter((e) => e.status === 'initiated' || e.status === 'in_progress').length;
    const drills = events.filter((e) => e.drill).length;
    const total = events.length;
    return { active, drills, total };
  }, [events]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEventPress = useCallback((event: EmergencyEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/safety/emergencyeventdetail?id=${event.id}` as any);
  }, [router]);

  const renderEvent = useCallback(({ item }: { item: EmergencyEvent }) => (
    <EventCard event={item} colors={colors} onPress={() => handleEventPress(item)} />
  ), [colors, handleEventPress]);

  const keyExtractor = useCallback((item: EmergencyEvent) => item.id, []);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AlertTriangle size={48} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events Found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {search ? 'Try adjusting your search or filter.' : 'No emergency events have been logged yet.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Emergency Event Log',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.headerSection}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F610', borderColor: '#3B82F630' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.drills}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Drills</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search events..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f.key ? colors.text + '12' : 'transparent',
                  borderColor: activeFilter === f.key ? colors.text + '30' : colors.border,
                },
              ]}
              onPress={() => { setActiveFilter(f.key); Haptics.selectionAsync(); }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === f.key ? colors.text : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden' as const,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    gap: 12,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardHeaderText: {
    flex: 1,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    flex: 1,
  },
  drillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  drillBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  cardMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  footerText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
});
