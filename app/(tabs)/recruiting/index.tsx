import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useERP } from '@/contexts/ERPContext';
import {
  Briefcase,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Plus,
  Search,
  Star,
  Phone,
  Video,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  ChevronRight,
  Target,
  Award,
  AlertCircle,
  UserCheck,
  Send,
  X,
  Edit3,
  CheckCircle2,
  XCircle,
  Pause,
  PlayCircle,
  Save,
} from 'lucide-react-native';
import {
  type JobRequisition,
  type Interview,
  type Offer,
  APPLICATION_STATUS_COLORS,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  type ApplicationStatus,
  type JobStatus,
  type InterviewType,
} from '@/constants/recruitingConstants';

type RecruitingView = 'jobs' | 'pipeline' | 'interviews' | 'offers' | 'analytics';

const { width } = Dimensions.get('window');

export default function RecruitingScreen() {
  const { colors } = useTheme();
  const {
    jobRequisitions,
    candidates,
    applications,
    interviews,
    offers,

  } = useERP();

  const [currentView, setCurrentView] = useState<RecruitingView>('jobs');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobRequisition | null>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [jobForm, setJobForm] = useState<Partial<JobRequisition>>({
    jobTitle: '',
    department: '',
    location: '',
    jobType: 'full_time',
    employmentType: 'non_exempt',
    openPositions: 1,
    filledPositions: 0,
    status: 'draft',
    priority: 'medium',
    isRemote: false,
    experienceYears: 0,
    requirements: [],
    responsibilities: [],
    benefits: [],
    skillsRequired: [],
  });

  const filteredJobs = useMemo(() => {
    return jobRequisitions.filter((job) => {
      const matchesSearch =
        job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || job.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [jobRequisitions, searchQuery, filterStatus]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const candidate = candidates.find((c) => c.id === app.candidateId);
      if (!candidate) return false;
      const matchesSearch =
        candidate.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [applications, candidates, searchQuery]);

  const getApplicationsByStatus = (status: ApplicationStatus) => {
    return filteredApplications.filter((app) => app.status === status);
  };

  const getJobMetrics = (jobId: string) => {
    const jobApps = applications.filter((app) => app.jobRequisitionId === jobId);
    return {
      total: jobApps.length,
      new: jobApps.filter((a) => a.status === 'new').length,
      screening: jobApps.filter((a) => a.status === 'screening').length,
      interview: jobApps.filter((a) => a.status === 'interview').length,
      offer: jobApps.filter((a) => a.status === 'offer').length,
      hired: jobApps.filter((a) => a.status === 'hired').length,
    };
  };



  const getCandidateById = (candidateId: string) => {
    return candidates.find((c) => c.id === candidateId);
  };

  const getJobById = (jobId: string) => {
    return jobRequisitions.find((j) => j.id === jobId);
  };

  const getUpcomingInterviews = () => {
    return interviews
      .filter((int) => int.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 10);
  };

  const getPendingOffers = () => {
    return offers.filter((off) => off.status === 'sent');
  };

  const recruitingMetrics = useMemo(() => {
    const totalApplications = applications.length;
    const totalJobs = jobRequisitions.filter((j) => j.status === 'open').length;
    const totalInterviews = interviews.filter((i) => i.status === 'scheduled').length;
    const totalOffers = offers.filter((o) => o.status === 'sent').length;
    const hiredCount = applications.filter((a) => a.status === 'hired').length;

    return {
      totalApplications,
      totalJobs,
      totalInterviews,
      totalOffers,
      hiredCount,
    };
  }, [applications, jobRequisitions, interviews, offers]);

  const renderJobCard = (job: JobRequisition) => {
    const metrics = getJobMetrics(job.id);
    const daysOpen = Math.floor(
      (new Date().getTime() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <TouchableOpacity
        key={job.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelectedJob(job);
          setJobForm(job);
          setEditMode(false);
          setIsJobDetailOpen(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: JOB_STATUS_COLORS[job.status] + '20' },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: JOB_STATUS_COLORS[job.status] }]}>
                {JOB_STATUS_LABELS[job.status]}
              </Text>
            </View>
            {job.priority === 'urgent' && (
              <View style={[styles.priorityBadge, { backgroundColor: '#DC2626' }]}>
                <AlertCircle size={12} color="#FFF" />
                <Text style={styles.priorityBadgeText}>Urgent</Text>
              </View>
            )}
            {job.priority === 'high' && (
              <View style={[styles.priorityBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.priorityBadgeText}>High</Text>
              </View>
            )}
          </View>
          <Text style={[styles.jobId, { color: colors.textTertiary }]}>{job.id}</Text>
        </View>

        <Text style={[styles.jobTitle, { color: colors.text }]}>{job.jobTitle}</Text>
        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaItem}>
            <Briefcase size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
              {job.department}
            </Text>
          </View>
          <View style={styles.jobMetaItem}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
              {job.location}
            </Text>
          </View>
        </View>

        <View style={styles.jobMetaRow}>
          <View style={styles.jobMetaItem}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
              {job.filledPositions}/{job.openPositions} filled
            </Text>
          </View>
          <View style={styles.jobMetaItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
              {daysOpen} days open
            </Text>
          </View>
        </View>

        {job.salaryMin && job.salaryMax && (
          <View style={styles.jobMetaRow}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={[styles.jobMetaText, { color: colors.textSecondary }]}>
              ${(job.salaryMin / 1000).toFixed(0)}K - ${(job.salaryMax / 1000).toFixed(0)}K
            </Text>
          </View>
        )}

        <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Applicants</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{metrics.interview}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Interview</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#EC4899' }]}>{metrics.offer}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Offer</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#059669' }]}>{metrics.hired}</Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Hired</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.hiringManagerRow}>
            <UserCheck size={14} color={colors.textSecondary} />
            <Text style={[styles.hiringManagerText, { color: colors.textSecondary }]}>
              {job.hiringManager}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPipelineColumn = (status: ApplicationStatus, title: string) => {
    const apps = getApplicationsByStatus(status);
    const color = APPLICATION_STATUS_COLORS[status];

    return (
      <View
        key={status}
        style={[styles.pipelineColumn, { backgroundColor: colors.surface, borderColor: color }]}
      >
        <View style={[styles.pipelineColumnHeader, { backgroundColor: color + '20' }]}>
          <Text style={[styles.pipelineColumnTitle, { color }]}>{title}</Text>
          <View style={[styles.pipelineCount, { backgroundColor: color }]}>
            <Text style={styles.pipelineCountText}>{apps.length}</Text>
          </View>
        </View>

        <ScrollView style={styles.pipelineColumnScroll} showsVerticalScrollIndicator={false}>
          {apps.map((app) => {
            const candidate = getCandidateById(app.candidateId);
            const job = getJobById(app.jobRequisitionId);
            if (!candidate || !job) return null;

            return (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.candidateCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => Alert.alert('Candidate Details', `${candidate.firstName} ${candidate.lastName}\n${job.jobTitle}`)}
              >
                {app.isStarred && (
                  <View style={styles.starBadge}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  </View>
                )}
                <Text style={[styles.candidateName, { color: colors.text }]}>
                  {candidate.firstName} {candidate.lastName}
                </Text>
                <Text
                  style={[styles.candidateJobTitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {job.jobTitle}
                </Text>

                {candidate.currentTitle && (
                  <Text
                    style={[styles.candidateCurrentTitle, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {candidate.currentTitle}
                  </Text>
                )}

                <View style={styles.candidateMetaRow}>
                  <MapPin size={12} color={colors.textTertiary} />
                  <Text style={[styles.candidateMetaText, { color: colors.textTertiary }]}>
                    {candidate.location}
                  </Text>
                </View>

                {app.overallScore && (
                  <View style={[styles.scoreRow, { borderTopColor: colors.border }]}>
                    <Award size={12} color="#F59E0B" />
                    <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
                      Score: {app.overallScore.toFixed(1)}/10
                    </Text>
                  </View>
                )}

                <View style={styles.candidateCardFooter}>
                  <Text style={[styles.candidateSource, { color: colors.textTertiary }]}>
                    {candidate.source}
                  </Text>
                  <Text style={[styles.candidateDate, { color: colors.textTertiary }]}>
                    {new Date(app.appliedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderInterviewCard = (interview: Interview) => {
    const candidate = getCandidateById(interview.candidateId);
    const job = getJobById(interview.jobRequisitionId);
    if (!candidate || !job) return null;

    const interviewDate = new Date(interview.scheduledDate);
    const isToday =
      interviewDate.toDateString() === new Date().toDateString();

    const interviewTypeIcons: Record<InterviewType, any> = {
      phone: Phone,
      video: Video,
      in_person: Users,
      panel: Users,
      technical: Target,
    };

    const Icon = interviewTypeIcons[interview.interviewType];

    return (
      <View
        key={interview.id}
        style={[styles.interviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.interviewHeader}>
          <View style={styles.interviewHeaderLeft}>
            <View
              style={[
                styles.interviewTypeBadge,
                {
                  backgroundColor:
                    interview.interviewType === 'phone'
                      ? '#3B82F620'
                      : interview.interviewType === 'video'
                      ? '#8B5CF620'
                      : '#10B98120',
                },
              ]}
            >
              <Icon
                size={14}
                color={
                  interview.interviewType === 'phone'
                    ? '#3B82F6'
                    : interview.interviewType === 'video'
                    ? '#8B5CF6'
                    : '#10B981'
                }
              />
              <Text
                style={[
                  styles.interviewTypeText,
                  {
                    color:
                      interview.interviewType === 'phone'
                        ? '#3B82F6'
                        : interview.interviewType === 'video'
                        ? '#8B5CF6'
                        : '#10B981',
                  },
                ]}
              >
                {interview.interviewType.replace('_', ' ')}
              </Text>
            </View>
            {isToday && (
              <View style={[styles.todayBadge, { backgroundColor: '#DC262620' }]}>
                <Text style={[styles.todayBadgeText, { color: '#DC2626' }]}>Today</Text>
              </View>
            )}
          </View>
          <Text style={[styles.interviewRound, { color: colors.textTertiary }]}>
            Round {interview.round}
          </Text>
        </View>

        <Text style={[styles.interviewCandidateName, { color: colors.text }]}>
          {candidate.firstName} {candidate.lastName}
        </Text>
        <Text style={[styles.interviewJobTitle, { color: colors.textSecondary }]}>
          {job.jobTitle}
        </Text>

        <View style={[styles.interviewTimeRow, { backgroundColor: colors.background }]}>
          <Calendar size={14} color={colors.primary} />
          <Text style={[styles.interviewTimeText, { color: colors.text }]}>
            {interviewDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {interviewDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {interview.location && (
          <View style={styles.interviewLocationRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.interviewLocationText, { color: colors.textSecondary }]}>
              {interview.location}
            </Text>
          </View>
        )}

        <View style={styles.interviewersRow}>
          <Users size={14} color={colors.textSecondary} />
          <Text style={[styles.interviewersText, { color: colors.textSecondary }]}>
            {interview.interviewers.join(', ')}
          </Text>
        </View>
      </View>
    );
  };

  const renderOfferCard = (offer: Offer) => {
    const candidate = getCandidateById(offer.candidateId);
    const job = getJobById(offer.jobRequisitionId);
    if (!candidate || !job) return null;

    const daysUntilExpiration = offer.expirationDate
      ? Math.floor(
          (new Date(offer.expirationDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return (
      <View
        key={offer.id}
        style={[styles.offerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.offerHeader}>
          <View
            style={[
              styles.offerStatusBadge,
              {
                backgroundColor:
                  offer.status === 'sent'
                    ? '#F59E0B20'
                    : offer.status === 'accepted'
                    ? '#05966920'
                    : '#DC262620',
              },
            ]}
          >
            <Text
              style={[
                styles.offerStatusText,
                {
                  color:
                    offer.status === 'sent'
                      ? '#F59E0B'
                      : offer.status === 'accepted'
                      ? '#059669'
                      : '#DC2626',
                },
              ]}
            >
              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </Text>
          </View>
          {daysUntilExpiration !== null && daysUntilExpiration <= 3 && (
            <View style={[styles.urgentBadge, { backgroundColor: '#DC262620' }]}>
              <AlertCircle size={12} color="#DC2626" />
              <Text style={[styles.urgentBadgeText, { color: '#DC2626' }]}>
                {daysUntilExpiration} days left
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.offerCandidateName, { color: colors.text }]}>
          {candidate.firstName} {candidate.lastName}
        </Text>
        <Text style={[styles.offerJobTitle, { color: colors.textSecondary }]}>{offer.jobTitle}</Text>

        <View style={[styles.offerDetailsRow, { backgroundColor: colors.background }]}>
          <View style={styles.offerDetailItem}>
            <Text style={[styles.offerDetailLabel, { color: colors.textTertiary }]}>Salary</Text>
            <Text style={[styles.offerDetailValue, { color: colors.primary }]}>
              ${(offer.salary / 1000).toFixed(0)}K
            </Text>
          </View>
          {offer.bonus && (
            <View style={styles.offerDetailItem}>
              <Text style={[styles.offerDetailLabel, { color: colors.textTertiary }]}>Bonus</Text>
              <Text style={[styles.offerDetailValue, { color: colors.primary }]}>
                ${(offer.bonus / 1000).toFixed(0)}K
              </Text>
            </View>
          )}
          <View style={styles.offerDetailItem}>
            <Text style={[styles.offerDetailLabel, { color: colors.textTertiary }]}>
              Start Date
            </Text>
            <Text style={[styles.offerDetailValue, { color: colors.text }]}>
              {new Date(offer.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {offer.sentDate && (
          <View style={styles.offerFooter}>
            <Send size={12} color={colors.textTertiary} />
            <Text style={[styles.offerFooterText, { color: colors.textTertiary }]}>
              Sent {new Date(offer.sentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAnalytics = () => {
    const totalApps = applications.length;
    const hiredCount = applications.filter((a) => a.status === 'hired').length;
    const offerCount = applications.filter((a) => a.status === 'offer').length;
    const interviewCount = applications.filter((a) => a.status === 'interview').length;
    const screeningCount = applications.filter((a) => a.status === 'screening').length;

    const conversionRate = totalApps > 0 ? ((hiredCount / totalApps) * 100).toFixed(1) : '0';
    const offerAcceptanceRate =
      offers.length > 0
        ? ((offers.filter((o) => o.status === 'accepted').length / offers.length) * 100).toFixed(1)
        : '0';

    const sourceBreakdown = candidates.reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const jobTypeBreakdown = jobRequisitions.reduce((acc, j) => {
      acc[j.jobType] = (acc[j.jobType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <ScrollView style={styles.analyticsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.analyticsGrid}>
          <View
            style={[
              styles.analyticsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.analyticsIcon, { backgroundColor: '#3B82F620' }]}>
              <Users size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.analyticsValue, { color: colors.text }]}>{totalApps}</Text>
            <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>
              Total Applications
            </Text>
          </View>

          <View
            style={[
              styles.analyticsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.analyticsIcon, { backgroundColor: '#10B98120' }]}>
              <CheckCircle size={24} color="#10B981" />
            </View>
            <Text style={[styles.analyticsValue, { color: colors.text }]}>{hiredCount}</Text>
            <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>Hired</Text>
          </View>

          <View
            style={[
              styles.analyticsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.analyticsIcon, { backgroundColor: '#F59E0B20' }]}>
              <TrendingUp size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.analyticsValue, { color: colors.text }]}>{conversionRate}%</Text>
            <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>
              Conversion Rate
            </Text>
          </View>

          <View
            style={[
              styles.analyticsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.analyticsIcon, { backgroundColor: '#EC489920' }]}>
              <Award size={24} color="#EC4899" />
            </View>
            <Text style={[styles.analyticsValue, { color: colors.text }]}>
              {offerAcceptanceRate}%
            </Text>
            <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>
              Offer Acceptance
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.analyticsSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.analyticsSectionTitle, { color: colors.text }]}>
            Pipeline Status
          </Text>
          <View style={styles.pipelineStatsGrid}>
            <View style={styles.pipelineStat}>
              <Text style={[styles.pipelineStatValue, { color: '#8B5CF6' }]}>
                {screeningCount}
              </Text>
              <Text style={[styles.pipelineStatLabel, { color: colors.textSecondary }]}>
                Screening
              </Text>
            </View>
            <View style={styles.pipelineStat}>
              <Text style={[styles.pipelineStatValue, { color: '#F59E0B' }]}>
                {interviewCount}
              </Text>
              <Text style={[styles.pipelineStatLabel, { color: colors.textSecondary }]}>
                Interview
              </Text>
            </View>
            <View style={styles.pipelineStat}>
              <Text style={[styles.pipelineStatValue, { color: '#EC4899' }]}>{offerCount}</Text>
              <Text style={[styles.pipelineStatLabel, { color: colors.textSecondary }]}>
                Offer
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.analyticsSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.analyticsSectionTitle, { color: colors.text }]}>
            Source Effectiveness
          </Text>
          {Object.entries(sourceBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([source, count]) => {
              const percentage = ((count / candidates.length) * 100).toFixed(0);
              return (
                <View key={source} style={styles.sourceRow}>
                  <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>
                    {source.replace('_', ' ')}
                  </Text>
                  <View style={styles.sourceBarContainer}>
                    <View
                      style={[
                        styles.sourceBar,
                        { backgroundColor: colors.primary, width: `${percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.sourceCount, { color: colors.text }]}>{count}</Text>
                </View>
              );
            })}
        </View>

        <View
          style={[
            styles.analyticsSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.analyticsSectionTitle, { color: colors.text }]}>
            Job Type Distribution
          </Text>
          {Object.entries(jobTypeBreakdown).map(([type, count]) => {
            const percentage = ((count / jobRequisitions.length) * 100).toFixed(0);
            return (
              <View key={type} style={styles.sourceRow}>
                <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>
                  {type.replace('_', ' ')}
                </Text>
                <View style={styles.sourceBarContainer}>
                  <View
                    style={[
                      styles.sourceBar,
                      { backgroundColor: '#10B981', width: `${percentage}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.sourceCount, { color: colors.text }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Recruiting & ATS</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setJobForm({
                  jobTitle: '',
                  department: '',
                  location: '',
                  jobType: 'full_time',
                  employmentType: 'non_exempt',
                  openPositions: 1,
                  filledPositions: 0,
                  status: 'draft',
                  priority: 'medium',
                  isRemote: false,
                  experienceYears: 0,
                  requirements: [],
                  responsibilities: [],
                  benefits: [],
                  skillsRequired: [],
                });
                setSelectedJob(null);
                setEditMode(true);
                setIsCreatingJob(true);
                setIsJobDetailOpen(true);
              }}
            >
              <Plus size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search jobs, candidates..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              currentView === 'jobs' && [styles.tabActive, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setCurrentView('jobs')}
          >
            <Briefcase
              size={18}
              color={currentView === 'jobs' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: currentView === 'jobs' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              Jobs ({recruitingMetrics.totalJobs})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              currentView === 'pipeline' && [
                styles.tabActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setCurrentView('pipeline')}
          >
            <Users
              size={18}
              color={currentView === 'pipeline' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: currentView === 'pipeline' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              Pipeline ({recruitingMetrics.totalApplications})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              currentView === 'interviews' && [
                styles.tabActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setCurrentView('interviews')}
          >
            <Calendar
              size={18}
              color={currentView === 'interviews' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: currentView === 'interviews' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              Interviews ({recruitingMetrics.totalInterviews})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              currentView === 'offers' && [styles.tabActive, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setCurrentView('offers')}
          >
            <FileText
              size={18}
              color={currentView === 'offers' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: currentView === 'offers' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              Offers ({recruitingMetrics.totalOffers})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              currentView === 'analytics' && [
                styles.tabActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setCurrentView('analytics')}
          >
            <TrendingUp
              size={18}
              color={currentView === 'analytics' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: currentView === 'analytics' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {currentView === 'jobs' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'open', 'draft', 'on_hold', 'filled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        filterStatus === status ? colors.primary + '20' : colors.surface,
                      borderColor: filterStatus === status ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: filterStatus === status ? colors.primary : colors.textSecondary,
                      },
                    ]}
                  >
                    {status === 'all' ? 'All' : JOB_STATUS_LABELS[status as JobStatus]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.jobsGrid}>{filteredJobs.map(renderJobCard)}</View>
        </ScrollView>
      )}

      {currentView === 'pipeline' && (
        <ScrollView
          horizontal
          style={styles.pipelineContainer}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pipelineContent}
        >
          {renderPipelineColumn('new', 'New')}
          {renderPipelineColumn('screening', 'Screening')}
          {renderPipelineColumn('phone_screen', 'Phone Screen')}
          {renderPipelineColumn('interview', 'Interview')}
          {renderPipelineColumn('offer', 'Offer')}
          {renderPipelineColumn('hired', 'Hired')}
        </ScrollView>
      )}

      {currentView === 'interviews' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.interviewsGrid}>
            {getUpcomingInterviews().map(renderInterviewCard)}
          </View>
        </ScrollView>
      )}

      {currentView === 'offers' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.offersGrid}>{getPendingOffers().map(renderOfferCard)}</View>
        </ScrollView>
      )}

      {currentView === 'analytics' && renderAnalytics()}

      <Modal
        visible={isJobDetailOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsJobDetailOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <TouchableOpacity
                onPress={() => {
                  setIsJobDetailOpen(false);
                  setIsCreatingJob(false);
                  setEditMode(false);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isCreatingJob ? 'Create Job Requisition' : editMode ? 'Edit Requisition' : 'Job Requisition Details'}
              </Text>
            </View>
            {!isCreatingJob && !editMode && (
              <TouchableOpacity
                onPress={() => setEditMode(true)}
                style={[styles.editButton, { backgroundColor: colors.primary }]}
              >
                <Edit3 size={18} color="#FFF" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {(isCreatingJob || editMode) && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Success',
                    isCreatingJob ? 'Job requisition created successfully' : 'Job requisition updated successfully'
                  );
                  setIsJobDetailOpen(false);
                  setIsCreatingJob(false);
                  setEditMode(false);
                }}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
              >
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {renderJobRequisitionForm()}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );

  function renderJobRequisitionForm() {
    const isEditable = editMode || isCreatingJob;

    return (
      <View style={styles.formContainer}>
        {!isCreatingJob && selectedJob && (
          <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.requisitionIdRow}>
              <Text style={[styles.requisitionId, { color: colors.primary }]}>{selectedJob.id}</Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: JOB_STATUS_COLORS[selectedJob.status] + '20' },
                ]}
              >
                <Text style={[styles.statusPillText, { color: JOB_STATUS_COLORS[selectedJob.status] }]}>
                  {JOB_STATUS_LABELS[selectedJob.status]}
                </Text>
              </View>
            </View>

            {!editMode && (
              <View style={styles.actionButtonsRow}>
                {selectedJob.status === 'draft' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => Alert.alert('Submit for Approval', 'Submit this requisition for approval?')}
                  >
                    <CheckCircle2 size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>Submit for Approval</Text>
                  </TouchableOpacity>
                )}
                {selectedJob.status === 'open' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                      onPress={() => Alert.alert('Put On Hold', 'Put this requisition on hold?')}
                    >
                      <Pause size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Put On Hold</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#059669' }]}
                      onPress={() => Alert.alert('Mark as Filled', 'Mark this requisition as filled?')}
                    >
                      <CheckCircle size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Mark Filled</Text>
                    </TouchableOpacity>
                  </>
                )}
                {selectedJob.status === 'on_hold' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => Alert.alert('Reopen', 'Reopen this requisition?')}
                  >
                    <PlayCircle size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>Reopen</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
                  onPress={() => Alert.alert('Cancel Requisition', 'Cancel this requisition? This action cannot be undone.')}
                >
                  <XCircle size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Job Title *</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.jobTitle}
                onChangeText={(text) => setJobForm({ ...jobForm, jobTitle: text })}
                placeholder="e.g. Senior Software Engineer"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.jobTitle}</Text>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Department *</Text>
              {isEditable ? (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={jobForm.department}
                  onChangeText={(text) => setJobForm({ ...jobForm, department: text })}
                  placeholder="Department"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.department}</Text>
              )}
            </View>

            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location *</Text>
              {isEditable ? (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={jobForm.location}
                  onChangeText={(text) => setJobForm({ ...jobForm, location: text })}
                  placeholder="Location"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.location}</Text>
              )}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Job Type</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {(jobForm.jobType || selectedJob?.jobType || 'full_time').replace('_', ' ')}
              </Text>
            </View>

            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Employment Type</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {(jobForm.employmentType || selectedJob?.employmentType || 'non_exempt').replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Open Positions *</Text>
              {isEditable ? (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={String(jobForm.openPositions || 1)}
                  onChangeText={(text) => setJobForm({ ...jobForm, openPositions: parseInt(text) || 1 })}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.openPositions}</Text>
              )}
            </View>

            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Priority</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {(jobForm.priority || selectedJob?.priority || 'medium')}
              </Text>
            </View>
          </View>

          <View style={styles.formField}>
            <View style={styles.switchRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Remote Position</Text>
              {isEditable ? (
                <Switch
                  value={jobForm.isRemote}
                  onValueChange={(value) => setJobForm({ ...jobForm, isRemote: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {selectedJob?.isRemote ? 'Yes' : 'No'}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Compensation</Text>

          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Salary Min</Text>
              {isEditable ? (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={jobForm.salaryMin ? String(jobForm.salaryMin) : ''}
                  onChangeText={(text) => setJobForm({ ...jobForm, salaryMin: parseInt(text) || undefined })}
                  keyboardType="number-pad"
                  placeholder="50000"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {selectedJob?.salaryMin ? `${selectedJob.salaryMin.toLocaleString()}` : 'Not specified'}
                </Text>
              )}
            </View>

            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Salary Max</Text>
              {isEditable ? (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={jobForm.salaryMax ? String(jobForm.salaryMax) : ''}
                  onChangeText={(text) => setJobForm({ ...jobForm, salaryMax: parseInt(text) || undefined })}
                  keyboardType="number-pad"
                  placeholder="70000"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {selectedJob?.salaryMax ? `${selectedJob.salaryMax.toLocaleString()}` : 'Not specified'}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Experience Years</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={String(jobForm.experienceYears || 0)}
                onChangeText={(text) => setJobForm({ ...jobForm, experienceYears: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.experienceYears} years</Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Education Required</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.educationRequired || ''}
                onChangeText={(text) => setJobForm({ ...jobForm, educationRequired: text })}
                placeholder="Bachelor's degree in Computer Science"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.educationRequired}</Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Job Description</Text>
            {isEditable ? (
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.jobDescription || ''}
                onChangeText={(text) => setJobForm({ ...jobForm, jobDescription: text })}
                placeholder="Describe the role..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.jobDescription}</Text>
            )}
          </View>

          {!isEditable && selectedJob && (
            <>
              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Requirements</Text>
                  {selectedJob.requirements.map((req, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.text }]}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Responsibilities</Text>
                  {selectedJob.responsibilities.map((resp, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.text }]}>{resp}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Benefits</Text>
                  {selectedJob.benefits.map((benefit, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.text }]}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedJob.skillsRequired && selectedJob.skillsRequired.length > 0 && (
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Skills Required</Text>
                  <View style={styles.skillsContainer}>
                    {selectedJob.skillsRequired.map((skill, idx) => (
                      <View
                        key={idx}
                        style={[styles.skillChip, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                      >
                        <Text style={[styles.skillChipText, { color: colors.primary }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hiring Team</Text>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Hiring Manager</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.hiringManager || ''}
                onChangeText={(text) => setJobForm({ ...jobForm, hiringManager: text })}
                placeholder="Hiring Manager Name"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.hiringManager}</Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Recruiter</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.recruiter || ''}
                onChangeText={(text) => setJobForm({ ...jobForm, recruiter: text })}
                placeholder="Recruiter Name"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob?.recruiter || 'Not assigned'}</Text>
            )}
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline</Text>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target Start Date</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.targetStartDate || ''}
                onChangeText={(text) => setJobForm({ ...jobForm, targetStartDate: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {selectedJob?.targetStartDate
                  ? new Date(selectedJob.targetStartDate).toLocaleDateString()
                  : 'Not specified'}
              </Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Closing Date</Text>
            {isEditable ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={jobForm.closingDate || ''}
                onChangeText={(text) => setJobForm({ ...jobForm, closingDate: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                {selectedJob?.closingDate
                  ? new Date(selectedJob.closingDate).toLocaleDateString()
                  : 'Not specified'}
              </Text>
            )}
          </View>

          {!isEditable && selectedJob && (
            <>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Posted Date</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {new Date(selectedJob.postedDate).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Created By</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>{selectedJob.createdBy}</Text>
              </View>

              {selectedJob.approvedBy && (
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Approved By</Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {selectedJob.approvedBy} on {new Date(selectedJob.approvedAt!).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabBar: {
    paddingHorizontal: 16,
  },
  tabBarContent: {
    gap: 24,
    paddingBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  jobsGrid: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  jobId: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  hiringManagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hiringManagerText: {
    fontSize: 13,
  },
  pipelineContainer: {
    flex: 1,
  },
  pipelineContent: {
    padding: 16,
    gap: 12,
  },
  pipelineColumn: {
    width: width * 0.75,
    maxWidth: 300,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  pipelineColumnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  pipelineColumnTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  pipelineCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pipelineCountText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  pipelineColumnScroll: {
    maxHeight: 600,
    padding: 8,
  },
  candidateCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    position: 'relative',
  },
  starBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  candidateJobTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  candidateCurrentTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  candidateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  candidateMetaText: {
    fontSize: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  candidateCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateSource: {
    fontSize: 11,
  },
  candidateDate: {
    fontSize: 11,
  },
  interviewsGrid: {
    padding: 16,
    gap: 12,
  },
  interviewCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  interviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  interviewHeaderLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  interviewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interviewTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  interviewRound: {
    fontSize: 12,
  },
  interviewCandidateName: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  interviewJobTitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  interviewTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  interviewTimeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  interviewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  interviewLocationText: {
    fontSize: 13,
    flex: 1,
  },
  interviewersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interviewersText: {
    fontSize: 13,
    flex: 1,
  },
  offersGrid: {
    padding: 16,
    gap: 12,
  },
  offerCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  offerCandidateName: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  offerJobTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  offerDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  offerDetailItem: {
    alignItems: 'center',
  },
  offerDetailLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  offerDetailValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerFooterText: {
    fontSize: 12,
  },
  analyticsContainer: {
    flex: 1,
    padding: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  analyticsCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  analyticsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  analyticsSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  pipelineStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pipelineStat: {
    alignItems: 'center',
  },
  pipelineStatValue: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  pipelineStatLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sourceLabel: {
    fontSize: 13,
    width: 100,
    textTransform: 'capitalize',
  },
  sourceBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sourceBar: {
    height: '100%',
    borderRadius: 4,
  },
  sourceCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    width: 30,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  modalContent: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    gap: 16,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  requisitionIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requisitionId: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  actionButtonsRow: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 15,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginRight: 8,
    width: 12,
  },
  bulletText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  skillChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
