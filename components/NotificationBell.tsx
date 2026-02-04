import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,

} from 'react-native';
import {
  Bell,
  X,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  FileText,
  Package,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Check,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Notification, NOTIFICATION_TYPE_CONFIG, PRIORITY_CONFIG } from '@/types/notifications';

const getNotificationIcon = (type: string, color: string) => {
  const size = 18;
  switch (type) {
    case 'approval_request':
      return <ClipboardCheck size={size} color={color} />;
    case 'approval_approved':
      return <CheckCircle size={size} color={color} />;
    case 'approval_rejected':
      return <XCircle size={size} color={color} />;
    case 'po_status_change':
      return <FileText size={size} color={color} />;
    case 'ses_submitted':
      return <ClipboardCheck size={size} color={color} />;
    case 'receiving_complete':
      return <Package size={size} color={color} />;
    case 'low_stock_alert':
      return <AlertTriangle size={size} color={color} />;
    case 'work_order_assigned':
      return <Wrench size={size} color={color} />;
    default:
      return <Bell size={size} color={color} />;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationBell() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getRecentNotifications,
  } = useNotifications();

  const [showModal, setShowModal] = useState(false);

  const handleBellPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowModal(true);
  }, []);

  const handleNotificationPress = useCallback((notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      setShowModal(false);
      setTimeout(() => {
        router.push(notification.actionUrl as any);
      }, 300);
    }
  }, [markAsRead, router]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleDelete = useCallback((notificationId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteNotification(notificationId);
  }, [deleteNotification]);

  const recentNotifications = getRecentNotifications(20);

  const renderNotificationItem = (notification: Notification) => {
    const config = NOTIFICATION_TYPE_CONFIG[notification.type] || {
      label: 'Notification',
      icon: 'Bell',
      color: '#6B7280',
      bgColor: '#6B728015',
    };
    const isUnread = notification.status === 'unread';
    const priorityConfig = PRIORITY_CONFIG[notification.priority] || {
      label: 'Normal',
      color: '#6B7280',
      weight: 1,
    };

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          { 
            backgroundColor: isUnread ? `${colors.primary}08` : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          {getNotificationIcon(notification.type, config.color)}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text 
              style={[
                styles.notificationTitle, 
                { color: colors.text, fontWeight: isUnread ? '600' : '500' }
              ]} 
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>

          <Text 
            style={[styles.notificationMessage, { color: colors.textSecondary }]} 
            numberOfLines={2}
          >
            {notification.message}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
            {notification.priority !== 'low' && (
              <View style={[styles.priorityBadge, { backgroundColor: `${priorityConfig.color}15` }]}>
                <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                  {priorityConfig.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {notification.actionUrl && (
            <ChevronRight size={16} color={colors.textTertiary} />
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(notification.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.bellButton} 
        onPress={handleBellPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Bell size={22} color={colors.text} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
                <Check size={18} color={colors.primary} />
                <Text style={[styles.markAllText, { color: colors.primary }]}>Read All</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 70 }} />
            )}
          </View>

          {unreadCount > 0 && (
            <View style={[styles.summaryBar, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.summaryText, { color: colors.primary }]}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {recentNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  You are all caught up! New notifications will appear here.
                </Text>
              </View>
            ) : (
              recentNotifications.map(renderNotificationItem)
            )}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  summaryBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeAgo: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  deleteButton: {
    padding: 4,
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  bottomPadding: {
    height: 40,
  },
});
