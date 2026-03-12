import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Bath,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Save,
  RotateCcw,
  ChevronDown,
  Droplets,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  completed: boolean;
  notes: string;
}

const RESTROOM_LOCATIONS = [
  "Building A - 1st Floor Men's",
  "Building A - 1st Floor Women's",
  "Building A - 2nd Floor Men's",
  "Building A - 2nd Floor Women's",
  'Building B - Production Area',
  'Building B - Office Area',
  'Warehouse - Main Restroom',
];

const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'completed' | 'notes'>[] = [
  { id: '1',  category: 'Toilets & Urinals', task: 'Clean and sanitize all toilets inside and out' },
  { id: '2',  category: 'Toilets & Urinals', task: 'Clean and sanitize urinals (if applicable)' },
  { id: '3',  category: 'Toilets & Urinals', task: 'Check toilet seats for damage' },
  { id: '4',  category: 'Toilets & Urinals', task: 'Ensure toilets flush properly' },
  { id: '5',  category: 'Sinks & Counters',  task: 'Clean and sanitize sinks' },
  { id: '6',  category: 'Sinks & Counters',  task: 'Wipe down countertops' },
  { id: '7',  category: 'Sinks & Counters',  task: 'Check faucets for proper operation' },
  { id: '8',  category: 'Sinks & Counters',  task: 'Clean soap dispensers exterior' },
  { id: '9',  category: 'Mirrors & Glass',   task: 'Clean all mirrors streak-free' },
  { id: '10', category: 'Mirrors & Glass',   task: 'Clean door glass panels' },
  { id: '11', category: 'Floors',            task: 'Sweep floor thoroughly' },
  { id: '12', category: 'Floors',            task: 'Mop floor with disinfectant' },
  { id: '13', category: 'Floors',            task: 'Clean floor drains' },
  { id: '14', category: 'Floors',            task: 'Check for standing water' },
  { id: '15', category: 'Supplies',          task: 'Restock toilet paper' },
  { id: '16', category: 'Supplies',          task: 'Restock paper towels' },
  { id: '17', category: 'Supplies',          task: 'Refill hand soap dispensers' },
  { id: '18', category: 'Supplies',          task: 'Refill hand sanitizer' },
  { id: '19', category: 'Trash & Waste',     task: 'Empty all trash receptacles' },
  { id: '20', category: 'Trash & Waste',     task: 'Replace trash liners' },
  { id: '21', category: 'Trash & Waste',     task: 'Clean feminine hygiene disposal units' },
  { id: '22', category: 'General',           task: 'Wipe down partition walls' },
  { id: '23', category: 'General',           task: 'Clean door handles and push plates' },
  { id: '24', category: 'General',           task: 'Check air freshener' },
  { id: '25', category: 'General',           task: 'Report any maintenance issues' },
];

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

export default function RestroomCleaningScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [selectedLocation, setSelectedLocation] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false, notes: '' }))
  );
  const [generalNotes, setGeneralNotes] = useState('');
  const [issuesFound, setIssuesFound] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(new Date());

  const categories = useMemo(() => [...new Set(checklist.map(item => item.category))], [checklist]);

  const completionStats = useMemo(() => {
    const completed = checklist.filter(item => item.completed).length;
    const total = checklist.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [checklist]);

  const handleToggleItem = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  }, []);

  const handleItemNote = useCallback((itemId: string, notes: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, notes } : item
    ));
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert('Reset Checklist', 'Are you sure you want to reset all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          setChecklist(DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false, notes: '' })));
          setGeneralNotes('');
          setIssuesFound('');
        },
      },
    ]);
  }, []);

  const submitChecklist = async () => {
    setIsSubmitting(true);
    try {
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { error } = await supabase.from('sanitation_work_orders').insert({
        org_id: ORG_ID,
        task_name: 'Restroom Cleaning',
        area: 'restroom',
        location: selectedLocation,
        status: 'completed',
        tech_name: user?.displayName || user?.email || 'Unknown',
        tech_id: user?.id || null,
        started_at: startTime.toISOString(),
        completed_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
        checklist_completion: checklist.map(item => ({
          item: item.task,
          category: item.category,
          completed: item.completed,
          notes: item.notes || null,
        })),
        issues_found: issuesFound || null,
        notes: generalNotes || null,
        result: issuesFound ? 'needs_attention' : 'pass',
        photos: [],
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Checklist Submitted',
        'Restroom cleaning checklist has been submitted successfully.',
        [{
          text: 'OK', onPress: () => {
            setChecklist(DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false, notes: '' })));
            setGeneralNotes('');
            setIssuesFound('');
            setSelectedLocation('');
          },
        }]
      );
    } catch (error) {
      console.error('[RestroomCleaning] Submit error:', error);
      Alert.alert('Error', 'Failed to submit checklist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedLocation) {
      Alert.alert('Missing Information', 'Please select a restroom location.');
      return;
    }
    if (completionStats.percentage < 100) {
      Alert.alert(
        'Incomplete Checklist',
        `You have completed ${completionStats.completed} of ${completionStats.total} items. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: submitChecklist },
        ]
      );
    } else {
      submitChecklist();
    }
  }, [selectedLocation, completionStats]);

  const renderCategoryItems = (category: string) =>
    checklist.filter(item => item.category === category).map(item => (
      <View key={item.id} style={[styles.checklistItem, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.checklistRow} onPress={() => handleToggleItem(item.id)}>
          {item.completed
            ? <CheckCircle2 size={22} color="#10B981" />
            : <Circle size={22} color={colors.textTertiary} />}
          <Text style={[
            styles.checklistText, { color: colors.text },
            item.completed && styles.completedText,
          ]}>
            {item.task}
          </Text>
        </Pressable>
        {item.completed && (
          <TextInput
            style={[styles.itemNoteInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
            placeholder="Add note (optional)"
            placeholderTextColor={colors.textTertiary}
            value={item.notes}
            onChangeText={(text) => handleItemNote(item.id, text)}
          />
        )}
      </View>
    ));

  const categoryIcon = (category: string) => {
    if (category === 'Toilets & Urinals') return <Droplets size={18} color="#3B82F6" />;
    if (category === 'Sinks & Counters')  return <Sparkles size={18} color="#10B981" />;
    if (category === 'Mirrors & Glass')   return <Sparkles size={18} color="#8B5CF6" />;
    if (category === 'Floors')            return <Sparkles size={18} color="#F59E0B" />;
    if (category === 'Supplies')          return <Sparkles size={18} color="#EC4899" />;
    if (category === 'Trash & Waste')     return <Sparkles size={18} color="#6366F1" />;
    return <Sparkles size={18} color="#14B8A6" />;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>

      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
          <Bath size={28} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Restroom Cleaning Checklist</Text>
        <View style={styles.timeRow}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            Started: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>Completion Progress</Text>
          <Text style={[styles.progressValue, { color: '#3B82F6' }]}>{completionStats.completed}/{completionStats.total}</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.progressFill, {
            width: `${completionStats.percentage}%`,
            backgroundColor: completionStats.percentage === 100 ? '#10B981' : '#3B82F6',
          }]} />
        </View>
        <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>{completionStats.percentage}% Complete</Text>
      </View>

      <Pressable
        style={[styles.locationSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowLocationPicker(!showLocationPicker)}
      >
        <View style={styles.locationLeft}>
          <MapPin size={20} color="#3B82F6" />
          <Text style={[styles.locationText, { color: selectedLocation ? colors.text : colors.textTertiary }]}>
            {selectedLocation || 'Select Restroom Location'}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </Pressable>

      {showLocationPicker && (
        <View style={[styles.locationList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {RESTROOM_LOCATIONS.map((location) => (
            <Pressable
              key={location}
              style={[
                styles.locationOption, { borderBottomColor: colors.border },
                selectedLocation === location && { backgroundColor: '#3B82F615' },
              ]}
              onPress={() => {
                setSelectedLocation(location);
                setShowLocationPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.locationOptionText, { color: selectedLocation === location ? '#3B82F6' : colors.text }]}>
                {location}
              </Text>
              {selectedLocation === location && <CheckCircle2 size={18} color="#3B82F6" />}
            </Pressable>
          ))}
        </View>
      )}

      {categories.map((category) => (
        <View key={category} style={[styles.categorySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.categoryHeader}>
            {categoryIcon(category)}
            <Text style={[styles.categoryTitle, { color: colors.text }]}>{category}</Text>
          </View>
          {renderCategoryItems(category)}
        </View>
      ))}

      <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.noteHeader}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={[styles.noteTitle, { color: colors.text }]}>Issues Found</Text>
        </View>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
          placeholder="Document any issues, maintenance needs, or problems found..."
          placeholderTextColor={colors.textTertiary}
          value={issuesFound}
          onChangeText={setIssuesFound}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.noteHeader}>
          <User size={18} color="#3B82F6" />
          <Text style={[styles.noteTitle, { color: colors.text }]}>General Notes</Text>
        </View>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
          placeholder="Add any additional notes or comments..."
          placeholderTextColor={colors.textTertiary}
          value={generalNotes}
          onChangeText={setGeneralNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={handleReset}>
          <RotateCcw size={18} color={colors.textSecondary} />
          <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: '#3B82F6' }, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color="#FFF" />
            : <><Save size={18} color="#FFF" /><Text style={styles.submitButtonText}>Submit Checklist</Text></>}
        </Pressable>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  headerCard: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 13 },
  progressCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressValue: { fontSize: 14, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPercent: { fontSize: 12, marginTop: 6, textAlign: 'right' },
  locationSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 8 },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationText: { fontSize: 15, fontWeight: '500' },
  locationList: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  locationOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  locationOptionText: { fontSize: 14 },
  categorySection: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  categoryTitle: { fontSize: 15, fontWeight: '600' },
  checklistItem: { borderBottomWidth: 1 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  checklistText: { flex: 1, fontSize: 14 },
  completedText: { textDecorationLine: 'line-through', opacity: 0.6 },
  itemNoteInput: { marginHorizontal: 14, marginBottom: 10, borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1 },
  notesSection: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  noteTitle: { fontSize: 15, fontWeight: '600' },
  notesInput: { borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1 },
  resetButtonText: { fontSize: 15, fontWeight: '600' },
  submitButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  submitButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  bottomPadding: { height: 40 },
});
