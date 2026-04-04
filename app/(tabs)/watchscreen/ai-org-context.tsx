// app/(tabs)/watchscreen/ai-org-context.tsx
// TulKenz OPS — AI Org Context Manager
// Platform Admin ONLY — manages knowledge the AI reads on every conversation

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const HUD_BG     = '#0a0e1a';
const HUD_CARD   = '#0d1117';
const HUD_BORDER = '#1a2332';
const HUD_ACCENT = '#00d4ff';
const HUD_GREEN  = '#00ff88';
const HUD_YELLOW = '#ffcc00';
const HUD_RED    = '#ff4444';
const HUD_ORANGE = '#ff8800';
const HUD_PURPLE = '#9945ff';
const HUD_TEXT   = '#e2e8f0';
const HUD_DIM    = '#64748b';
const HUD_BRIGHT = '#ffffff';

const FALLBACK_ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

const CATEGORIES = [
  'Permissions',
  'Roles & Access',
  'Rooms & Layout',
  'Products',
  'Processes',
  'Equipment',
  'Contacts',
  'Schedules',
  'Policies',
  'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Permissions':    HUD_RED,
  'Roles & Access': HUD_ORANGE,
  'Rooms & Layout': HUD_ACCENT,
  'Products':       HUD_GREEN,
  'Processes':      HUD_PURPLE,
  'Equipment':      HUD_YELLOW,
  'Contacts':       '#06B6D4',
  'Schedules':      '#EC4899',
  'Policies':       '#84CC16',
  'Other':          HUD_DIM,
};

interface OrgContextEntry {
  id: string;
  organization_id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function AIOrgContextScreen() {
  const router = useRouter();
  const { userProfile } = useUser();
  const queryClient = useQueryClient();
  const orgId = userProfile?.organization_id || FALLBACK_ORG_ID;

  const isAuthorized =
    userProfile?.is_platform_admin === true ||
    userProfile?.role === 'superadmin' ||
    userProfile?.role === 'super_admin' ||
    userProfile?.role === 'platform_admin';

  const [refreshing, setRefreshing]     = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [editingEntry, setEditingEntry] = useState<OrgContextEntry | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [saving, setSaving]             = useState(false);

  // Form state
  const [fCategory, setFCategory] = useState(CATEGORIES[0]);
  const [fTitle, setFTitle]       = useState('');
  const [fContent, setFContent]   = useState('');
  const [fActive, setFActive]     = useState(true);

  // Load entries
  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['ai_org_context', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_org_context')
        .select('*')
        .eq('organization_id', orgId)
        .order('category')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as OrgContextEntry[];
    },
    enabled: !!orgId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Save (create or update)
  const saveEntry = async () => {
    if (!fTitle.trim() || !fContent.trim()) {
      Alert.alert('Required', 'Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingEntry) {
        const { error } = await supabase
          .from('ai_org_context')
          .update({
            category: fCategory,
            title: fTitle.trim(),
            content: fContent.trim(),
            is_active: fActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_org_context')
          .insert({
            organization_id: orgId,
            category: fCategory,
            title: fTitle.trim(),
            content: fContent.trim(),
            is_active: fActive,
            sort_order: entries.filter(e => e.category === fCategory).length,
            created_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Platform Admin',
          });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['ai_org_context', orgId] });
      closeModal();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active
  const toggleActive = async (entry: OrgContextEntry) => {
    try {
      await supabase
        .from('ai_org_context')
        .update({ is_active: !entry.is_active, updated_at: new Date().toISOString() })
        .eq('id', entry.id);
      queryClient.invalidateQueries({ queryKey: ['ai_org_context', orgId] });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Delete
  const deleteEntry = (entry: OrgContextEntry) => {
    Alert.alert(
      'Delete Entry',
      `Delete "${entry.title}"? The AI will no longer have this knowledge.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('ai_org_context').delete().eq('id', entry.id);
            queryClient.invalidateQueries({ queryKey: ['ai_org_context', orgId] });
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }},
      ]
    );
  };

  const openCreate = () => {
    setEditingEntry(null);
    setFCategory(CATEGORIES[0]);
    setFTitle('');
    setFContent('');
    setFActive(true);
    setShowModal(true);
  };

  const openEdit = (entry: OrgContextEntry) => {
    setEditingEntry(entry);
    setFCategory(entry.category);
    setFTitle(entry.title);
    setFContent(entry.content);
    setFActive(entry.is_active);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setFTitle('');
    setFContent('');
  };

  if (!isAuthorized) {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="shield-checkmark" size={64} color={HUD_RED} />
        <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
        <Text style={styles.unauthorizedSub}>Platform administrators only.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Filter entries
  const filteredEntries = categoryFilter === 'All'
    ? entries
    : entries.filter(e => e.category === categoryFilter);

  // Group by category for display
  const grouped: Record<string, OrgContextEntry[]> = {};
  filteredEntries.forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });

  const activeCount   = entries.filter(e => e.is_active).length;
  const inactiveCount = entries.filter(e => !e.is_active).length;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="brain-outline" size={18} color={HUD_PURPLE} />
            <Text style={styles.headerTitle}>AI KNOWLEDGE BASE</Text>
          </View>
          <Text style={styles.headerSub}>Platform Admin · AI reads this on every conversation</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={16} color={HUD_BG} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Strip */}
      <View style={styles.kpiStrip}>
        {[
          { label: 'TOTAL',    value: entries.length, color: HUD_ACCENT  },
          { label: 'ACTIVE',   value: activeCount,    color: HUD_GREEN   },
          { label: 'INACTIVE', value: inactiveCount,  color: HUD_DIM     },
          { label: 'CATS',     value: Object.keys(grouped).length || CATEGORIES.length, color: HUD_PURPLE },
        ].map(k => (
          <View key={k.label} style={[styles.kpiCard, { borderTopColor: k.color }]}>
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={HUD_ACCENT} />
        <Text style={styles.infoText}>
          Active entries are injected into the AI system prompt on every conversation. The AI treats them as authoritative facility knowledge.
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {['All', ...CATEGORIES].map(cat => {
          const color = cat === 'All' ? HUD_ACCENT : (CATEGORY_COLORS[cat] || HUD_DIM);
          const isSelected = categoryFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, { borderColor: isSelected ? color : HUD_BORDER }, isSelected && { backgroundColor: color + '20' }]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.filterChipText, { color: isSelected ? color : HUD_DIM }]}>
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Entry List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={HUD_ACCENT} />
          <Text style={styles.loadingText}>Loading knowledge base...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_ACCENT} />}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={48} color={HUD_DIM} />
              <Text style={styles.emptyTitle}>No Knowledge Entries Yet</Text>
              <Text style={styles.emptySub}>
                Add entries to teach the AI about your facility — role permissions, room layouts, products, processes, and more.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
                <Ionicons name="add-circle-outline" size={20} color={HUD_ACCENT} />
                <Text style={styles.emptyAddBtnText}>Add First Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Object.entries(grouped).map(([category, catEntries]) => {
              const catColor = CATEGORY_COLORS[category] || HUD_DIM;
              return (
                <View key={category} style={styles.categoryGroup}>
                  <View style={styles.categoryHeader}>
                    <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                    <Text style={[styles.categoryTitle, { color: catColor }]}>
                      {category.toUpperCase()}
                    </Text>
                    <Text style={styles.categoryCount}>{catEntries.length}</Text>
                  </View>
                  {catEntries.map(entry => (
                    <View
                      key={entry.id}
                      style={[
                        styles.entryCard,
                        !entry.is_active && styles.entryCardInactive,
                        { borderLeftColor: catColor },
                      ]}
                    >
                      <View style={styles.entryHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.entryTitle, !entry.is_active && { color: HUD_DIM }]}>
                            {entry.title}
                          </Text>
                          {!entry.is_active && (
                            <View style={styles.inactiveBadge}>
                              <Text style={styles.inactiveBadgeText}>INACTIVE — AI ignoring this</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.entryActions}>
                          {/* Toggle */}
                          <TouchableOpacity
                            style={[styles.toggleBtn, { backgroundColor: entry.is_active ? HUD_GREEN + '22' : HUD_DIM + '22' }]}
                            onPress={() => toggleActive(entry)}
                          >
                            <Ionicons
                              name={entry.is_active ? 'eye-outline' : 'eye-off-outline'}
                              size={14}
                              color={entry.is_active ? HUD_GREEN : HUD_DIM}
                            />
                          </TouchableOpacity>
                          {/* Edit */}
                          <TouchableOpacity
                            style={[styles.toggleBtn, { backgroundColor: HUD_ACCENT + '22' }]}
                            onPress={() => openEdit(entry)}
                          >
                            <Ionicons name="pencil-outline" size={14} color={HUD_ACCENT} />
                          </TouchableOpacity>
                          {/* Delete */}
                          <TouchableOpacity
                            style={[styles.toggleBtn, { backgroundColor: HUD_RED + '15' }]}
                            onPress={() => deleteEntry(entry)}
                          >
                            <Ionicons name="trash-outline" size={14} color={HUD_RED} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.entryContent} numberOfLines={3}>
                        {entry.content}
                      </Text>
                      <Text style={styles.entryMeta}>
                        Updated {new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {entry.created_by ? ` · By ${entry.created_by}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* ── Add/Edit Modal ── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingEntry ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
            </Text>
            <Text style={styles.modalSub}>
              The AI will read this on every conversation in your org.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Category */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Category <Text style={{ color: HUD_RED }}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {CATEGORIES.map(cat => {
                      const color = CATEGORY_COLORS[cat] || HUD_DIM;
                      const isSelected = fCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.catChip, { borderColor: isSelected ? color : HUD_BORDER }, isSelected && { backgroundColor: color + '25' }]}
                          onPress={() => setFCategory(cat)}
                        >
                          <Text style={[styles.catChipText, { color: isSelected ? color : HUD_DIM }]}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Title */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Title <Text style={{ color: HUD_RED }}>*</Text></Text>
                <Text style={styles.fieldHint}>Short label for this piece of knowledge</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Parts Coordinator Extended Permissions"
                  placeholderTextColor={HUD_DIM}
                  value={fTitle}
                  onChangeText={setFTitle}
                />
              </View>

              {/* Content */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Content <Text style={{ color: HUD_RED }}>*</Text></Text>
                <Text style={styles.fieldHint}>The actual knowledge — be specific and factual</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="e.g. Virginia Kessler holds the Parts Coordinator position but also manages Sanitation PMs, Facility PMs, Production room labor tracking, and blade software. Her permissions extend beyond her job title."
                  placeholderTextColor={HUD_DIM}
                  value={fContent}
                  onChangeText={setFContent}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {/* Active toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Text style={styles.toggleHint}>Inactive entries are saved but the AI ignores them</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, fActive && styles.toggleActive]}
                  onPress={() => setFActive(!fActive)}
                >
                  <View style={[styles.toggleThumb, fActive && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Preview */}
              {fTitle.trim() && fContent.trim() && (
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>AI WILL READ THIS AS:</Text>
                  <Text style={styles.previewText}>
                    - {fTitle.trim()}: {fContent.trim()}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, (!fTitle.trim() || !fContent.trim()) && { opacity: 0.4 }]}
                  onPress={saveEntry}
                  disabled={saving || !fTitle.trim() || !fContent.trim()}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={HUD_BG} />
                    : <Text style={styles.modalSaveText}>{editingEntry ? 'Update Entry' : 'Add to Knowledge Base'}</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD_BG },

  unauthorized: { flex: 1, backgroundColor: HUD_BG, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  unauthorizedTitle: { fontSize: 20, fontWeight: '700', color: HUD_BRIGHT },
  unauthorizedSub: { fontSize: 14, color: HUD_DIM, textAlign: 'center' },
  backBtn: { marginTop: 16, backgroundColor: HUD_ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { fontSize: 14, fontWeight: '700', color: HUD_BG },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  headerBackBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: HUD_ACCENT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD_BRIGHT, letterSpacing: 1 },
  headerSub: { fontSize: 11, color: HUD_DIM, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD_PURPLE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },

  kpiStrip: { flexDirection: 'row', backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderTopWidth: 3 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 8, color: HUD_DIM, letterSpacing: 0.5, marginTop: 2 },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: HUD_ACCENT + '10', borderBottomWidth: 1, borderBottomColor: HUD_ACCENT + '25', paddingHorizontal: 16, paddingVertical: 10 },
  infoText: { flex: 1, fontSize: 11, color: HUD_DIM, lineHeight: 16 },

  filterBar: { backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER, maxHeight: 48 },
  filterBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  filterChipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadingText: { fontSize: 12, color: HUD_DIM, letterSpacing: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: HUD_BRIGHT },
  emptySub: { fontSize: 13, color: HUD_DIM, textAlign: 'center', lineHeight: 19, paddingHorizontal: 24 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: HUD_ACCENT + '15', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: HUD_ACCENT + '40' },
  emptyAddBtnText: { fontSize: 14, color: HUD_ACCENT, fontWeight: '600' },

  categoryGroup: { marginBottom: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, flex: 1 },
  categoryCount: { fontSize: 10, color: HUD_DIM, backgroundColor: HUD_CARD, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: HUD_BORDER },

  entryCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderLeftWidth: 3, borderRadius: 10, padding: 12, marginBottom: 8 },
  entryCardInactive: { opacity: 0.55 },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  entryTitle: { fontSize: 14, fontWeight: '700', color: HUD_BRIGHT },
  inactiveBadge: { backgroundColor: HUD_DIM + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 3, alignSelf: 'flex-start' },
  inactiveBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_DIM, letterSpacing: 0.5 },
  entryActions: { flexDirection: 'row', gap: 4 },
  toggleBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  entryContent: { fontSize: 12, color: HUD_DIM, lineHeight: 18, marginBottom: 6 },
  entryMeta: { fontSize: 10, color: HUD_DIM + '99' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: HUD_CARD, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: HUD_BORDER, padding: 20, paddingBottom: 20, maxHeight: '92%' },
  modalHandle: { width: 36, height: 4, backgroundColor: HUD_BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: HUD_BRIGHT, marginBottom: 2 },
  modalSub: { fontSize: 12, color: HUD_DIM, marginBottom: 16, lineHeight: 17 },

  fieldWrap: { gap: 4, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: HUD_DIM, letterSpacing: 0.5 },
  fieldHint: { fontSize: 10, color: HUD_DIM + '88', marginBottom: 2 },
  input: { backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: HUD_TEXT, fontSize: 14 },
  inputMulti: { minHeight: 100, paddingTop: 10 },

  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '600' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  toggleLabelWrap: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 13, color: HUD_TEXT, fontWeight: '500' },
  toggleHint: { fontSize: 11, color: HUD_DIM },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: HUD_BORDER, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: HUD_GREEN + '66' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: HUD_DIM },
  toggleThumbActive: { backgroundColor: HUD_GREEN, alignSelf: 'flex-end' },

  previewCard: { backgroundColor: HUD_PURPLE + '12', borderWidth: 1, borderColor: HUD_PURPLE + '33', borderRadius: 8, padding: 12, marginBottom: 16 },
  previewLabel: { fontSize: 9, fontWeight: '800', color: HUD_PURPLE, letterSpacing: 1, marginBottom: 6 },
  previewText: { fontSize: 12, color: HUD_DIM, lineHeight: 17 },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: HUD_BORDER, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: HUD_TEXT, fontWeight: '600' },
  modalSave: { flex: 2, paddingVertical: 12, borderRadius: 8, backgroundColor: HUD_PURPLE, alignItems: 'center' },
  modalSaveText: { fontSize: 14, color: HUD_BG, fontWeight: '700' },
});
