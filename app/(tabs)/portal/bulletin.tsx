import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  Megaphone,
  Pin,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  Plus,
  X,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useERP } from '@/contexts/ERPContext';
import type { BulletinPost } from '@/constants/dashboardConstants';

export default function BulletinScreen() {
  const { colors } = useTheme();
  const { userProfile, isEmployee } = useUser();
  const { getActiveBulletinPosts, addBulletinPost, deleteBulletinPost, updateBulletinPost } = useERP();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const bulletinPosts = useMemo(() => getActiveBulletinPosts(), [getActiveBulletinPosts]);

  const canManageBulletin = !isEmployee;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleDeletePost = useCallback((postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteBulletinPost(postId);
          },
        },
      ]
    );
  }, [deleteBulletinPost]);

  const handleTogglePin = useCallback((post: BulletinPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateBulletinPost(post.id, { pinned: !post.pinned });
  }, [updateBulletinPost]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityConfig = (priority: BulletinPost['priority']) => {
    switch (priority) {
      case 'urgent':
        return { color: colors.error, icon: AlertTriangle, label: 'URGENT' };
      case 'important':
        return { color: colors.warning, icon: AlertCircle, label: 'Important' };
      default:
        return { color: colors.info, icon: Info, label: 'Announcement' };
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Bulletin Board',
          headerRight: () =>
            canManageBulletin ? (
              <Pressable
                style={styles.headerButton}
                onPress={() => setCreateModalVisible(true)}
              >
                <Plus size={24} color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.primary + '15' }]}>
          <Megaphone size={24} color={colors.primary} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Company Announcements</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Stay updated with the latest news
            </Text>
          </View>
        </View>

        {bulletinPosts.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Megaphone size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Announcements</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              There are no announcements at this time.
            </Text>
          </View>
        ) : (
          <View style={styles.postList}>
            {bulletinPosts.map((post) => {
              const priorityConfig = getPriorityConfig(post.priority);
              const PriorityIcon = priorityConfig.icon;

              return (
                <View
                  key={post.id}
                  style={[
                    styles.postCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    post.priority === 'urgent' && { borderLeftColor: colors.error, borderLeftWidth: 4 },
                    post.priority === 'important' && { borderLeftColor: colors.warning, borderLeftWidth: 4 },
                  ]}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.postHeaderLeft}>
                      {post.pinned && (
                        <View style={[styles.pinnedBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Pin size={12} color={colors.primary} />
                          <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
                        </View>
                      )}
                      <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
                        <PriorityIcon size={12} color={priorityConfig.color} />
                        <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                          {priorityConfig.label}
                        </Text>
                      </View>
                    </View>
                    {canManageBulletin && (
                      <View style={styles.postActions}>
                        <Pressable
                          style={styles.postActionButton}
                          onPress={() => handleTogglePin(post)}
                        >
                          <Pin
                            size={16}
                            color={post.pinned ? colors.primary : colors.textTertiary}
                            fill={post.pinned ? colors.primary : 'transparent'}
                          />
                        </Pressable>
                        <Pressable
                          style={styles.postActionButton}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <Trash2 size={16} color={colors.error} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
                  <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>

                  <View style={styles.postFooter}>
                    <View style={styles.postMeta}>
                      <Clock size={12} color={colors.textTertiary} />
                      <Text style={[styles.postMetaText, { color: colors.textTertiary }]}>
                        {formatDate(post.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.postAuthor, { color: colors.textTertiary }]}>
                      Posted by {post.createdByName}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {canManageBulletin && (
        <CreatePostModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSubmit={(post) => {
            addBulletinPost({
              ...post,
              createdBy: userProfile?.id || 'admin',
              createdByName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Admin',
            });
            setCreateModalVisible(false);
            Alert.alert('Success', 'Announcement posted successfully!');
          }}
          colors={colors}
        />
      )}
    </View>
  );
}

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (post: Omit<BulletinPost, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => void;
  colors: any;
}

function CreatePostModal({ visible, onClose, onSubmit, colors }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<BulletinPost['priority']>('normal');
  const [pinned, setPinned] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    onSubmit({ title, content, priority, pinned });
    setTitle('');
    setContent('');
    setPriority('normal');
    setPinned(false);
  };

  const styles = createModalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create Announcement</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Announcement title..."
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Message</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your announcement..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={6}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Priority</Text>
          <Pressable
            style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]}>
              {priority === 'urgent' ? 'Urgent' : priority === 'important' ? 'Important' : 'Normal'}
            </Text>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Pressable>
          {priorityDropdownOpen && (
            <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {(['normal', 'important', 'urgent'] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setPriority(p);
                    setPriorityDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                    {p === 'urgent' ? 'Urgent' : p === 'important' ? 'Important' : 'Normal'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={[styles.checkboxRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setPinned(!pinned)}
          >
            <View style={[styles.checkbox, { borderColor: colors.border }, pinned && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {pinned && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>Pin this announcement</Text>
          </Pressable>

          <Pressable style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Post Announcement</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    headerButton: {
      padding: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      gap: 14,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    headerSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    emptyState: {
      padding: 48,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center' as const,
    },
    postList: {
      gap: 16,
    },
    postCard: {
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postHeaderLeft: {
      flexDirection: 'row',
      gap: 8,
    },
    pinnedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    pinnedText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    priorityText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    postActions: {
      flexDirection: 'row',
      gap: 4,
    },
    postActionButton: {
      padding: 8,
    },
    postTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    postContent: {
      fontSize: 14,
      lineHeight: 20,
    },
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    postMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    postMetaText: {
      fontSize: 12,
    },
    postAuthor: {
      fontSize: 12,
    },
  });

const createModalStyles = (colors: any) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      fontSize: 15,
    },
    textArea: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      fontSize: 15,
      minHeight: 120,
      textAlignVertical: 'top' as const,
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    dropdownText: {
      fontSize: 15,
    },
    dropdownList: {
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      overflow: 'hidden',
    },
    dropdownItem: {
      padding: 14,
      borderBottomWidth: 1,
    },
    dropdownItemText: {
      fontSize: 15,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 16,
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700' as const,
    },
    checkboxLabel: {
      fontSize: 15,
    },
    submitButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 40,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
  });
