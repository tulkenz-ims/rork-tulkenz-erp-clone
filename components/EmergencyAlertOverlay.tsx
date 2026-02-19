/**
 * EmergencyAlertOverlay
 * 
 * When an emergency event is initiated or in_progress, this overlay
 * takes over the ENTIRE screen on ALL connected devices.
 * 
 * - Subscribes directly to emergency_events via Supabase Realtime
 * - Also polls on mount for any active emergencies
 * - Shows full-screen blocking alert with instructions
 * - Can be minimized to persistent top banner but CANNOT be dismissed
 * - Auto-clears when event status changes to all_clear/resolved/cancelled
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  EmergencyEvent,
  EmergencyEventType,
  EMERGENCY_EVENT_TYPE_CONFIG,
  EMERGENCY_SEVERITY_COLORS,
} from '@/types/emergencyEvents';
import {
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
  ChevronDown,
  ChevronUp,
  Radio,
  Clock,
  MapPin,
  Users,
  X,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Flame, Tornado, ShieldAlert, FlaskConical, Wind,
  AlertOctagon, HeartPulse, Activity, Waves, ZapOff,
  Building, AlertTriangle,
};

const ACTIVE_STATUSES = ['initiated', 'in_progress'];

export default function EmergencyAlertOverlay() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;
  const [activeEmergency, setActiveEmergency] = useState<EmergencyEvent | null>(null);
  const [minimized, setMinimized] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const channelRef = useRef<any>(null);

  // Pulse animation for the alert
  useEffect(() => {
    if (!activeEmergency) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Vibrate on new emergency (mobile only)
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }

    return () => pulse.stop();
  }, [activeEmergency?.id]);

  // Slide animation for minimized banner
  useEffect(() => {
    if (minimized && activeEmergency) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(-100);
    }
  }, [minimized, activeEmergency]);

  // Check for active emergencies on mount
  const checkActiveEmergencies = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('emergency_events')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ACTIVE_STATUSES)
        .order('initiated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[EmergencyAlert] Error checking:', error.message);
        return;
      }

      if (data && data.length > 0) {
        console.log('[EmergencyAlert] 🚨 Active emergency found:', data[0].title);
        setActiveEmergency(data[0] as EmergencyEvent);
        setMinimized(false);
      } else {
        setActiveEmergency(null);
      }
    } catch (err) {
      console.error('[EmergencyAlert] Check error:', err);
    }
  }, [organizationId]);

  // Subscribe to real-time emergency events
  useEffect(() => {
    if (!organizationId) return;

    // Check on mount
    checkActiveEmergencies();

    // Subscribe to changes
    const channel = supabase
      .channel('emergency-alert-overlay')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_events' } as any,
        (payload: any) => {
          console.log('[EmergencyAlert] 📡 Realtime event:', payload.eventType);
          const record = (payload.new || payload.old) as EmergencyEvent;

          if (!record || record.organization_id !== organizationId) return;

          if (payload.eventType === 'INSERT' && ACTIVE_STATUSES.includes(record.status)) {
            console.log('[EmergencyAlert] 🚨 NEW EMERGENCY:', record.title);
            setActiveEmergency(record);
            setMinimized(false);
          } else if (payload.eventType === 'UPDATE') {
            if (ACTIVE_STATUSES.includes(record.status)) {
              console.log('[EmergencyAlert] 🔄 Emergency updated:', record.status);
              setActiveEmergency(record);
            } else {
              console.log('[EmergencyAlert] ✅ Emergency cleared:', record.status);
              setActiveEmergency(null);
              setMinimized(false);
            }
          } else if (payload.eventType === 'DELETE') {
            if (activeEmergency?.id === record?.id) {
              setActiveEmergency(null);
            }
          }
        }
      )
      .subscribe((status: string, err?: any) => {
        console.log('[EmergencyAlert] Channel:', status, err || '');
      });

    channelRef.current = channel;

    // Also poll every 10 seconds as fallback
    const pollInterval = setInterval(checkActiveEmergencies, 10000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [organizationId, checkActiveEmergencies]);

  if (!activeEmergency) return null;

  const config = EMERGENCY_EVENT_TYPE_CONFIG[activeEmergency.event_type] || EMERGENCY_EVENT_TYPE_CONFIG.other;
  const IconComponent = ICON_MAP[config.icon] || AlertTriangle;
  const severityColor = EMERGENCY_SEVERITY_COLORS[activeEmergency.severity] || '#EF4444';
  const elapsed = getElapsedTime(activeEmergency.initiated_at);

  // ── Minimized: persistent top banner ──
  if (minimized) {
    return (
      <Animated.View style={[styles.minimizedBanner, { backgroundColor: config.color, transform: [{ translateY: slideAnim }] }]}>
        <Pressable style={styles.minimizedContent} onPress={() => setMinimized(false)}>
          <View style={styles.minimizedLeft}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <IconComponent size={20} color="#FFFFFF" />
            </Animated.View>
            <View style={styles.minimizedTextWrap}>
              <Text style={styles.minimizedTitle} numberOfLines={1}>
                {activeEmergency.drill ? '🔔 DRILL: ' : '🚨 '}{config.label.toUpperCase()}
              </Text>
              <Text style={styles.minimizedSub} numberOfLines={1}>
                {activeEmergency.title} • {elapsed}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    );
  }

  // ── Full screen: emergency takeover ──
  return (
    <View style={[styles.fullOverlay, { backgroundColor: 'rgba(0,0,0,0.92)' }]}>
      <View style={styles.fullContent}>
        {/* Pulsing icon */}
        <Animated.View style={[styles.iconCircle, { backgroundColor: config.color, transform: [{ scale: pulseAnim }] }]}>
          <IconComponent size={64} color="#FFFFFF" />
        </Animated.View>

        {/* Emergency type */}
        <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
          <Text style={styles.typeText}>
            {activeEmergency.drill ? 'DRILL — ' : ''}{config.label.toUpperCase()}
          </Text>
        </View>

        {/* Severity */}
        <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
          <Text style={styles.severityText}>
            {activeEmergency.severity.toUpperCase()} SEVERITY
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{activeEmergency.title}</Text>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{elapsed}</Text>
          </View>
          {activeEmergency.location_details && (
            <View style={styles.metaItem}>
              <MapPin size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{activeEmergency.location_details}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Users size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>Initiated by {activeEmergency.initiated_by}</Text>
          </View>
        </View>

        {/* Instructions box */}
        <View style={[styles.instructionsBox, { borderColor: config.color }]}>
          <View style={styles.instructionsHeader}>
            <Radio size={16} color={config.color} />
            <Text style={[styles.instructionsLabel, { color: config.color }]}>
              EMERGENCY INSTRUCTIONS
            </Text>
          </View>
          <Text style={styles.instructionsText}>{config.instructions}</Text>
        </View>

        {/* Description if provided */}
        {activeEmergency.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Additional Details:</Text>
            <Text style={styles.descriptionText}>{activeEmergency.description}</Text>
          </View>
        )}

        {/* Departments affected */}
        {activeEmergency.departments_affected?.length > 0 && (
          <View style={styles.deptRow}>
            <Text style={styles.deptLabel}>Departments Affected:</Text>
            <Text style={styles.deptText}>
              {activeEmergency.departments_affected.join(', ')}
            </Text>
          </View>
        )}

        {/* Status */}
        <View style={[styles.statusBadge, { 
          backgroundColor: activeEmergency.status === 'initiated' ? '#EF4444' : '#F59E0B' 
        }]}>
          <Text style={styles.statusText}>
            STATUS: {activeEmergency.status === 'initiated' ? 'EMERGENCY INITIATED' : 'IN PROGRESS'}
          </Text>
        </View>

        {/* Minimize button */}
        <Pressable style={styles.minimizeButton} onPress={() => setMinimized(true)}>
          <ChevronUp size={16} color="#9CA3AF" />
          <Text style={styles.minimizeText}>Minimize to banner</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getElapsedTime(initiatedAt: string): string {
  const diff = Date.now() - new Date(initiatedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

const styles = StyleSheet.create({
  // ── Full screen overlay ──
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullContent: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  typeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  severityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  instructionsBox: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  instructionsLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  instructionsText: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  descriptionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  descriptionText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  deptRow: {
    width: '100%',
    marginBottom: 16,
  },
  deptLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  deptText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  minimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  minimizeText: {
    color: '#9CA3AF',
    fontSize: 13,
  },

  // ── Minimized banner ──
  minimizedBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingTop: Platform.OS === 'web' ? 0 : 50,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  minimizedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  minimizedTextWrap: {
    flex: 1,
  },
  minimizedTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  minimizedSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 1,
  },
});
