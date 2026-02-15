/**
 * TaskFeedPostLinker — Drop-in component for any form
 * 
 * Usage:
 *   <TaskFeedPostLinker
 *     onSelect={(postId, postNumber) => setLinkedPostId(postId)}
 *     onClear={() => setLinkedPostId(null)}
 *   />
 * 
 * Shows a toggle "Link to Issue Report?" — when enabled,
 * displays a searchable list of recent task feed posts.
 * Selecting one stores the link; the parent form handles saving.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Link2,
  Search,
  X,
  AlertTriangle,
  FileText,
  Clock,
  MapPin,
  ChevronRight,
  Siren,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRecentIssuePosts, TaskFeedPostSummary } from '@/hooks/useTaskFeedFormLinks';

interface Props {
  /** Called when a post is selected */
  onSelect: (postId: string, postNumber: string) => void;
  /** Called when selection is cleared */
  onClear: () => void;
  /** Currently selected post ID (for controlled mode) */
  selectedPostId?: string | null;
  /** Currently selected post number (for display) */
  selectedPostNumber?: string | null;
  /** Label override */
  label?: string;
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getIssueDescription(post: TaskFeedPostSummary): string {
  const fd = post.formData || {};
  // Try common field names for a brief description
  const desc = fd.description || fd.issue_description || fd.notes || '';
  if (typeof desc === 'string' && desc.length > 0) {
    return desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
  }
  return '';
}

export default function TaskFeedPostLinker({
  onSelect,
  onClear,
  selectedPostId,
  selectedPostNumber,
  label = 'Link to Issue Report?',
}: Props) {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(!!selectedPostId);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: posts, isLoading } = useRecentIssuePosts({
    limit: 50,
    enabled: enabled || showPicker,
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(p =>
      p.postNumber.toLowerCase().includes(q) ||
      p.templateName.toLowerCase().includes(q) ||
      (p.locationName && p.locationName.toLowerCase().includes(q)) ||
      (p.createdByName && p.createdByName.toLowerCase().includes(q))
    );
  }, [posts, searchQuery]);

  const handleToggle = useCallback((val: boolean) => {
    setEnabled(val);
    if (val) {
      setShowPicker(true);
    } else {
      onClear();
    }
  }, [onClear]);

  const handleSelectPost = useCallback((post: TaskFeedPostSummary) => {
    onSelect(post.id, post.postNumber);
    setShowPicker(false);
    setSearchQuery('');
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onClear();
    setEnabled(false);
  }, [onClear]);

  // ── Selected state display ────────────────────────────────
  if (selectedPostId && selectedPostNumber) {
    const selectedPost = posts?.find(p => p.id === selectedPostId);
    return (
      <View style={[styles.container, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <View style={styles.selectedRow}>
          <View style={[styles.linkIcon, { backgroundColor: colors.primary + '20' }]}>
            <Link2 size={14} color={colors.primary} />
          </View>
          <View style={styles.selectedInfo}>
            <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>Linked to Issue Report</Text>
            <Text style={[styles.selectedNumber, { color: colors.primary }]}>{selectedPostNumber}</Text>
            {selectedPost && (
              <Text style={[styles.selectedTemplate, { color: colors.textSecondary }]}>
                {selectedPost.templateName} • {formatRelativeDate(selectedPost.createdAt)}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={() => setShowPicker(true)} 
          style={[styles.changeButton, { borderColor: colors.primary + '30' }]}
        >
          <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
        </TouchableOpacity>

        {/* Picker Modal */}
        {renderPickerModal()}
      </View>
    );
  }

  // ── Toggle + picker ───────────────────────────────────────
  function renderPickerModal() {
    return (
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Issue Report</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.modalClose}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by post #, template, location..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Post List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading posts...</Text>
            </View>
          ) : filteredPosts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No matching posts found' : 'No task feed posts yet'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPosts}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isActive = item.holdStatus === 'active' || item.holdStatus === 'reinstated';
                const issueDesc = getIssueDescription(item);
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.postCard,
                      { 
                        backgroundColor: colors.surface, 
                        borderColor: isActive ? '#EF444440' : colors.border,
                        borderLeftColor: isActive ? '#EF4444' : colors.primary,
                      },
                    ]}
                    onPress={() => handleSelectPost(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.postCardHeader}>
                      <View style={styles.postCardLeft}>
                        <Text style={[styles.postNumber, { color: colors.primary }]}>
                          {item.postNumber}
                        </Text>
                        {isActive && (
                          <View style={styles.holdBadge}>
                            <Siren size={8} color="#FFFFFF" />
                            <Text style={styles.holdBadgeText}>HOLD</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                        {formatRelativeDate(item.createdAt)}
                      </Text>
                    </View>

                    <Text style={[styles.postTemplate, { color: colors.text }]}>
                      {item.templateName}
                    </Text>

                    {issueDesc ? (
                      <Text style={[styles.postDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {issueDesc}
                      </Text>
                    ) : null}

                    <View style={styles.postMeta}>
                      {item.locationName && (
                        <View style={styles.postMetaItem}>
                          <MapPin size={10} color={colors.textSecondary} />
                          <Text style={[styles.postMetaText, { color: colors.textSecondary }]}>
                            {item.locationName}
                          </Text>
                        </View>
                      )}
                      <View style={styles.postMetaItem}>
                        <Text style={[styles.postMetaText, { color: colors.textSecondary }]}>
                          by {item.createdByName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.selectIndicator}>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Link2 size={16} color={enabled ? colors.primary : colors.textSecondary} />
          <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: colors.primary + '60' }}
          thumbColor={enabled ? colors.primary : '#f4f3f4'}
        />
      </View>

      {renderPickerModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedNumber: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  selectedTemplate: {
    fontSize: 11,
    marginTop: 1,
  },
  clearButton: {
    padding: 4,
  },
  changeButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Modal ──
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
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },

  // ── Post Cards ──
  postCard: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    position: 'relative',
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  postCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postNumber: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  holdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    gap: 3,
  },
  holdBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  postDate: {
    fontSize: 11,
  },
  postTemplate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  postDesc: {
    fontSize: 12,
    marginBottom: 4,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  postMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postMetaText: {
    fontSize: 11,
  },
  selectIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
  },
});
