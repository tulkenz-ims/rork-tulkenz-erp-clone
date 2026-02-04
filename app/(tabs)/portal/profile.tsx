import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import {
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  Shirt,
  DollarSign,
  Clock,
  BadgeCheck,
  UserCircle,
  Gift,
  AlertCircle,
  LogOut,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useERP } from '@/contexts/ERPContext';
import { MOCK_FACILITIES } from '@/constants/dashboardConstants';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userProfile, company, signOut } = useUser();
  const { employees } = useERP();
  const [refreshing, setRefreshing] = useState(false);

  const currentEmployee = useMemo(() => {
    if (!userProfile) return null;
    return employees.find(e => e.email === userProfile.email) || null;
  }, [userProfile, employees]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  }, [signOut, router]);

  const getFacilityName = (facilityId?: string) => {
    if (!facilityId) return 'Not assigned';
    return MOCK_FACILITIES.find(f => f.id === facilityId)?.name || 'Unknown';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatBirthday = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const calculateTenure = (hireDate?: string) => {
    if (!hireDate) return 'N/A';
    const start = new Date(hireDate);
    const now = new Date();
    const years = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor(((now.getTime() - start.getTime()) % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ${months} mo`;
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const formatPay = (employee: typeof currentEmployee) => {
    if (!employee?.profile?.payRate) return 'Not set';
    if (employee.profile.payType === 'salary') {
      return `$${employee.profile.payRate.toLocaleString()}/year`;
    }
    return `$${employee.profile.payRate.toFixed(2)}/hour`;
  };

  const styles = createStyles(colors);

  if (!currentEmployee) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'My Profile' }} />
        <View style={styles.errorState}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Profile Not Found</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Unable to load your employee profile.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Profile' }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileHeader, { backgroundColor: colors.primary }]}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {currentEmployee.first_name[0]}{currentEmployee.last_name[0]}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {currentEmployee.first_name} {currentEmployee.last_name}
          </Text>
          <Text style={styles.profilePosition}>{currentEmployee.position}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <BadgeCheck size={14} color="#FFFFFF" />
              <Text style={styles.statusBadgeText}>Active</Text>
            </View>
            <View style={styles.tenureBadge}>
              <Clock size={14} color="#FFFFFF" />
              <Text style={styles.tenureBadgeText}>{calculateTenure(currentEmployee.hire_date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <InfoRow
              icon={<Mail size={18} color={colors.primary} />}
              label="Email"
              value={currentEmployee.email}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<Phone size={18} color={colors.success} />}
              label="Phone"
              value={currentEmployee.profile?.phone || 'Not set'}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<Building2 size={18} color={colors.purple} />}
              label="Location"
              value={getFacilityName(currentEmployee.facility_id)}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Employment Details</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <InfoRow
              icon={<Briefcase size={18} color={colors.warning} />}
              label="Department"
              value={currentEmployee.profile?.department || 'Not assigned'}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<Calendar size={18} color={colors.info} />}
              label="Start Date"
              value={formatDate(currentEmployee.hire_date)}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<BadgeCheck size={18} color={colors.success} />}
              label="Employee ID"
              value={currentEmployee.employee_code}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<DollarSign size={18} color={colors.success} />}
              label="Pay Rate"
              value={formatPay(currentEmployee)}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <InfoRow
              icon={<Gift size={18} color={colors.error} />}
              label="Birthday"
              value={formatBirthday(currentEmployee.profile?.birthday)}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<UserCircle size={18} color={colors.warning} />}
              label="Emergency Contact"
              value={currentEmployee.profile?.emergencyContact || 'Not set'}
              colors={colors}
            />
            {currentEmployee.profile?.emergencyPhone && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <InfoRow
                  icon={<Phone size={18} color={colors.warning} />}
                  label="Emergency Phone"
                  value={currentEmployee.profile.emergencyPhone}
                  colors={colors}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Uniform Size</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <InfoRow
              icon={<Shirt size={18} color={colors.info} />}
              label="Shirt Size"
              value={currentEmployee.profile?.uniformSize?.shirtSize || 'Not set'}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow
              icon={<Shirt size={18} color={colors.purple} />}
              label="Pants Size"
              value={currentEmployee.profile?.uniformSize?.pantsSize || 'Not set'}
              colors={colors}
            />
          </View>
        </View>

        <View style={[styles.companyCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Building2 size={24} color={colors.primary} />
          <View style={styles.companyInfo}>
            <Text style={[styles.companyLabel, { color: colors.textSecondary }]}>Company</Text>
            <Text style={[styles.companyName, { color: colors.text }]}>{company?.name || 'Company'}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: colors.error + '15', borderColor: colors.error + '30' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleSignOut}
        >
          <LogOut size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: any;
}

function InfoRow({ icon, label, value, colors }: InfoRowProps) {
  return (
    <View style={infoRowStyles.container}>
      <View style={infoRowStyles.iconContainer}>{icon}</View>
      <View style={infoRowStyles.content}>
        <Text style={[infoRowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[infoRowStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  value: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    errorState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    errorText: {
      fontSize: 14,
      textAlign: 'center' as const,
    },
    profileHeader: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 28,
      paddingHorizontal: 16,
    },
    avatarLarge: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarLargeText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '700' as const,
    },
    profileName: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '700' as const,
    },
    profilePosition: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 15,
      marginTop: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    statusBadgeText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    tenureBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    tenureBadgeText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    sectionContainer: {
      padding: 16,
      paddingBottom: 0,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 12,
    },
    infoCard: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
    },
    divider: {
      height: 1,
    },
    companyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      gap: 14,
    },
    companyInfo: {
      flex: 1,
    },
    companyLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    companyName: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
      marginTop: 8,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      gap: 10,
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
  });
