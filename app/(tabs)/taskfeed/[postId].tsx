import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import {
  Printer,
  Share2,
  MapPin,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  Wrench,
  ChevronRight,
  ClipboardList,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTaskFeedPostDetail } from '@/hooks/useTaskFeedPostDetail';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import DepartmentCompletionBadges from '@/components/DepartmentCompletionBadges';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#D1FAE5', text: '#065F46' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  high: { bg: '#FEE2E2', text: '#991B1B' },
  critical: { bg: '#7F1D1D', text: '#FFFFFF' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#DBEAFE', text: '#1E40AF' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  overdue: { bg: '#FEE2E2', text: '#991B1B' },
  on_hold: { bg: '#F3F4F6', text: '#6B7280' },
  cancelled: { bg: '#F3F4F6', text: '#9CA3AF' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
};

export default function TaskFeedPostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading, error } = useTaskFeedPostDetail(postId);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.id = 'print-styles';
      style.innerHTML = `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-photos-grid { display: flex !important; flex-wrap: wrap !important; gap: 12px !important; }
          .print-photos-grid img { width: 200px !important; height: 150px !important; object-fit: cover !important; border-radius: 8px !important; page-break-inside: avoid !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `;
      document.head.appendChild(style);
      return () => {
        const existingStyle = document.getElementById('print-styles');
        if (existingStyle) existingStyle.remove();
      };
    }
  }, []);

  const formatDateTime = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const allPhotos = useMemo(() => {
    if (!data?.post) return [];
    const photos: string[] = [];
    if (data.post.photoUrl) photos.push(data.post.photoUrl);
    if (data.post.additionalPhotos) {
      photos.push(...data.post.additionalPhotos);
    }
    return photos.filter(Boolean);
  }, [data]);

  const handlePrint = useCallback(async () => {
    if (!data) return;

    if (Platform.OS === 'web') {
      const { post, linkedWorkOrders } = data;
      const completedCount = post.departmentTasks?.filter(t => t.status === 'completed').length || 0;
      const totalCount = post.departmentTasks?.length || 0;

      const photosHtml = allPhotos.length > 0 ? `
        <div class="section">
          <h3>📷 Photos (${allPhotos.length})</h3>
          <div class="photos-grid">
            ${allPhotos.map(photo => `<img src="${photo}" alt="Photo" />`).join('')}
          </div>
        </div>
      ` : '';

      const formDataHtml = post.formData && Object.keys(post.formData).length > 0 ? `
        <div class="section">
          <h3>📋 Form Details</h3>
          <div class="form-grid">
            ${Object.entries(post.formData).filter(([_, v]) => v).map(([key, value]) => {
              const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
              return `<div class="form-item"><span class="label">${label}</span><span class="value">${String(value)}</span></div>`;
            }).join('')}
          </div>
        </div>
      ` : '';

      const notesHtml = post.notes ? `
        <div class="section">
          <h3>📝 Notes</h3>
          <p class="notes">${post.notes}</p>
        </div>
      ` : '';

      const deptTasksHtml = post.departmentTasks && post.departmentTasks.length > 0 ? `
        <div class="section">
          <h3>🏢 Department Tasks (${post.departmentTasks.length})</h3>
          <div class="dept-tasks">
            ${post.departmentTasks.map(task => `
              <div class="dept-task" style="border-left-color: ${getDepartmentColor(task.departmentCode)}">
                <div class="dept-task-header">
                  <span class="dept-name">${task.departmentName}</span>
                  <span class="status-badge status-${task.status || 'pending'}">${(task.status || 'pending').replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                ${task.completedByName ? `<div class="dept-meta">Completed by ${task.completedByName} on ${formatDateTime(task.completedAt)}</div>` : ''}
                ${task.completionNotes ? `<div class="dept-notes">${task.completionNotes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      const workOrdersHtml = linkedWorkOrders.length > 0 ? `
        <div class="section">
          <h3>🔧 Linked Work Orders (${linkedWorkOrders.length})</h3>
          <div class="work-orders">
            ${linkedWorkOrders.map(wo => `
              <div class="work-order">
                <div class="wo-header">
                  <span class="wo-number">${wo.work_order_number || 'WO-' + wo.id.slice(0, 8)}</span>
                  <span class="priority-badge priority-${wo.priority || 'medium'}">${(wo.priority || 'medium').toUpperCase()}</span>
                  <span class="status-badge status-${wo.status || 'open'}">${(wo.status || 'open').replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <div class="wo-title">${wo.title}</div>
                ${wo.description ? `<div class="wo-desc">${wo.description}</div>` : ''}
                <div class="wo-meta">
                  ${wo.assigned_name ? `<span>👤 ${wo.assigned_name}</span>` : ''}
                  ${wo.due_date ? `<span>📅 Due: ${formatDate(wo.due_date)}</span>` : ''}
                  ${wo.department ? `<span class="dept-badge">${getDepartmentName(wo.department)}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${post.postNumber} - Task Feed Report</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; max-width: 800px; margin: 0 auto; color: #1a1a1a; font-size: 11px; line-height: 1.3; }
            .header { border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 12px; }
            .header-top { display: flex; justify-content: space-between; align-items: center; }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .post-number { font-size: 18px; font-weight: 700; color: #0ea5e9; }
            .template-name { font-size: 13px; color: #666; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; }
            .status-completed { background: #D1FAE5; color: #065F46; }
            .status-open { background: #DBEAFE; color: #1E40AF; }
            .status-in_progress { background: #FEF3C7; color: #92400E; }
            .status-pending { background: #FEF3C7; color: #92400E; }
            .status-overdue { background: #FEE2E2; color: #991B1B; }
            .meta-row { display: flex; gap: 16px; margin-top: 8px; color: #666; font-size: 11px; }
            .section { margin-bottom: 12px; }
            .section h3 { font-size: 12px; font-weight: 600; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
            .photos-grid { display: flex; flex-wrap: wrap; gap: 8px; }
            .photos-grid img { width: 120px; height: 90px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
            .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 12px; }
            .form-item { padding: 4px 0; }
            .form-item .label { display: block; font-size: 9px; color: #888; }
            .form-item .value { font-size: 11px; font-weight: 500; }
            .notes { font-size: 11px; color: #333; }
            .dept-tasks { display: flex; flex-direction: column; gap: 6px; }
            .dept-task { border-left: 3px solid #ccc; padding: 6px 10px; background: #f9f9f9; border-radius: 0 4px 4px 0; }
            .dept-task-header { display: flex; justify-content: space-between; align-items: center; }
            .dept-name { font-weight: 600; font-size: 11px; }
            .dept-meta { font-size: 10px; color: #666; margin-top: 3px; }
            .dept-notes { font-size: 10px; color: #666; margin-top: 3px; }
            .work-orders { display: flex; flex-direction: column; gap: 8px; }
            .work-order { padding: 8px 10px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e5e5e5; }
            .wo-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
            .wo-number { font-weight: 700; color: #0ea5e9; font-size: 11px; }
            .priority-badge { padding: 1px 6px; border-radius: 6px; font-size: 9px; font-weight: 600; }
            .priority-low { background: #D1FAE5; color: #065F46; }
            .priority-medium { background: #FEF3C7; color: #92400E; }
            .priority-high { background: #FEE2E2; color: #991B1B; }
            .priority-critical { background: #7F1D1D; color: #FFF; }
            .wo-title { font-weight: 500; font-size: 11px; }
            .wo-desc { font-size: 10px; color: #666; margin-top: 2px; }
            .wo-meta { display: flex; gap: 12px; font-size: 10px; color: #666; flex-wrap: wrap; margin-top: 4px; }
            .dept-badge { background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 6px; font-size: 9px; }
            .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 9px; }
            @media print { body { padding: 12px; } .section { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-top">
              <div class="header-left">
                <span class="post-number">${post.postNumber}</span>
                <span class="template-name">${post.templateName}</span>
              </div>
              <span class="status-badge status-${post.status || 'pending'}">${(post.status || 'pending').replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="meta-row">
              <span>👤 ${post.createdByName}</span>
              <span>📅 ${formatDateTime(post.createdAt)}</span>
              ${post.locationName ? `<span>📍 ${post.locationName}</span>` : ''}
              ${totalCount > 0 ? `<span>Progress: ${completedCount}/${totalCount}</span>` : ''}
            </div>
          </div>
          ${photosHtml}
          ${formDataHtml}
          ${notesHtml}
          ${deptTasksHtml}
          ${workOrdersHtml}
          <div class="footer">Generated on ${new Date().toLocaleString()}</div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } else {
      Alert.alert(
        'Print',
        'To print this report, please use the Share option and send to a printer-enabled app or email.',
        [{ text: 'OK' }]
      );
    }
  }, [data, allPhotos, formatDateTime, formatDate]);

  const generateShareContent = useCallback(() => {
    if (!data) return '';

    const { post, linkedWorkOrders } = data;
    let content = `TASK FEED POST REPORT\n`;
    content += `${'='.repeat(40)}\n\n`;
    content += `Post Number: ${post.postNumber}\n`;
    content += `Template: ${post.templateName}\n`;
    content += `Status: ${post.status?.toUpperCase()}\n`;
    content += `Created: ${formatDateTime(post.createdAt)}\n`;
    content += `Created By: ${post.createdByName}\n`;
    if (post.locationName) content += `Location: ${post.locationName}\n`;
    content += `\n`;

    if (post.formData && Object.keys(post.formData).length > 0) {
      content += `FORM DATA\n`;
      content += `${'-'.repeat(20)}\n`;
      for (const [key, value] of Object.entries(post.formData)) {
        if (value) {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          content += `${label}: ${String(value)}\n`;
        }
      }
      content += `\n`;
    }

    if (post.notes) {
      content += `NOTES\n`;
      content += `${'-'.repeat(20)}\n`;
      content += `${post.notes}\n\n`;
    }

    if (post.departmentTasks && post.departmentTasks.length > 0) {
      content += `DEPARTMENT TASKS\n`;
      content += `${'-'.repeat(20)}\n`;
      for (const task of post.departmentTasks) {
        const statusIcon = task.status === 'completed' ? '✓' : task.status === 'pending' ? '○' : '…';
        content += `${statusIcon} ${task.departmentName}: ${task.status?.toUpperCase()}\n`;
        if (task.completedByName) {
          content += `   Completed by: ${task.completedByName} on ${formatDateTime(task.completedAt)}\n`;
        }
        if (task.completionNotes) {
          content += `   Notes: ${task.completionNotes}\n`;
        }
      }
      content += `\n`;
    }

    if (linkedWorkOrders.length > 0) {
      content += `LINKED WORK ORDERS (${linkedWorkOrders.length})\n`;
      content += `${'='.repeat(40)}\n\n`;
      for (const wo of linkedWorkOrders) {
        content += `Work Order: ${wo.work_order_number || wo.id.slice(0, 8)}\n`;
        content += `Title: ${wo.title}\n`;
        content += `Status: ${wo.status?.toUpperCase()}\n`;
        content += `Priority: ${wo.priority?.toUpperCase()}\n`;
        if (wo.assigned_name) content += `Assigned To: ${wo.assigned_name}\n`;
        if (wo.due_date) content += `Due Date: ${formatDate(wo.due_date)}\n`;
        if (wo.description) content += `Description: ${wo.description.slice(0, 200)}...\n`;
        content += `\n`;
      }
    }

    content += `${'-'.repeat(40)}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;

    return content;
  }, [data, formatDateTime, formatDate]);

  const handleShare = useCallback(async () => {
    if (!data) return;

    const content = generateShareContent();

    try {
      await Share.share({
        message: content,
        title: `Task Feed Post ${data.post.postNumber}`,
      });
    } catch (err) {
      console.error('[TaskFeedPostDetail] Share error:', err);
    }
  }, [data, generateShareContent]);

  const handleWorkOrderPress = useCallback((workOrderId: string) => {
    router.push(`/cmms/work-orders/${workOrderId}`);
  }, [router]);

  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading post details...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ title: 'Error' }} />
        <AlertTriangle size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Post Not Found</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          The requested task feed post could not be loaded.
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { post, linkedWorkOrders } = data;
  const completedCount = post.departmentTasks?.filter(t => t.status === 'completed').length || 0;
  const totalCount = post.departmentTasks?.length || 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: post.postNumber,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Share2 size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrint} style={styles.headerButton}>
                <Printer size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.postHeader}>
            <View style={styles.postHeaderLeft}>
              <Text style={[styles.postNumber, { color: colors.primary }]}>{post.postNumber}</Text>
              <Text style={[styles.templateName, { color: colors.text }]}>{post.templateName}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLORS[post.status || 'pending']?.bg || colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: STATUS_COLORS[post.status || 'pending']?.text || colors.text },
                ]}
              >
                {(post.status || 'pending').replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <User size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{post.createdByName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDateTime(post.createdAt)}
              </Text>
            </View>
          </View>

          {post.locationName && (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.text }]}>{post.locationName}</Text>
              </View>
            </View>
          )}

          {totalCount > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  Department Progress
                </Text>
                <Text style={[styles.progressCount, { color: colors.primary }]}>
                  {completedCount} / {totalCount}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: completedCount === totalCount ? '#10B981' : colors.primary,
                      width: `${(completedCount / totalCount) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Photos Section */}
        {allPhotos.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <ImageIcon size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Photos ({allPhotos.length})
              </Text>
            </View>
            {/* Screen version - horizontal scroll */}
            {Platform.OS !== 'web' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {allPhotos.map((photo, idx) => (
                  <Image key={`photo-${idx}`} source={{ uri: photo }} style={styles.photoLarge} />
                ))}
              </ScrollView>
            ) : (
              <>
                {/* Web screen version - horizontal scroll */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.photosScroll}
                  // @ts-ignore - web className
                  className="no-print"
                >
                  {allPhotos.map((photo, idx) => (
                    <Image key={`photo-${idx}`} source={{ uri: photo }} style={styles.photoLarge} />
                  ))}
                </ScrollView>
                {/* Print version - grid layout */}
                <View 
                  style={styles.photosGrid}
                  // @ts-ignore - web className
                  className="print-only print-photos-grid"
                >
                  {allPhotos.map((photo, idx) => (
                    <Image key={`photo-print-${idx}`} source={{ uri: photo }} style={styles.photoGridItem} />
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Form Data Section */}
        {post.formData && Object.keys(post.formData).length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Form Details</Text>
            </View>
            <View style={styles.formDataGrid}>
              {Object.entries(post.formData).map(([key, value]) => {
                if (!value) return null;
                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                return (
                  <View key={key} style={styles.formDataItem}>
                    <Text style={[styles.formDataLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.formDataValue, { color: colors.text }]}>{String(value)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes Section */}
        {post.notes && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.text }]}>{post.notes}</Text>
          </View>
        )}

        {/* Department Tasks Section */}
        {post.departmentTasks && post.departmentTasks.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <DepartmentCompletionBadges
              departmentTasks={post.departmentTasks}
              showEscalateButton={post.status !== 'completed' && post.status !== 'cancelled'}
              isProductionHold={post.isProductionHold}
              onEscalatePress={() => {
                Alert.alert('Send to Department', 'Escalation modal coming soon');
              }}
              onSignoffPress={(task) => {
                Alert.alert(
                  'Sign Off',
                  `Confirm sign-off for ${task.departmentName}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Off', onPress: () => {
                      Alert.alert('Signed off', `${task.departmentName} signed off successfully`);
                    }},
                  ]
                );
              }}
              onBadgePress={(task) => {
                if (task.moduleHistoryType === 'work_order' && task.moduleHistoryId) {
                  handleWorkOrderPress(task.moduleHistoryId);
                }
              }}
            />
          </View>
        )}

        {/* Linked Work Orders Section */}
        {linkedWorkOrders.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Wrench size={18} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Linked Work Orders ({linkedWorkOrders.length})
              </Text>
            </View>
            {linkedWorkOrders.map((wo) => (
              <TouchableOpacity
                key={wo.id}
                style={[styles.workOrderCard, { backgroundColor: colors.background }]}
                onPress={() => handleWorkOrderPress(wo.id)}
                activeOpacity={0.7}
              >
                <View style={styles.woHeader}>
                  <View style={styles.woHeaderLeft}>
                    <Text style={[styles.woNumber, { color: colors.primary }]}>
                      {wo.work_order_number || `WO-${wo.id.slice(0, 8)}`}
                    </Text>
                    <View
                      style={[
                        styles.woPriorityBadge,
                        { backgroundColor: PRIORITY_COLORS[wo.priority || 'medium']?.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.woPriorityText,
                          { color: PRIORITY_COLORS[wo.priority || 'medium']?.text },
                        ]}
                      >
                        {(wo.priority || 'medium').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.woStatusBadge,
                      { backgroundColor: STATUS_COLORS[wo.status || 'open']?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.woStatusText,
                        { color: STATUS_COLORS[wo.status || 'open']?.text },
                      ]}
                    >
                      {(wo.status || 'open').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.woTitle, { color: colors.text }]} numberOfLines={2}>
                  {wo.title}
                </Text>
                {wo.description && (
                  <Text style={[styles.woDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {wo.description}
                  </Text>
                )}
                <View style={styles.woMeta}>
                  {wo.assigned_name && (
                    <View style={styles.woMetaItem}>
                      <User size={12} color={colors.textTertiary} />
                      <Text style={[styles.woMetaText, { color: colors.textSecondary }]}>
                        {wo.assigned_name}
                      </Text>
                    </View>
                  )}
                  {wo.due_date && (
                    <View style={styles.woMetaItem}>
                      <Calendar size={12} color={colors.textTertiary} />
                      <Text style={[styles.woMetaText, { color: colors.textSecondary }]}>
                        Due: {formatDate(wo.due_date)}
                      </Text>
                    </View>
                  )}
                  {wo.department && (
                    <View
                      style={[
                        styles.woDeptBadge,
                        { backgroundColor: getDepartmentColor(wo.department) + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.woDeptText, { color: getDepartmentColor(wo.department) }]}
                      >
                        {getDepartmentName(wo.department)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.woFooter}>
                  <Text style={[styles.woViewText, { color: colors.primary }]}>View Details</Text>
                  <ExternalLink size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Print-only section (hidden on screen, visible when printing) */}
        {Platform.OS === 'web' && (
          <View style={styles.printFooter}>
            <Text style={[styles.printFooterText, { color: colors.textTertiary }]}>
              Generated on {new Date().toLocaleString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      textAlign: 'center' as const,
      marginTop: 8,
      marginBottom: 24,
    },
    backButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    backButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    headerActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    headerButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 16,
    },
    card: {
      borderRadius: 12,
      padding: 16,
    },
    postHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 12,
    },
    postHeaderLeft: {
      flex: 1,
    },
    postNumber: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    templateName: {
      fontSize: 16,
      fontWeight: '500' as const,
      marginTop: 4,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
    metaRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 16,
      marginBottom: 8,
    },
    metaItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    metaText: {
      fontSize: 13,
    },
    progressSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    progressHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 8,
    },
    progressLabel: {
      fontSize: 12,
    },
    progressCount: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    photosScroll: {
      marginHorizontal: -8,
    },
    photoLarge: {
      width: 200,
      height: 150,
      borderRadius: 8,
      marginHorizontal: 8,
    },
    photosGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    photoGridItem: {
      width: 200,
      height: 150,
      borderRadius: 8,
    },
    formDataGrid: {
      gap: 12,
    },
    formDataItem: {
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    formDataLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    formDataValue: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    notesText: {
      fontSize: 14,
      lineHeight: 20,
    },
    deptTaskItem: {
      borderLeftWidth: 3,
      paddingLeft: 12,
      paddingVertical: 12,
      marginBottom: 12,
    },
    deptTaskHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    deptTaskLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    deptTaskDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    deptTaskName: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    deptTaskStatus: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    deptTaskStatusText: {
      fontSize: 11,
      fontWeight: '500' as const,
      textTransform: 'capitalize' as const,
    },
    deptTaskMeta: {
      marginTop: 8,
    },
    deptTaskMetaText: {
      fontSize: 12,
    },
    deptTaskNotes: {
      fontSize: 13,
      marginTop: 8,
      fontStyle: 'italic' as const,
    },
    linkedWOBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignSelf: 'flex-start' as const,
    },
    linkedWOText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '500' as const,
    },
    workOrderCard: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    woHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 8,
    },
    woHeaderLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    woNumber: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
    woPriorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    woPriorityText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    woStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    woStatusText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    woTitle: {
      fontSize: 14,
      fontWeight: '500' as const,
      marginBottom: 4,
    },
    woDescription: {
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 8,
    },
    woMeta: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 12,
      marginTop: 8,
    },
    woMetaItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    woMetaText: {
      fontSize: 11,
    },
    woDeptBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    woDeptText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    woFooter: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      gap: 4,
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    woViewText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    printFooter: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center' as const,
    },
    printFooterText: {
      fontSize: 11,
    },
  });
