import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  Palette,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Languages,
  Save,
  X,
  ChevronDown,
  Image as ImageIcon,
  Briefcase,
  Users,
  Check,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ColorPicker from '@/components/ColorPicker';

type Organization = Tables['organizations'];

interface FormData {
  name: string;
  code: string;
  tagline: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  website: string;
  support_email: string;
  support_phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  industry: string;
  employee_count_range: string;
  fiscal_year_start_month: number;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  currency: string;
  language: string;
}

const INDUSTRIES = [
  'Agriculture',
  'Automotive',
  'Construction',
  'Education',
  'Energy',
  'Financial Services',
  'Food & Beverage',
  'Government',
  'Healthcare',
  'Hospitality',
  'Information Technology',
  'Manufacturing',
  'Mining',
  'Pharmaceutical',
  'Real Estate',
  'Retail',
  'Telecommunications',
  'Transportation',
  'Utilities',
  'Other',
];

const EMPLOYEE_RANGES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001-10000',
  '10000+',
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
  { value: 'MXN', label: 'Mexican Peso (MX$)', symbol: 'MX$' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function OrganizationSetupScreen() {
  const { colors, setCompanyColors } = useTheme();
  const { company } = useUser();
  const { organization, setOrganization } = useOrganization();
  const queryClient = useQueryClient();
  
  const [activeSection, setActiveSection] = useState<'general' | 'branding' | 'contact' | 'regional'>('general');
  const [showColorPicker, setShowColorPicker] = useState<'primary' | 'secondary' | 'accent' | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    tagline: '',
    logo_url: '',
    primary_color: '#1E40AF',
    secondary_color: '#0D9488',
    accent_color: '#F59E0B',
    website: '',
    support_email: '',
    support_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    industry: '',
    employee_count_range: '',
    fiscal_year_start_month: 1,
    timezone: 'America/Chicago',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    currency: 'USD',
    language: 'en',
  });

  const orgId = company?.id || organization?.id;

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      console.log('[OrgSetup] Fetching organization:', orgId);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (error) {
        console.error('[OrgSetup] Error fetching org:', error);
        throw error;
      }
      console.log('[OrgSetup] Loaded organization:', data?.name);
      return data as Organization;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (orgData) {
      setFormData({
        name: orgData.name || '',
        code: orgData.code || '',
        tagline: orgData.tagline || '',
        logo_url: orgData.logo_url || '',
        primary_color: orgData.primary_color || '#1E40AF',
        secondary_color: orgData.secondary_color || '#0D9488',
        accent_color: orgData.accent_color || '#F59E0B',
        website: orgData.website || '',
        support_email: orgData.support_email || '',
        support_phone: orgData.support_phone || '',
        address: orgData.address || '',
        city: orgData.city || '',
        state: orgData.state || '',
        zip_code: orgData.zip_code || '',
        country: orgData.country || 'USA',
        industry: orgData.industry || '',
        employee_count_range: orgData.employee_count_range || '',
        fiscal_year_start_month: orgData.fiscal_year_start_month || 1,
        timezone: orgData.timezone || 'America/Chicago',
        date_format: orgData.date_format || 'MM/DD/YYYY',
        time_format: orgData.time_format || '12h',
        currency: orgData.currency || 'USD',
        language: orgData.language || 'en',
      });
      // Sync brand colors to gradient bars
      const brandColors = [
        orgData.primary_color,
        orgData.secondary_color,
        orgData.accent_color,
      ].filter((c): c is string => !!c && c.length === 7);
      if (brandColors.length > 0) {
        setCompanyColors(brandColors);
      }
    }
  }, [orgData]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<FormData>) => {
      if (!orgId) throw new Error('No organization ID');
      console.log('[OrgSetup] Updating organization:', orgId, 'with:', updates);
      
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: updates.name,
          tagline: updates.tagline || null,
          logo_url: updates.logo_url || null,
          primary_color: updates.primary_color || null,
          secondary_color: updates.secondary_color || null,
          accent_color: updates.accent_color || null,
          website: updates.website || null,
          support_email: updates.support_email || null,
          support_phone: updates.support_phone || null,
          address: updates.address || null,
          city: updates.city || null,
          state: updates.state || null,
          zip_code: updates.zip_code || null,
          country: updates.country || null,
          industry: updates.industry || null,
          employee_count_range: updates.employee_count_range || null,
          fiscal_year_start_month: updates.fiscal_year_start_month || null,
          timezone: updates.timezone || null,
          date_format: updates.date_format || null,
          time_format: updates.time_format || null,
          currency: updates.currency || null,
          language: updates.language || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId)
        .select()
        .single();
      
      if (error) {
        const errorMessage = error.message || JSON.stringify(error);
        console.error('[OrgSetup] Update error:', errorMessage, 'Full error:', JSON.stringify(error));
        throw new Error(errorMessage);
      }
      return data as Organization;
    },
    onSuccess: (data) => {
      console.log('[OrgSetup] Update successful');
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      if (data) {
        setOrganization(data);
      }
      // Push brand colors to gradient bars
      const brandColors = [
        formData.primary_color,
        formData.secondary_color,
        formData.accent_color,
      ].filter(c => c && c.length === 7);
      setCompanyColors(brandColors);
      Alert.alert('Success', 'Organization settings updated successfully.');
    },
    onError: (error: Error) => {
      console.error('[OrgSetup] Update failed:', error.message);
      Alert.alert('Error', `Failed to update organization: ${error.message}`);
    },
  });

  const { mutate: updateOrg } = updateMutation;

  const handleSave = useCallback(() => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Organization name is required');
      return;
    }
    
    updateOrg(formData);
  }, [formData, updateOrg]);

  const renderSectionTab = (key: typeof activeSection, label: string, icon: typeof Building2) => {
    const Icon = icon;
    const isActive = activeSection === key;
    return (
      <Pressable
        style={[
          styles.sectionTab,
          { 
            backgroundColor: isActive ? colors.primary : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setActiveSection(key)}
      >
        <Icon size={16} color={isActive ? '#FFFFFF' : colors.textSecondary} />
        <Text style={[styles.sectionTabText, { color: isActive ? '#FFFFFF' : colors.text }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    icon: typeof Building2,
    options?: { multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url' }
  ) => {
    const Icon = icon;
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Icon size={18} color={colors.textTertiary} style={styles.inputIcon} />
          <TextInput
            style={[
              styles.input,
              { color: colors.text },
              options?.multiline && styles.multilineInput,
            ]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline={options?.multiline}
            keyboardType={options?.keyboardType}
            autoCapitalize="none"
          />
        </View>
      </View>
    );
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (value: string) => void,
    icon: typeof Building2,
    dropdownKey: string
  ) => {
    const Icon = icon;
    const selectedOption = options.find(o => o.value === value);
    
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Pressable
          style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setShowDropdown(showDropdown === dropdownKey ? null : dropdownKey)}
        >
          <Icon size={18} color={colors.textTertiary} style={styles.inputIcon} />
          <Text style={[styles.dropdownText, { color: value ? colors.text : colors.textTertiary }]}>
            {selectedOption?.label || 'Select...'}
          </Text>
          <ChevronDown size={18} color={colors.textTertiary} />
        </Pressable>
        {showDropdown === dropdownKey && (
          <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.border },
                    value === option.value && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setShowDropdown(null);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{option.label}</Text>
                  {value === option.value && <Check size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderColorPicker = (label: string, colorKey: 'primary' | 'secondary' | 'accent') => {
    const value = formData[`${colorKey}_color`];
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Pressable
          style={[styles.colorPickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setShowColorPicker(colorKey)}
        >
          <View style={[styles.colorPreview, { backgroundColor: value }]} />
          <Text style={[styles.colorValue, { color: colors.text }]}>{value}</Text>
          <Palette size={18} color={colors.textTertiary} />
        </Pressable>
      </View>
    );
  };

  const renderGeneralSection = () => (
    <View style={styles.sectionContent}>
      {renderInput('Organization Name', formData.name, (v) => setFormData(prev => ({ ...prev, name: v })), 'Enter organization name', Building2)}
      {renderInput('Organization Code', formData.code, () => {}, 'Auto-generated', Building2)}
      {renderInput('Tagline / Slogan', formData.tagline, (v) => setFormData(prev => ({ ...prev, tagline: v })), 'Your company tagline', Info)}
      {renderDropdown(
        'Industry',
        formData.industry,
        INDUSTRIES.map(i => ({ value: i, label: i })),
        (v) => setFormData(prev => ({ ...prev, industry: v })),
        Briefcase,
        'industry'
      )}
      {renderDropdown(
        'Employee Count',
        formData.employee_count_range,
        EMPLOYEE_RANGES.map(r => ({ value: r, label: r + ' employees' })),
        (v) => setFormData(prev => ({ ...prev, employee_count_range: v })),
        Users,
        'employees'
      )}
    </View>
  );

  const renderBrandingSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.brandPreview}>
        <View style={[styles.brandPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {formData.logo_url ? (
            <Image source={{ uri: formData.logo_url }} style={styles.logoPreview} resizeMode="contain" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: formData.primary_color }]}>
              <Building2 size={32} color="#FFFFFF" />
            </View>
          )}
          <Text style={[styles.brandPreviewName, { color: colors.text }]}>{formData.name || 'Organization Name'}</Text>
          {formData.tagline && (
            <Text style={[styles.brandPreviewTagline, { color: colors.textSecondary }]}>{formData.tagline}</Text>
          )}
          <View style={styles.colorStrip}>
            <View style={[styles.colorStripItem, { backgroundColor: formData.primary_color }]} />
            <View style={[styles.colorStripItem, { backgroundColor: formData.secondary_color }]} />
            <View style={[styles.colorStripItem, { backgroundColor: formData.accent_color }]} />
          </View>
        </View>
      </View>
      
      {renderInput('Logo URL', formData.logo_url, (v) => setFormData(prev => ({ ...prev, logo_url: v })), 'https://example.com/logo.png', ImageIcon, { keyboardType: 'url' })}
      
      <Text style={[styles.subSectionTitle, { color: colors.text }]}>Brand Colors</Text>
      {renderColorPicker('Primary Color', 'primary')}
      {renderColorPicker('Secondary Color', 'secondary')}
      {renderColorPicker('Accent Color', 'accent')}

      <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 16 }]}>Gradient Preview</Text>
      <View style={[styles.gradientPreviewBox, { borderColor: colors.border }]}>
        <LinearGradient
          colors={[formData.primary_color, formData.secondary_color, formData.accent_color] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientPreviewBar}
        />
        <Text style={[styles.gradientPreviewHint, { color: colors.textTertiary }]}>
          This gradient will appear on the header and navigation bars
        </Text>
      </View>
      
      <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
        <Info size={16} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.info }]}>
          Brand colors set the gradient on the top header and bottom navigation bars across the entire app. Hit Save to apply.
        </Text>
      </View>
    </View>
  );

  const renderContactSection = () => (
    <View style={styles.sectionContent}>
      {renderInput('Website', formData.website, (v) => setFormData(prev => ({ ...prev, website: v })), 'https://www.example.com', Globe, { keyboardType: 'url' })}
      {renderInput('Support Email', formData.support_email, (v) => setFormData(prev => ({ ...prev, support_email: v })), 'support@example.com', Mail, { keyboardType: 'email-address' })}
      {renderInput('Support Phone', formData.support_phone, (v) => setFormData(prev => ({ ...prev, support_phone: v })), '+1 (555) 123-4567', Phone, { keyboardType: 'phone-pad' })}
      
      <Text style={[styles.subSectionTitle, { color: colors.text }]}>Address</Text>
      {renderInput('Street Address', formData.address, (v) => setFormData(prev => ({ ...prev, address: v })), '123 Main Street', MapPin)}
      
      <View style={styles.rowInputs}>
        <View style={styles.halfInput}>
          {renderInput('City', formData.city, (v) => setFormData(prev => ({ ...prev, city: v })), 'City', MapPin)}
        </View>
        <View style={styles.halfInput}>
          {renderInput('State', formData.state, (v) => setFormData(prev => ({ ...prev, state: v })), 'State', MapPin)}
        </View>
      </View>
      
      <View style={styles.rowInputs}>
        <View style={styles.halfInput}>
          {renderInput('ZIP Code', formData.zip_code, (v) => setFormData(prev => ({ ...prev, zip_code: v })), '12345', MapPin)}
        </View>
        <View style={styles.halfInput}>
          {renderInput('Country', formData.country, (v) => setFormData(prev => ({ ...prev, country: v })), 'USA', MapPin)}
        </View>
      </View>
    </View>
  );

  const renderRegionalSection = () => (
    <View style={styles.sectionContent}>
      {renderDropdown(
        'Timezone',
        formData.timezone,
        TIMEZONES,
        (v) => setFormData(prev => ({ ...prev, timezone: v })),
        Clock,
        'timezone'
      )}
      {renderDropdown(
        'Date Format',
        formData.date_format,
        DATE_FORMATS,
        (v) => setFormData(prev => ({ ...prev, date_format: v })),
        Calendar,
        'date_format'
      )}
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Time Format</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[
              styles.toggleOption,
              { 
                backgroundColor: formData.time_format === '12h' ? colors.primary : colors.backgroundSecondary,
                borderColor: formData.time_format === '12h' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFormData(prev => ({ ...prev, time_format: '12h' }))}
          >
            <Text style={[styles.toggleText, { color: formData.time_format === '12h' ? '#FFFFFF' : colors.text }]}>
              12-hour (AM/PM)
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleOption,
              { 
                backgroundColor: formData.time_format === '24h' ? colors.primary : colors.backgroundSecondary,
                borderColor: formData.time_format === '24h' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFormData(prev => ({ ...prev, time_format: '24h' }))}
          >
            <Text style={[styles.toggleText, { color: formData.time_format === '24h' ? '#FFFFFF' : colors.text }]}>
              24-hour
            </Text>
          </Pressable>
        </View>
      </View>
      
      {renderDropdown(
        'Currency',
        formData.currency,
        CURRENCIES.map(c => ({ value: c.value, label: c.label })),
        (v) => setFormData(prev => ({ ...prev, currency: v })),
        DollarSign,
        'currency'
      )}
      {renderDropdown(
        'Fiscal Year Start',
        String(formData.fiscal_year_start_month),
        MONTHS.map(m => ({ value: String(m.value), label: m.label })),
        (v) => setFormData(prev => ({ ...prev, fiscal_year_start_month: parseInt(v) })),
        Calendar,
        'fiscal_month'
      )}
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Language</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Languages size={18} color={colors.textTertiary} style={styles.inputIcon} />
          <Text style={[styles.dropdownText, { color: colors.text }]}>English (US)</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading organization settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
            <Building2 size={24} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Organization Setup</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Configure your company profile and branding
            </Text>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          {renderSectionTab('general', 'General', Building2)}
          {renderSectionTab('branding', 'Branding', Palette)}
          {renderSectionTab('contact', 'Contact', Phone)}
          {renderSectionTab('regional', 'Regional', Globe)}
        </ScrollView>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {activeSection === 'general' && renderGeneralSection()}
          {activeSection === 'branding' && renderBrandingSection()}
          {activeSection === 'contact' && renderContactSection()}
          {activeSection === 'regional' && renderRegionalSection()}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showColorPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.colorPickerModal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Choose {showColorPicker === 'primary' ? 'Primary' : showColorPicker === 'secondary' ? 'Secondary' : 'Accent'} Color
              </Text>
              <Pressable onPress={() => setShowColorPicker(null)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <ColorPicker
                label=""
                value={showColorPicker ? formData[`${showColorPicker}_color`] : '#000000'}
                onChange={(hex) => {
                  if (showColorPicker) {
                    setFormData(prev => ({ ...prev, [`${showColorPicker}_color`]: hex }));
                  }
                }}
                textColor={colors.textSecondary}
                borderColor={colors.border}
              />
            </ScrollView>
            <Pressable
              style={[styles.colorDoneButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowColorPicker(null)}
            >
              <Text style={styles.colorDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
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
  sectionTabs: {
    marginBottom: 16,
  },
  sectionTabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionContent: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
  },
  dropdownList: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  colorValue: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'monospace',
  },
  brandPreview: {
    marginBottom: 8,
  },
  brandPreviewCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandPreviewName: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  brandPreviewTagline: {
    fontSize: 13,
    marginTop: 4,
  },
  colorStrip: {
    flexDirection: 'row',
    marginTop: 16,
    borderRadius: 6,
    overflow: 'hidden',
  },
  colorStripItem: {
    width: 40,
    height: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  colorPickerModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  colorDoneButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  colorDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  gradientPreviewBox: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientPreviewBar: {
    height: 48,
  },
  gradientPreviewHint: {
    fontSize: 12,
    textAlign: 'center' as const,
    paddingVertical: 8,
  },
});
