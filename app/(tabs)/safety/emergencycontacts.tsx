import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Phone,
  ArrowLeft,
  Plus,
  Search,
  X,
  Building,
  User,
  Shield,
  Flame,
  Ambulance,
  Zap,
  Droplets,
  Wrench,
  Clock,
  CheckCircle2,
  Star,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useEmergencyContacts } from '@/hooks/useSafetyEmergencyPreparedness';
import { EmergencyContact, ContactPriority } from '@/types/emergencyPreparedness';

const CONTACT_CATEGORIES = [
  'Fire Department',
  'Police Department',
  'Ambulance/EMS',
  'Internal Safety',
  'Management',
  'Electric Utility',
  'Gas Utility',
  'Water Utility',
  'HVAC/Mechanical',
  'Hazmat Response',
  'Poison Control',
  'Insurance',
  'Legal',
  'Contractor',
  'Other',
];

const PRIORITY_LEVELS: { value: ContactPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#EF4444' },
  { value: 'high', label: 'High', color: '#F59E0B' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'low', label: 'Low', color: '#6B7280' },
];

const AVAILABILITY_OPTIONS = [
  '24/7',
  'M-F 8am-5pm',
  'M-F 6am-6pm',
  'M-F 7am-7pm',
  'Business Hours',
  'On-Call',
  'Weekdays Only',
  'Custom',
];

export default function EmergencyContactsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    contacts,
    isLoading,
    isRefetching,
    createContact,
    updateContact,
    deleteContact,
    isCreating,
    isUpdating,
    isDeleting,
    refetch,
  } = useEmergencyContacts();

  const [formData, setFormData] = useState({
    category: '',
    name: '',
    title: '',
    organization_name: '',
    primary_phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    available_hours: '',
    priority: 'medium' as ContactPriority,
    is_primary: false,
    notes: '',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      category: '',
      name: '',
      title: '',
      organization_name: '',
      primary_phone: '',
      secondary_phone: '',
      email: '',
      address: '',
      available_hours: '',
      priority: 'medium',
      is_primary: false,
      notes: '',
    });
    setEditingContact(null);
  };

  const handleSaveContact = async () => {
    if (!formData.name || !formData.primary_phone || !formData.category) {
      Alert.alert('Required Fields', 'Please enter contact name, primary phone, and category.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const contactData = {
        category: formData.category,
        name: formData.name,
        title: formData.title || undefined,
        organization_name: formData.organization_name || undefined,
        primary_phone: formData.primary_phone,
        secondary_phone: formData.secondary_phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        available_hours: formData.available_hours || undefined,
        priority: formData.priority,
        is_primary: formData.is_primary,
        last_verified: new Date().toISOString().split('T')[0],
        verified_by: 'Current User',
        notes: formData.notes || undefined,
      };

      if (editingContact) {
        await updateContact({ id: editingContact.id, ...contactData });
      } else {
        await createContact(contactData);
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      category: contact.category,
      name: contact.name,
      title: contact.title || '',
      organization_name: contact.organization_name || '',
      primary_phone: contact.primary_phone,
      secondary_phone: contact.secondary_phone || '',
      email: contact.email || '',
      address: contact.address || '',
      available_hours: contact.available_hours || '',
      priority: contact.priority,
      is_primary: contact.is_primary,
      notes: contact.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteContact(contact.id);
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact.');
            }
          },
        },
      ]
    );
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.organization_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || contact.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    if (!acc[contact.category]) {
      acc[contact.category] = [];
    }
    acc[contact.category].push(contact);
    return acc;
  }, {} as Record<string, EmergencyContact[]>);

  const getPriorityColor = (priority: string) => {
    return PRIORITY_LEVELS.find(p => p.value === priority)?.color || '#6B7280';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Fire Department': return Flame;
      case 'Police Department': return Shield;
      case 'Ambulance/EMS': return Ambulance;
      case 'Internal Safety': return User;
      case 'Management': return Building;
      case 'Electric Utility': return Zap;
      case 'Gas Utility': return Flame;
      case 'Water Utility': return Droplets;
      case 'HVAC/Mechanical': return Wrench;
      default: return Phone;
    }
  };

  const categories = [...new Set(contacts.map(c => c.category))];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Emergency Contacts' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Emergency Contacts',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <Pressable
          style={[
            styles.categoryChip,
            {
              backgroundColor: !selectedCategory ? '#0891B220' : colors.surface,
              borderColor: !selectedCategory ? '#0891B2' : colors.border,
            },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, { color: !selectedCategory ? '#0891B2' : colors.textSecondary }]}>
            All
          </Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === cat ? '#0891B220' : colors.surface,
                borderColor: selectedCategory === cat ? '#0891B2' : colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
          >
            <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? '#0891B2' : colors.textSecondary }]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <Phone size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {contacts.filter(c => c.priority === 'critical').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Critical</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{contacts.length}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {contacts.filter(c => c.available_hours === '24/7').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>24/7</Text>
          </View>
        </View>

        {Object.keys(groupedContacts).length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Phone size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Emergency Contacts</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tap the + button to add emergency contacts
            </Text>
          </View>
        ) : (
          Object.entries(groupedContacts).map(([category, categoryContacts]) => {
            const CategoryIcon = getCategoryIcon(category);
            return (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categorySectionHeader}>
                  <CategoryIcon size={18} color={colors.textSecondary} />
                  <Text style={[styles.categorySectionTitle, { color: colors.text }]}>{category}</Text>
                  <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.countText, { color: colors.textSecondary }]}>{categoryContacts.length}</Text>
                  </View>
                </View>

                {categoryContacts.map((contact) => (
                  <Pressable
                    key={contact.id}
                    style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleEditContact(contact)}
                  >
                    <View style={styles.contactHeader}>
                      <View style={styles.contactTitleRow}>
                        <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(contact.priority) }]} />
                        <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                        {contact.is_primary && (
                          <View style={[styles.primaryBadge, { backgroundColor: '#F59E0B20' }]}>
                            <Star size={10} color="#F59E0B" />
                            <Text style={[styles.primaryText, { color: '#F59E0B' }]}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.contactActions}>
                        <Pressable
                          onPress={() => handleEditContact(contact)}
                          style={styles.actionButton}
                        >
                          <Edit3 size={16} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteContact(contact)}
                          style={styles.actionButton}
                          disabled={isDeleting}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>

                    {contact.title && (
                      <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>{contact.title}</Text>
                    )}

                    <View style={styles.phoneRow}>
                      <Phone size={14} color="#0891B2" />
                      <Text style={[styles.phoneText, { color: '#0891B2' }]}>{contact.primary_phone}</Text>
                      {contact.secondary_phone && (
                        <>
                          <Text style={[styles.phoneSeparator, { color: colors.textSecondary }]}>|</Text>
                          <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{contact.secondary_phone}</Text>
                        </>
                      )}
                    </View>

                    <View style={styles.contactMeta}>
                      <View style={[styles.availabilityBadge, { backgroundColor: contact.available_hours === '24/7' ? '#10B98115' : colors.border }]}>
                        <Clock size={10} color={contact.available_hours === '24/7' ? '#10B981' : colors.textSecondary} />
                        <Text style={[styles.availabilityText, { color: contact.available_hours === '24/7' ? '#10B981' : colors.textSecondary }]}>
                          {contact.available_hours || 'Unknown'}
                        </Text>
                      </View>
                      <Text style={[styles.verifiedText, { color: colors.textSecondary }]}>
                        Verified: {contact.last_verified || 'Never'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#0891B2' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </Text>
            <Pressable onPress={handleSaveContact} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <ActivityIndicator size="small" color="#0891B2" />
              ) : (
                <Text style={[styles.saveButton, { color: '#0891B2' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {CONTACT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: formData.category === cat ? '#0891B220' : colors.surface,
                        borderColor: formData.category === cat ? '#0891B2' : colors.border,
                      },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category: cat }))}
                  >
                    <Text style={[styles.chipText, { color: formData.category === cat ? '#0891B2' : colors.textSecondary }]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Contact Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Name or Organization"
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Title/Role</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Safety Manager, Dispatch"
              placeholderTextColor={colors.textSecondary}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Organization</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Company or Department"
              placeholderTextColor={colors.textSecondary}
              value={formData.organization_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, organization_name: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Primary Phone *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.primary_phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, primary_phone: text }))}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Secondary Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Alternate"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.secondary_phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, secondary_phone: text }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="email@example.com"
              placeholderTextColor={colors.textSecondary}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Physical address"
              placeholderTextColor={colors.textSecondary}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Availability</Text>
            <View style={styles.chipContainer}>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.available_hours === opt ? '#10B98120' : colors.surface,
                      borderColor: formData.available_hours === opt ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, available_hours: opt }))}
                >
                  <Text style={[styles.chipText, { color: formData.available_hours === opt ? '#10B981' : colors.textSecondary }]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Priority Level</Text>
            <View style={styles.chipContainer}>
              {PRIORITY_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.priority === level.value ? level.color + '20' : colors.surface,
                      borderColor: formData.priority === level.value ? level.color : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, priority: level.value }))}
                >
                  <Text style={[styles.chipText, { color: formData.priority === level.value ? level.color : colors.textSecondary }]}>
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Primary Contact for Category</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.is_primary ? '#F59E0B' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, is_primary: !prev.is_primary }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.is_primary ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Account numbers, special instructions, etc."
              placeholderTextColor={colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  categoryScroll: { maxHeight: 44, marginBottom: 8 },
  categoryContainer: { paddingHorizontal: 16, gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontWeight: '500' as const },
  statsRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const },
  emptyState: {
    alignItems: 'center' as const,
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center' as const, marginTop: 8 },
  categorySection: { marginBottom: 20 },
  categorySectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  categorySectionTitle: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '500' as const },
  contactCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  contactHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 4,
  },
  contactTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  contactName: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  primaryBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  primaryText: { fontSize: 10, fontWeight: '500' as const },
  contactActions: { flexDirection: 'row' as const, gap: 8 },
  actionButton: { padding: 4 },
  contactTitle: { fontSize: 12, marginBottom: 8, marginLeft: 16 },
  phoneRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 8, marginLeft: 16 },
  phoneText: { fontSize: 14, fontWeight: '500' as const },
  phoneSeparator: { marginHorizontal: 4 },
  contactMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginLeft: 16,
  },
  availabilityBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  availabilityText: { fontSize: 10, fontWeight: '500' as const },
  verifiedText: { fontSize: 10 },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 80 },
  twoColumn: { flexDirection: 'row' as const, gap: 12 },
  halfWidth: { flex: 1 },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12 },
  toggleRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  toggleButton: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' as const },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  modalBottomPadding: { height: 40 },
  bottomPadding: { height: 80 },
});
