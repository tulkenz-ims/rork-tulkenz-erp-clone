import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Star,
  Zap,
  Shield,
  Crown,
  Check,
  ChevronDown,
  Users,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  Link,
  Palette,
  Image as ImageIcon,
  UserCog,
  Key,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Tables } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Organization = Tables['organizations'];
type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'enterprise_plus';

const SUBSCRIPTION_TIERS: { value: SubscriptionTier; label: string; icon: typeof Star; color: string; description: string }[] = [
  { value: 'starter', label: 'Starter', icon: Star, color: '#6B7280', description: 'Basic features for small teams' },
  { value: 'professional', label: 'Professional', icon: Zap, color: '#3B82F6', description: 'Advanced features & integrations' },
  { value: 'enterprise', label: 'Enterprise', icon: Shield, color: '#8B5CF6', description: 'Full platform access' },
  { value: 'enterprise_plus', label: 'Enterprise Plus', icon: Crown, color: '#F59E0B', description: 'Custom solutions & priority support' },
];

const INDUSTRIES = [
  'Agriculture', 'Automotive', 'Construction', 'Education', 'Energy',
  'Financial Services', 'Food & Beverage', 'Government', 'Healthcare',
  'Hospitality', 'Information Technology', 'Manufacturing', 'Mining',
  'Pharmaceutical', 'Real Estate', 'Retail', 'Telecommunications',
  'Transportation', 'Utilities', 'Other',
];

interface OrganizationFormData {
  name: string;
  code: string;
  subscription_tier: SubscriptionTier;
  industry: string;
  employee_count_range: string;
  timezone: string;
  country: string;
  // Contact & Address
  support_email: string;
  support_phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  // Branding
  tagline: string;
  logo_url: string;
  // SuperAdmin
  superadmin_first_name: string;
  superadmin_last_name: string;
  superadmin_password: string;
}

interface OrgSuperAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const generateOrgCode = (name: string): string => {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${random}`;
};

export default function OrganizationsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    code: '',
    subscription_tier: 'starter',
    industry: '',
    employee_count_range: '',
    timezone: 'America/Chicago',
    country: 'USA',
    support_email: '',
    support_phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    tagline: '',
    logo_url: '',
    superadmin_first_name: '',
    superadmin_last_name: '',
    superadmin_password: '',
  });
  
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'branding' | 'superadmin'>('general');
  const [orgSuperAdmins, setOrgSuperAdmins] = useState<Record<string, OrgSuperAdmin | null>>({});

  const { data: organizations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      console.log('[OrgMgmt] Fetching all organizations...');
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        const errorMsg = error?.message || error?.details || JSON.stringify(error);
        console.error('[OrgMgmt] Error fetching organizations:', errorMsg, 'Full error:', JSON.stringify(error, null, 2));
        throw new Error(errorMsg);
      }
      console.log('[OrgMgmt] Loaded', data?.length, 'organizations');
      
      // Fetch superadmins for all organizations
      if (data && data.length > 0) {
        const orgIds = data.map(o => o.id);
        const { data: admins } = await supabase
          .from('employees')
          .select('id, organization_id, email, first_name, last_name, role')
          .in('organization_id', orgIds)
          .in('role', ['super_admin', 'admin']);
        
        const adminMap: Record<string, OrgSuperAdmin | null> = {};
        data.forEach(org => {
          const admin = admins?.find(a => a.organization_id === org.id);
          adminMap[org.id] = admin ? {
            id: admin.id,
            email: admin.email,
            first_name: admin.first_name,
            last_name: admin.last_name,
            role: admin.role,
          } : null;
        });
        setOrgSuperAdmins(adminMap);
      }
      
      return data as Organization[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newOrg: OrganizationFormData) => {
      console.log('[OrgMgmt] Creating organization:', newOrg.name);
      const orgCode = newOrg.code || generateOrgCode(newOrg.name);
      
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: newOrg.name,
          code: orgCode,
          subscription_tier: newOrg.subscription_tier,
          industry: newOrg.industry || null,
          employee_count_range: newOrg.employee_count_range || null,
          timezone: newOrg.timezone || 'America/Chicago',
          country: newOrg.country || 'USA',
          support_email: newOrg.support_email || null,
          support_phone: newOrg.support_phone || null,
          website: newOrg.website || null,
          address: newOrg.address || null,
          city: newOrg.city || null,
          state: newOrg.state || null,
          zip_code: newOrg.zip_code || null,
          tagline: newOrg.tagline || null,
          logo_url: newOrg.logo_url || null,
        })
        .select()
        .single();
      
      if (error) {
        const errorMsg = error?.message || error?.details || JSON.stringify(error);
        console.error('[OrgMgmt] Create error:', errorMsg, 'Full error:', JSON.stringify(error, null, 2));
        throw new Error(errorMsg);
      }
      
      // Create SuperAdmin employee if email provided
      if (newOrg.support_email && data) {
        console.log('[OrgMgmt] Creating SuperAdmin for org:', data.id);
        const empCode = `SA${orgCode.substring(0, 3)}01`;
        
        const { error: empError } = await supabase
          .from('employees')
          .insert({
            organization_id: data.id,
            employee_code: empCode,
            pin: newOrg.superadmin_password || '123456',
            first_name: newOrg.superadmin_first_name || 'Super',
            last_name: newOrg.superadmin_last_name || 'Admin',
            email: newOrg.support_email.toLowerCase(),
            role: 'super_admin',
            position: 'Organization Administrator',
            status: 'active',
          });
        
        if (empError) {
          console.error('[OrgMgmt] Failed to create SuperAdmin:', empError.message);
          // Don't fail the whole operation, just warn
          Alert.alert('Warning', `Organization created but SuperAdmin setup failed: ${empError.message}`);
        } else {
          console.log('[OrgMgmt] SuperAdmin created successfully');
        }
      }
      
      return data;
    },
    onSuccess: () => {
      console.log('[OrgMgmt] Organization created successfully');
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Organization created successfully');
    },
    onError: (error: Error) => {
      const errorMsg = error?.message || JSON.stringify(error);
      console.error('[OrgMgmt] Create failed:', errorMsg);
      Alert.alert('Error', `Failed to create organization: ${errorMsg}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Organization> }) => {
      console.log('[OrgMgmt] Updating organization:', id, 'with updates:', JSON.stringify(updates, null, 2));
      const { data, error } = await supabase
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        const errorMsg = error?.message || error?.details || JSON.stringify(error);
        console.error('[OrgMgmt] Update error:', errorMsg, 'Full error:', JSON.stringify(error, null, 2));
        throw new Error(errorMsg);
      }
      
      // Handle SuperAdmin updates
      const existingAdmin = orgSuperAdmins[id];
      if (formData.support_email) {
        if (existingAdmin) {
          // Update existing admin
          const adminUpdates: Record<string, unknown> = {
            first_name: formData.superadmin_first_name || existingAdmin.first_name,
            last_name: formData.superadmin_last_name || existingAdmin.last_name,
            email: formData.support_email.toLowerCase(),
            updated_at: new Date().toISOString(),
          };
          if (formData.superadmin_password) {
            adminUpdates.pin = formData.superadmin_password;
          }
          
          const { error: adminError } = await supabase
            .from('employees')
            .update(adminUpdates)
            .eq('id', existingAdmin.id);
          
          if (adminError) {
            console.error('[OrgMgmt] Failed to update SuperAdmin:', adminError.message);
          }
        } else {
          // Create new admin
          const orgCode = data?.code || 'ORG';
          const empCode = `SA${orgCode.substring(0, 3)}01`;
          
          const { error: empError } = await supabase
            .from('employees')
            .insert({
              organization_id: id,
              employee_code: empCode,
              pin: formData.superadmin_password || '123456',
              first_name: formData.superadmin_first_name || 'Super',
              last_name: formData.superadmin_last_name || 'Admin',
              email: formData.support_email.toLowerCase(),
              role: 'super_admin',
              position: 'Organization Administrator',
              status: 'active',
            });
          
          if (empError) {
            console.error('[OrgMgmt] Failed to create SuperAdmin:', empError.message);
            Alert.alert('Warning', `Organization updated but SuperAdmin setup failed: ${empError.message}`);
          }
        }
      }
      
      console.log('[OrgMgmt] Update response:', JSON.stringify(data, null, 2));
      return data;
    },
    onSuccess: () => {
      console.log('[OrgMgmt] Organization updated successfully');
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
      setShowEditModal(false);
      setSelectedOrg(null);
      Alert.alert('Success', 'Organization updated successfully');
    },
    onError: (error: Error) => {
      const errorMsg = error?.message || JSON.stringify(error);
      console.error('[OrgMgmt] Update failed:', errorMsg);
      Alert.alert('Error', `Failed to update organization: ${errorMsg}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[OrgMgmt] Deleting organization:', id);
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);
      
      if (error) {
        const errorMsg = error?.message || error?.details || JSON.stringify(error);
        console.error('[OrgMgmt] Delete error:', errorMsg, 'Full error:', JSON.stringify(error, null, 2));
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      console.log('[OrgMgmt] Organization deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['all-organizations'] });
      Alert.alert('Success', 'Organization deleted successfully');
    },
    onError: (error: Error) => {
      const errorMsg = error?.message || JSON.stringify(error);
      console.error('[OrgMgmt] Delete failed:', errorMsg);
      Alert.alert('Error', `Failed to delete organization: ${errorMsg}`);
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      code: '',
      subscription_tier: 'starter',
      industry: '',
      employee_count_range: '',
      timezone: 'America/Chicago',
      country: 'USA',
      support_email: '',
      support_phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      tagline: '',
      logo_url: '',
      superadmin_first_name: '',
      superadmin_last_name: '',
      superadmin_password: '',
    });
    setActiveTab('general');
  }, []);

  const { mutate: createOrg } = createMutation;
  const { mutate: updateOrg } = updateMutation;
  const { mutate: deleteOrg } = deleteMutation;

  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Organization name is required');
      return;
    }
    
    // Validate superadmin info if email provided
    if (formData.support_email && (!formData.superadmin_first_name || !formData.superadmin_last_name)) {
      Alert.alert('Validation Error', 'Please provide SuperAdmin first and last name');
      return;
    }
    if (formData.support_email && !formData.superadmin_password) {
      Alert.alert('Validation Error', 'Please provide a password for the SuperAdmin');
      return;
    }
    
    createOrg(formData);
  }, [formData, createOrg]);

  const handleEdit = useCallback((org: Organization) => {
    setSelectedOrg(org);
    const existingAdmin = orgSuperAdmins[org.id];
    setFormData({
      name: org.name,
      code: org.code,
      subscription_tier: org.subscription_tier,
      industry: org.industry || '',
      employee_count_range: org.employee_count_range || '',
      timezone: org.timezone || 'America/Chicago',
      country: org.country || 'USA',
      support_email: existingAdmin?.email || org.support_email || '',
      support_phone: org.support_phone || '',
      website: org.website || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip_code: org.zip_code || '',
      tagline: org.tagline || '',
      logo_url: org.logo_url || '',
      superadmin_first_name: existingAdmin?.first_name || '',
      superadmin_last_name: existingAdmin?.last_name || '',
      superadmin_password: '',
    });
    setActiveTab('general');
    setShowEditModal(true);
  }, [orgSuperAdmins]);

  const handleUpdate = useCallback(async () => {
    if (!selectedOrg) return;
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Organization name is required');
      return;
    }
    
    const existingAdmin = orgSuperAdmins[selectedOrg.id];
    
    // If superadmin email changed or new one provided
    if (formData.support_email && formData.support_email !== existingAdmin?.email) {
      if (!formData.superadmin_first_name || !formData.superadmin_last_name) {
        Alert.alert('Validation Error', 'Please provide SuperAdmin first and last name');
        return;
      }
      if (!existingAdmin && !formData.superadmin_password) {
        Alert.alert('Validation Error', 'Please provide a password for the new SuperAdmin');
        return;
      }
    }
    
    updateOrg({
      id: selectedOrg.id,
      updates: {
        name: formData.name,
        subscription_tier: formData.subscription_tier,
        industry: formData.industry || null,
        employee_count_range: formData.employee_count_range || null,
        timezone: formData.timezone || null,
        country: formData.country || null,
        support_email: formData.support_email || null,
        support_phone: formData.support_phone || null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        tagline: formData.tagline || null,
        logo_url: formData.logo_url || null,
      },
    });
  }, [selectedOrg, formData, updateOrg, orgSuperAdmins]);

  const handleDelete = useCallback((org: Organization) => {
    Alert.alert(
      'Delete Organization',
      `Are you sure you want to delete "${org.name}"? This action cannot be undone and will remove all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteOrg(org.id),
        },
      ]
    );
  }, [deleteOrg]);

  const filteredOrganizations = organizations?.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getTierInfo = (tier: SubscriptionTier) => {
    return SUBSCRIPTION_TIERS.find(t => t.value === tier) || SUBSCRIPTION_TIERS[0];
  };

  const renderOrgCard = (org: Organization) => {
    const tierInfo = getTierInfo(org.subscription_tier);
    const TierIcon = tierInfo.icon;
    
    return (
      <View
        key={org.id}
        style={[styles.orgCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.orgHeader}>
          <View style={[styles.orgIcon, { backgroundColor: tierInfo.color + '20' }]}>
            <Building2 size={24} color={tierInfo.color} />
          </View>
          <View style={styles.orgInfo}>
            <Text style={[styles.orgName, { color: colors.text }]}>{org.name}</Text>
            <Text style={[styles.orgCode, { color: colors.textSecondary }]}>Code: {org.code}</Text>
          </View>
          <View style={styles.orgActions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.infoBg }]}
              onPress={() => handleEdit(org)}
            >
              <Edit3 size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.errorBg }]}
              onPress={() => handleDelete(org)}
            >
              <Trash2 size={16} color={colors.error} />
            </Pressable>
          </View>
        </View>
        
        <View style={styles.orgDetails}>
          <View style={[styles.tierBadge, { backgroundColor: tierInfo.color + '20' }]}>
            <TierIcon size={14} color={tierInfo.color} />
            <Text style={[styles.tierText, { color: tierInfo.color }]}>{tierInfo.label}</Text>
          </View>
          
          {orgSuperAdmins[org.id] ? (
            <View style={[styles.detailChip, { backgroundColor: colors.successBg }]}>
              <UserCog size={12} color={colors.success} />
              <Text style={[styles.detailText, { color: colors.success }]}>
                {orgSuperAdmins[org.id]?.first_name} {orgSuperAdmins[org.id]?.last_name}
              </Text>
            </View>
          ) : (
            <View style={[styles.detailChip, { backgroundColor: colors.warningBg }]}>
              <AlertCircle size={12} color={colors.warning} />
              <Text style={[styles.detailText, { color: colors.warning }]}>No SuperAdmin</Text>
            </View>
          )}
          
          {org.industry && (
            <View style={[styles.detailChip, { backgroundColor: colors.backgroundSecondary }]}>
              <Globe size={12} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{org.industry}</Text>
            </View>
          )}
          
          {org.employee_count_range && (
            <View style={[styles.detailChip, { backgroundColor: colors.backgroundSecondary }]}>
              <Users size={12} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{org.employee_count_range}</Text>
            </View>
          )}
        </View>
        
        <View style={[styles.orgFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerItem}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Created {new Date(org.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFormModal = (isEdit: boolean) => {
    const visible = isEdit ? showEditModal : showCreateModal;
    const setVisible = isEdit ? setShowEditModal : setShowCreateModal;
    const handleSubmit = isEdit ? handleUpdate : handleCreate;
    const isPending = isEdit ? updateMutation.isPending : createMutation.isPending;
    const title = isEdit ? 'Edit Organization' : 'Create Organization';
    
    const renderTabButton = (tab: 'general' | 'contact' | 'branding' | 'superadmin', label: string, icon: typeof Building2) => {
      const Icon = icon;
      const isActive = activeTab === tab;
      return (
        <Pressable
          key={tab}
          style={[
            styles.tabButton,
            { 
              backgroundColor: isActive ? colors.primary : colors.backgroundSecondary,
              borderColor: isActive ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Icon size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabButtonText, { color: isActive ? '#FFFFFF' : colors.text }]}>
            {label}
          </Text>
        </Pressable>
      );
    };
    
    const renderGeneralTab = () => (
      <>
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Organization Name *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
            value={formData.name}
            onChangeText={(v) => setFormData(prev => ({ ...prev, name: v }))}
            placeholder="Enter organization name"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Organization Code</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
            value={formData.code}
            onChangeText={(v) => setFormData(prev => ({ ...prev, code: v.toUpperCase() }))}
            placeholder="Auto-generated if empty"
            placeholderTextColor={colors.textTertiary}
            editable={!isEdit}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Subscription Tier *</Text>
          <Pressable
            style={[styles.formInput, styles.dropdown, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onPress={() => setShowTierDropdown(!showTierDropdown)}
          >
            <View style={styles.dropdownValue}>
              {(() => {
                const tier = getTierInfo(formData.subscription_tier);
                const TierIcon = tier.icon;
                return (
                  <>
                    <TierIcon size={18} color={tier.color} />
                    <Text style={[styles.dropdownText, { color: colors.text }]}>{tier.label}</Text>
                  </>
                );
              })()}
            </View>
            <ChevronDown size={18} color={colors.textTertiary} />
          </Pressable>
          
          {showTierDropdown && (
            <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {SUBSCRIPTION_TIERS.map((tier) => {
                const TierIcon = tier.icon;
                const isSelected = formData.subscription_tier === tier.value;
                return (
                  <Pressable
                    key={tier.value}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: tier.color + '15' },
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, subscription_tier: tier.value }));
                      setShowTierDropdown(false);
                    }}
                  >
                    <TierIcon size={18} color={tier.color} />
                    <View style={styles.dropdownItemContent}>
                      <Text style={[styles.dropdownItemLabel, { color: colors.text }]}>{tier.label}</Text>
                      <Text style={[styles.dropdownItemDesc, { color: colors.textTertiary }]}>{tier.description}</Text>
                    </View>
                    {isSelected && <Check size={18} color={tier.color} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Industry</Text>
          <Pressable
            style={[styles.formInput, styles.dropdown, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onPress={() => setShowIndustryDropdown(!showIndustryDropdown)}
          >
            <Text style={[styles.dropdownText, { color: formData.industry ? colors.text : colors.textTertiary }]}>
              {formData.industry || 'Select industry'}
            </Text>
            <ChevronDown size={18} color={colors.textTertiary} />
          </Pressable>
          
          {showIndustryDropdown && (
            <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 200 }]}>
              <ScrollView nestedScrollEnabled>
                {INDUSTRIES.map((industry) => (
                  <Pressable
                    key={industry}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      formData.industry === industry && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, industry }));
                      setShowIndustryDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemLabel, { color: colors.text }]}>{industry}</Text>
                    {formData.industry === industry && <Check size={18} color={colors.primary} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </>
    );
    
    const renderSuperAdminTab = () => {
      const existingAdmin = isEdit && selectedOrg ? orgSuperAdmins[selectedOrg.id] : null;
      
      return (
        <>
          {existingAdmin ? (
            <View style={[styles.adminStatusCard, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
              <CheckCircle2 size={20} color={colors.success} />
              <View style={styles.adminStatusContent}>
                <Text style={[styles.adminStatusTitle, { color: colors.success }]}>SuperAdmin Configured</Text>
                <Text style={[styles.adminStatusText, { color: colors.textSecondary }]}>
                  {existingAdmin.first_name} {existingAdmin.last_name} ({existingAdmin.email})
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.adminStatusCard, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
              <AlertCircle size={20} color={colors.warning} />
              <View style={styles.adminStatusContent}>
                <Text style={[styles.adminStatusTitle, { color: colors.warning }]}>No SuperAdmin</Text>
                <Text style={[styles.adminStatusText, { color: colors.textSecondary }]}>
                  Configure a SuperAdmin to manage this organization
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>SuperAdmin Email *</Text>
            <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Mail size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.iconInput, { color: colors.text }]}
                value={formData.support_email}
                onChangeText={(v) => setFormData(prev => ({ ...prev, support_email: v }))}
                placeholder="admin@company.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>First Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                value={formData.superadmin_first_name}
                onChangeText={(v) => setFormData(prev => ({ ...prev, superadmin_first_name: v }))}
                placeholder="First name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Last Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                value={formData.superadmin_last_name}
                onChangeText={(v) => setFormData(prev => ({ ...prev, superadmin_last_name: v }))}
                placeholder="Last name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              {existingAdmin ? 'New Password (leave blank to keep current)' : 'Password *'}
            </Text>
            <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Key size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.iconInput, { color: colors.text }]}
                value={formData.superadmin_password}
                onChangeText={(v) => setFormData(prev => ({ ...prev, superadmin_password: v }))}
                placeholder={existingAdmin ? 'Enter new password' : 'Enter password'}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
              />
            </View>
          </View>
          
          <View style={[styles.infoBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
            <Text style={[styles.infoBoxText, { color: colors.info }]}>
              The SuperAdmin will have full access to manage this organization&apos;s employees, modules, and settings. They can sign in using the Organization login with their email and password.
            </Text>
          </View>
        </>
      );
    };
    
    const renderContactTab = () => (
      <>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Phone Number</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Phone size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.iconInput, { color: colors.text }]}
              value={formData.support_phone}
              onChangeText={(v) => setFormData(prev => ({ ...prev, support_phone: v }))}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Website</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Link size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.iconInput, { color: colors.text }]}
              value={formData.website}
              onChangeText={(v) => setFormData(prev => ({ ...prev, website: v }))}
              placeholder="https://www.company.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>
        
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Address</Text>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Street Address</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <MapPin size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.iconInput, { color: colors.text }]}
              value={formData.address}
              onChangeText={(v) => setFormData(prev => ({ ...prev, address: v }))}
              placeholder="123 Main Street"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
        
        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>City</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={formData.city}
              onChangeText={(v) => setFormData(prev => ({ ...prev, city: v }))}
              placeholder="City"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>State</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={formData.state}
              onChangeText={(v) => setFormData(prev => ({ ...prev, state: v }))}
              placeholder="State"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
        
        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>ZIP Code</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={formData.zip_code}
              onChangeText={(v) => setFormData(prev => ({ ...prev, zip_code: v }))}
              placeholder="12345"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Country</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={formData.country}
              onChangeText={(v) => setFormData(prev => ({ ...prev, country: v }))}
              placeholder="USA"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
      </>
    );
    
    const renderBrandingTab = () => (
      <>
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tagline / Slogan</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
            value={formData.tagline}
            onChangeText={(v) => setFormData(prev => ({ ...prev, tagline: v }))}
            placeholder="Your company tagline"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Logo URL</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <ImageIcon size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.iconInput, { color: colors.text }]}
              value={formData.logo_url}
              onChangeText={(v) => setFormData(prev => ({ ...prev, logo_url: v }))}
              placeholder="https://example.com/logo.png"
              placeholderTextColor={colors.textTertiary}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>
        
        <View style={[styles.infoBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
          <Text style={[styles.infoBoxText, { color: colors.info }]}>
            Additional branding settings (colors, themes) can be configured after creation in the Organization Setup screen.
          </Text>
        </View>
      </>
    );
    
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setVisible(false);
          if (!isEdit) resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <Pressable
                onPress={() => {
                  setVisible(false);
                  if (!isEdit) resetForm();
                }}
                style={styles.closeButton}
              >
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollView}>
              <View style={styles.tabsRow}>
                {renderTabButton('general', 'General', Building2)}
                {renderTabButton('superadmin', 'SuperAdmin', UserCog)}
                {renderTabButton('contact', 'Contact', Mail)}
                {renderTabButton('branding', 'Branding', Palette)}
              </View>
            </ScrollView>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {activeTab === 'general' && renderGeneralTab()}
              {activeTab === 'superadmin' && renderSuperAdminTab()}
              {activeTab === 'contact' && renderContactTab()}
              {activeTab === 'branding' && renderBrandingTab()}
            </ScrollView>
            
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setVisible(false);
                  if (!isEdit) resetForm();
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{isEdit ? 'Save Changes' : 'Create'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading organizations...</Text>
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
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
            <Building2 size={24} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Organization Management</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Manage companies and subscription tiers
            </Text>
          </View>
        </View>
        
        <View style={styles.toolbar}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search organizations..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{organizations?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          {SUBSCRIPTION_TIERS.map((tier) => {
            const count = organizations?.filter(o => o.subscription_tier === tier.value).length || 0;
            return (
              <View key={tier.value} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: tier.color }]}>{count}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{tier.label}</Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            Organizations ({filteredOrganizations.length})
          </Text>
        </View>
        
        {filteredOrganizations.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Organizations Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first organization to get started'}
            </Text>
            {!searchQuery && (
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Organization</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.orgList}>
            {filteredOrganizations.map(renderOrgCard)}
          </View>
        )}
      </ScrollView>
      
      {renderFormModal(false)}
      {renderFormModal(true)}
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
    paddingBottom: 40,
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
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase' as const,
  },
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  orgList: {
    gap: 12,
  },
  orgCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  orgIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  orgCode: {
    fontSize: 12,
    marginTop: 2,
  },
  orgActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 11,
  },
  orgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    maxHeight: 420,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 8,
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 18,
  },
  adminStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  adminStatusContent: {
    flex: 1,
  },
  adminStatusTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  adminStatusText: {
    fontSize: 12,
    marginTop: 2,
  },
  tabsScrollView: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownText: {
    fontSize: 15,
  },
  dropdownList: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  dropdownItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
