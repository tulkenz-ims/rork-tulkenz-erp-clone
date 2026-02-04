import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  Search,
  ChevronRight,
  Star,
  Play,
  Users,
  BarChart3,
  Filter,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Target,
} from 'lucide-react-native';
import {
  MOCK_COURSES,
  MOCK_ENROLLMENTS,
  COURSE_TYPE_LABELS,
  COURSE_TYPE_COLORS,
  LMS_CATEGORIES,
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_COLORS,
  type Course,
  type CourseEnrollment,
} from '@/constants/lmsConstants';

type CertificationType = 'completion' | 'certification' | 'compliance' | 'professional';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  targetRole: string;
  courses: string[];
  totalDuration: number;
  enrolledCount: number;
  skills: string[];
  color: string;
}

interface Certificate {
  id: string;
  courseName: string;
  employeeName: string;
  credentialId: string;
  type: CertificationType;
  status: 'active' | 'expired';
  issuedAt: string;
  expiresAt?: string;
}

type Enrollment = CourseEnrollment & {
  courseId: string;
  timeSpent: number;
};

const COURSE_CATEGORIES = [...LMS_CATEGORIES];

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  expired: 'Expired',
  failed: 'Failed',
  ...ENROLLMENT_STATUS_LABELS,
};

const STATUS_COLORS: Record<string, string> = {
  'not-started': '#6B7280',
  'in-progress': '#3B82F6',
  completed: '#10B981',
  expired: '#EF4444',
  failed: '#DC2626',
  ...ENROLLMENT_STATUS_COLORS,
};

const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  completion: 'Completion',
  certification: 'Certification',
  compliance: 'Compliance',
  professional: 'Professional',
};

const CERTIFICATION_TYPE_COLORS: Record<CertificationType, string> = {
  completion: '#3B82F6',
  certification: '#8B5CF6',
  compliance: '#F59E0B',
  professional: '#10B981',
};

const MOCK_LEARNING_PATHS: LearningPath[] = [];
const MOCK_CERTIFICATES: Certificate[] = [];

type LMSView = 'catalog' | 'my-learning' | 'paths' | 'certificates' | 'analytics';

export default function LMSScreen() {
  const { colors } = useTheme();
  const [currentView, setCurrentView] = useState<LMSView>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const views = [
    { key: 'catalog' as const, label: 'Catalog', icon: BookOpen },
    { key: 'my-learning' as const, label: 'My Learning', icon: GraduationCap },
    { key: 'paths' as const, label: 'Paths', icon: Target },
    { key: 'certificates' as const, label: 'Certificates', icon: Award },
    { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const metrics = useMemo(() => {
    const totalCourses = MOCK_COURSES.length;
    const totalEnrollments = MOCK_ENROLLMENTS.length;
    const completedEnrollments = MOCK_ENROLLMENTS.filter(e => e.status === 'completed').length;
    const inProgressEnrollments = MOCK_ENROLLMENTS.filter(e => e.status === 'in-progress').length;
    const overdueEnrollments = MOCK_ENROLLMENTS.filter(
      e => e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'completed'
    ).length;
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
    const avgScore = MOCK_ENROLLMENTS.filter(e => e.score).reduce((sum, e) => sum + (e.score || 0), 0) / 
      MOCK_ENROLLMENTS.filter(e => e.score).length || 0;
    const totalHours = Math.round(MOCK_ENROLLMENTS.reduce((sum, e) => sum + e.timeSpent, 0) / 60);
    const activeCertificates = MOCK_CERTIFICATES.filter(c => c.status === 'active').length;

    return {
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      inProgressEnrollments,
      overdueEnrollments,
      completionRate,
      avgScore: Math.round(avgScore),
      totalHours,
      activeCertificates,
    };
  }, []);

  const filteredCourses = useMemo(() => {
    let filtered = MOCK_COURSES;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          c.instructor.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const filteredEnrollments = useMemo(() => {
    let filtered = MOCK_ENROLLMENTS;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const course = MOCK_COURSES.find(c => c.id === e.courseId);
        return course?.title.toLowerCase().includes(query) ||
          e.employeeName.toLowerCase().includes(query);
      });
    }

    if (selectedCategory === 'in-progress') {
      filtered = filtered.filter(e => e.status === 'in-progress');
    } else if (selectedCategory === 'completed') {
      filtered = filtered.filter(e => e.status === 'completed');
    } else if (selectedCategory === 'overdue') {
      filtered = filtered.filter(
        e => e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'completed'
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const filteredPaths = useMemo(() => {
    let filtered = MOCK_LEARNING_PATHS;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p => p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery]);

  const filteredCertificates = useMemo(() => {
    let filtered = MOCK_CERTIFICATES;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.courseName.toLowerCase().includes(query) ||
          c.employeeName.toLowerCase().includes(query) ||
          c.credentialId.toLowerCase().includes(query)
      );
    }

    if (selectedCategory === 'active') {
      filtered = filtered.filter(c => c.status === 'active');
    } else if (selectedCategory === 'expired') {
      filtered = filtered.filter(c => c.status === 'expired');
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderCourseCard = (course: Course) => {
    const typeColor = COURSE_TYPE_COLORS[course.type];

    return (
      <TouchableOpacity
        key={course.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Image
          source={{ uri: course.thumbnail }}
          style={styles.courseThumbnail}
          resizeMode="cover"
        />
        <View style={styles.courseContent}>
          <View style={styles.courseHeader}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>
                {COURSE_TYPE_LABELS[course.type]}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.text }]}>{course.rating}</Text>
            </View>
          </View>

          <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
          <Text style={[styles.courseCategory, { color: colors.textSecondary }]}>
            {course.category}
          </Text>

          <View style={styles.courseMetaRow}>
            <View style={styles.courseMeta}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[styles.courseMetaText, { color: colors.textSecondary }]}>
                {formatDuration(course.duration)}
              </Text>
            </View>
            <View style={styles.courseMeta}>
              <Users size={12} color={colors.textTertiary} />
              <Text style={[styles.courseMetaText, { color: colors.textSecondary }]}>
                {course.enrolledCount} enrolled
              </Text>
            </View>
          </View>

          <View style={styles.courseFooter}>
            <Text style={[styles.instructorText, { color: colors.textTertiary }]}>
              {course.instructor}
            </Text>
            <TouchableOpacity style={[styles.enrollButton, { backgroundColor: colors.primary }]}>
              <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.enrollButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEnrollmentCard = (enrollment: Enrollment) => {
    const course = MOCK_COURSES.find(c => c.id === enrollment.courseId);
    if (!course) return null;

    const statusColor = STATUS_COLORS[enrollment.status];
    const isOverdue = enrollment.dueDate && new Date(enrollment.dueDate) < new Date() && enrollment.status !== 'completed';

    return (
      <TouchableOpacity
        key={enrollment.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.enrollmentContent}>
          <View style={styles.enrollmentHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[enrollment.status]}
              </Text>
            </View>
            {isOverdue && (
              <View style={[styles.overdueBadge, { backgroundColor: '#EF444420' }]}>
                <AlertCircle size={12} color="#EF4444" />
                <Text style={[styles.overdueText, { color: '#EF4444' }]}>Overdue</Text>
              </View>
            )}
          </View>

          <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
          <Text style={[styles.courseCategory, { color: colors.textSecondary }]}>
            {course.category}
          </Text>

          {enrollment.status !== 'not-started' && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progress</Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>{enrollment.progress}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: statusColor, width: `${enrollment.progress}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={styles.enrollmentMetaRow}>
            {enrollment.dueDate && (
              <View style={styles.enrollmentMeta}>
                <Calendar size={12} color={colors.textTertiary} />
                <Text style={[styles.enrollmentMetaText, { color: colors.textSecondary }]}>
                  Due: {new Date(enrollment.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            {enrollment.score !== undefined && (
              <View style={styles.enrollmentMeta}>
                <CheckCircle size={12} color="#10B981" />
                <Text style={[styles.enrollmentMetaText, { color: colors.textSecondary }]}>
                  Score: {enrollment.score}%
                </Text>
              </View>
            )}
            <View style={styles.enrollmentMeta}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[styles.enrollmentMetaText, { color: colors.textSecondary }]}>
                {formatDuration(enrollment.timeSpent)} spent
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const renderPathCard = (path: LearningPath) => {
    return (
      <TouchableOpacity
        key={path.id}
        style={[styles.pathCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.pathColorBar, { backgroundColor: path.color }]} />
        <View style={styles.pathContent}>
          <View style={styles.pathHeader}>
            <View style={[styles.pathIcon, { backgroundColor: path.color + '20' }]}>
              <Target size={20} color={path.color} />
            </View>
            <View style={styles.pathTitleContainer}>
              <Text style={[styles.pathTitle, { color: colors.text }]}>{path.title}</Text>
              <Text style={[styles.pathCategory, { color: colors.textSecondary }]}>
                {path.category} • {path.targetRole}
              </Text>
            </View>
          </View>

          <Text style={[styles.pathDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {path.description}
          </Text>

          <View style={styles.pathStats}>
            <View style={styles.pathStat}>
              <BookOpen size={14} color={colors.textTertiary} />
              <Text style={[styles.pathStatText, { color: colors.text }]}>
                {path.courses.length} courses
              </Text>
            </View>
            <View style={styles.pathStat}>
              <Clock size={14} color={colors.textTertiary} />
              <Text style={[styles.pathStatText, { color: colors.text }]}>
                {formatDuration(path.totalDuration)}
              </Text>
            </View>
            <View style={styles.pathStat}>
              <Users size={14} color={colors.textTertiary} />
              <Text style={[styles.pathStatText, { color: colors.text }]}>
                {path.enrolledCount} enrolled
              </Text>
            </View>
          </View>

          <View style={styles.pathSkills}>
            {path.skills.slice(0, 3).map((skill, index) => (
              <View
                key={index}
                style={[styles.skillChip, { backgroundColor: colors.backgroundTertiary }]}
              >
                <Text style={[styles.skillText, { color: colors.textSecondary }]}>{skill}</Text>
              </View>
            ))}
            {path.skills.length > 3 && (
              <Text style={[styles.moreSkills, { color: colors.textTertiary }]}>
                +{path.skills.length - 3} more
              </Text>
            )}
          </View>

          <TouchableOpacity style={[styles.startPathButton, { backgroundColor: path.color }]}>
            <Text style={styles.startPathText}>Start Path</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCertificateCard = (certificate: Certificate) => {
    const typeColor = CERTIFICATION_TYPE_COLORS[certificate.type];
    const isExpired = certificate.status === 'expired';
    const isExpiringSoon = certificate.expiresAt && 
      new Date(certificate.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
      certificate.status === 'active';

    return (
      <TouchableOpacity
        key={certificate.id}
        style={[styles.certificateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.certificateIcon, { backgroundColor: typeColor + '20' }]}>
          <Award size={24} color={typeColor} />
        </View>
        <View style={styles.certificateContent}>
          <View style={styles.certificateHeader}>
            <Text style={[styles.certificateName, { color: colors.text }]}>
              {certificate.courseName}
            </Text>
            {isExpired && (
              <View style={[styles.expiredBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.expiredText, { color: '#EF4444' }]}>Expired</Text>
              </View>
            )}
            {isExpiringSoon && !isExpired && (
              <View style={[styles.expiredBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.expiredText, { color: '#F59E0B' }]}>Expiring Soon</Text>
              </View>
            )}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20', alignSelf: 'flex-start' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {CERTIFICATION_TYPE_LABELS[certificate.type]}
            </Text>
          </View>
          <Text style={[styles.certificateEmployee, { color: colors.textSecondary }]}>
            {certificate.employeeName}
          </Text>
          <View style={styles.certificateMeta}>
            <Text style={[styles.certificateId, { color: colors.textTertiary }]}>
              ID: {certificate.credentialId}
            </Text>
            <Text style={[styles.certificateDate, { color: colors.textTertiary }]}>
              Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
            </Text>
            {certificate.expiresAt && (
              <Text style={[styles.certificateDate, { color: isExpired ? '#EF4444' : colors.textTertiary }]}>
                Expires: {new Date(certificate.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnalytics = () => {
    const byCategory = MOCK_COURSES.reduce((acc, course) => {
      acc[course.category] = (acc[course.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = {
      'Completed': metrics.completedEnrollments,
      'In Progress': metrics.inProgressEnrollments,
      'Not Started': MOCK_ENROLLMENTS.filter(e => e.status === 'not-started').length,
      'Overdue': metrics.overdueEnrollments,
    };

    return (
      <View style={styles.analyticsContainer}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewItem, { backgroundColor: colors.primary + '20' }]}>
              <BookOpen size={24} color={colors.primary} />
              <Text style={[styles.overviewValue, { color: colors.primary }]}>{metrics.totalCourses}</Text>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Courses</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: '#10B98120' }]}>
              <GraduationCap size={24} color="#10B981" />
              <Text style={[styles.overviewValue, { color: '#10B981' }]}>{metrics.completionRate}%</Text>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Completion Rate</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: '#F59E0B20' }]}>
              <TrendingUp size={24} color="#F59E0B" />
              <Text style={[styles.overviewValue, { color: '#F59E0B' }]}>{metrics.avgScore}%</Text>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Avg Score</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: '#8B5CF620' }]}>
              <Award size={24} color="#8B5CF6" />
              <Text style={[styles.overviewValue, { color: '#8B5CF6' }]}>{metrics.activeCertificates}</Text>
              <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Certificates</Text>
            </View>
          </View>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Enrollment Status</Text>
          <View style={styles.barChartContainer}>
            {Object.entries(byStatus).map(([label, value]) => {
              const statusColors: Record<string, string> = {
                'Completed': '#10B981',
                'In Progress': '#3B82F6',
                'Not Started': '#6B7280',
                'Overdue': '#EF4444',
              };
              const maxValue = Math.max(...Object.values(byStatus));
              const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.barFill, { backgroundColor: statusColors[label], width: `${width}%` }]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>{value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Courses by Category</Text>
          <View style={styles.barChartContainer}>
            {Object.entries(byCategory).slice(0, 5).map(([label, value]) => {
              const maxValue = Math.max(...Object.values(byCategory));
              const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {label}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.barFill, { backgroundColor: colors.primary, width: `${width}%` }]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>{value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Learning Activity</Text>
          <View style={styles.activityStats}>
            <View style={styles.activityStat}>
              <Clock size={20} color={colors.primary} />
              <Text style={[styles.activityValue, { color: colors.text }]}>{metrics.totalHours}</Text>
              <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Hours Learned</Text>
            </View>
            <View style={[styles.activityDivider, { backgroundColor: colors.border }]} />
            <View style={styles.activityStat}>
              <Users size={20} color={colors.primary} />
              <Text style={[styles.activityValue, { color: colors.text }]}>{metrics.totalEnrollments}</Text>
              <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Enrollments</Text>
            </View>
            <View style={[styles.activityDivider, { backgroundColor: colors.border }]} />
            <View style={styles.activityStat}>
              <AlertCircle size={20} color="#EF4444" />
              <Text style={[styles.activityValue, { color: colors.text }]}>{metrics.overdueEnrollments}</Text>
              <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Overdue</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </View>
    );
  };

  const getFilterOptions = () => {
    switch (currentView) {
      case 'catalog':
        return [
          { key: null, label: 'All' },
          ...COURSE_CATEGORIES.slice(0, 4).map(cat => ({ key: cat, label: cat })),
        ];
      case 'my-learning':
        return [
          { key: null, label: 'All' },
          { key: 'in-progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
          { key: 'overdue', label: 'Overdue' },
        ];
      case 'certificates':
        return [
          { key: null, label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'expired', label: 'Expired' },
        ];
      default:
        return [];
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Learning',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <BookOpen size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.totalCourses}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Courses</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
              <CheckCircle size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.completionRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completion</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
              <Play size={18} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.inProgressEnrollments}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
              <Award size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.activeCertificates}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Certificates</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.viewTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {views.map(view => {
            const Icon = view.icon;
            const isActive = currentView === view.key;
            return (
              <TouchableOpacity
                key={view.key}
                style={[
                  styles.viewTab,
                  {
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setCurrentView(view.key);
                  setSelectedCategory(null);
                }}
              >
                <Icon size={16} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[styles.viewTabText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}
                >
                  {view.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {currentView !== 'analytics' && (
        <>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {getFilterOptions().length > 0 && (
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterRow}>
                  <Filter size={16} color={colors.textSecondary} style={styles.filterIcon} />
                  {getFilterOptions().map(option => (
                    <TouchableOpacity
                      key={option.key || 'all'}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: selectedCategory === option.key ? colors.primary : colors.surface,
                          borderColor: selectedCategory === option.key ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedCategory(option.key)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selectedCategory === option.key ? '#FFFFFF' : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {currentView === 'catalog' && (
          <View style={styles.section}>
            {filteredCourses.length > 0 ? (
              filteredCourses.map(renderCourseCard)
            ) : (
              <View style={styles.emptyState}>
                <BookOpen size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No courses found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'my-learning' && (
          <View style={styles.section}>
            {filteredEnrollments.length > 0 ? (
              filteredEnrollments.map(renderEnrollmentCard)
            ) : (
              <View style={styles.emptyState}>
                <GraduationCap size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No enrollments found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'paths' && (
          <View style={styles.section}>
            {filteredPaths.length > 0 ? (
              filteredPaths.map(renderPathCard)
            ) : (
              <View style={styles.emptyState}>
                <Target size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No learning paths found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'certificates' && (
          <View style={styles.section}>
            {filteredCertificates.length > 0 ? (
              filteredCertificates.map(renderCertificateCard)
            ) : (
              <View style={styles.emptyState}>
                <Award size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No certificates found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'analytics' && renderAnalytics()}

        {currentView !== 'analytics' && <View style={{ height: 32 }} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  viewTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  viewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginVertical: 12,
    gap: 6,
    borderWidth: 1,
  },
  viewTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 120,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  courseThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  courseContent: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  courseCategory: {
    fontSize: 13,
    marginBottom: 12,
  },
  courseMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaText: {
    fontSize: 12,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  instructorText: {
    fontSize: 12,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  enrollmentContent: {
    flex: 1,
    padding: 16,
  },
  enrollmentHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  progressSection: {
    marginTop: 12,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  enrollmentMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  enrollmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enrollmentMetaText: {
    fontSize: 12,
  },
  pathCard: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pathColorBar: {
    height: 4,
  },
  pathContent: {
    padding: 16,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pathIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathTitleContainer: {
    flex: 1,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  pathCategory: {
    fontSize: 13,
  },
  pathDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  pathStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pathStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pathStatText: {
    fontSize: 13,
  },
  pathSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  skillChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 11,
  },
  moreSkills: {
    fontSize: 11,
    alignSelf: 'center',
  },
  startPathButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  startPathText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  certificateCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  certificateIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificateContent: {
    flex: 1,
    gap: 4,
  },
  certificateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  certificateName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  expiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiredText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  certificateEmployee: {
    fontSize: 13,
    marginTop: 4,
  },
  certificateMeta: {
    marginTop: 8,
    gap: 2,
  },
  certificateId: {
    fontSize: 11,
  },
  certificateDate: {
    fontSize: 11,
  },
  analyticsContainer: {
    padding: 16,
    gap: 16,
  },
  analyticsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  overviewLabel: {
    fontSize: 12,
    textAlign: 'center' as const,
  },
  barChartContainer: {
    gap: 12,
  },
  barRow: {
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    width: 24,
    textAlign: 'right' as const,
  },
  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityStat: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  activityValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  activityLabel: {
    fontSize: 12,
    textAlign: 'center' as const,
  },
  activityDivider: {
    width: 1,
    height: 60,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
