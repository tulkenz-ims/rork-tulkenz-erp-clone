import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ClipboardList,
  Search,
  Plus,
  Filter,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  ChevronRight,
  BarChart3,
  Send,
  Eye,
  ThumbsUp,
  Minus,
  ThumbsDown,
  X,
  FileText,
  Zap,
  UserPlus,
  LogOut,
  Settings,
  Star,
} from 'lucide-react-native';
import {
  type Survey,
  type SurveyTemplate,
  MOCK_SURVEYS,
  MOCK_TEMPLATES,
  MOCK_ENGAGEMENT_METRICS,
  SURVEY_STATUS_LABELS,
  SURVEY_STATUS_COLORS,
  SURVEY_TYPE_LABELS,
  SURVEY_TYPE_COLORS,
} from '@/constants/surveysConstants';

type SurveyView = 'dashboard' | 'active' | 'templates' | 'results';
type FilterStatus = 'all' | 'active' | 'scheduled' | 'closed' | 'draft';

export default function SurveysScreen() {
  const { colors } = useTheme();
  
  const [currentView, setCurrentView] = useState<SurveyView>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [, setShowFilterModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showSurveyDetail, setShowSurveyDetail] = useState(false);

  const metrics = MOCK_ENGAGEMENT_METRICS;

  const views = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { key: 'active' as const, label: 'Surveys', icon: ClipboardList },
    { key: 'templates' as const, label: 'Templates', icon: FileText },
    { key: 'results' as const, label: 'Results', icon: TrendingUp },
  ];

  const filteredSurveys = useMemo(() => {
    return MOCK_SURVEYS.filter(survey => {
      const matchesSearch = 
        survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        survey.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || survey.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterStatus]);

  const getTypeIcon = useCallback((type: Survey['type']) => {
    switch (type) {
      case 'engagement': return ClipboardList;
      case 'pulse': return Zap;
      case 'onboarding': return UserPlus;
      case 'exit': return LogOut;
      case 'eNPS': return ThumbsUp;
      case 'custom': return Settings;
      default: return ClipboardList;
    }
  }, []);

  const handleSendReminder = useCallback((survey: Survey) => {
    Alert.alert(
      'Send Reminder',
      `Send reminder to ${survey.targetCount - survey.responseCount} pending respondents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => console.log('Reminder sent for', survey.id) },
      ]
    );
  }, []);

  const handleViewSurvey = useCallback((survey: Survey) => {
    setSelectedSurvey(survey);
    setShowSurveyDetail(true);
  }, []);

  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: React.ReactNode,
    color: string,
    trend?: { value: number; direction: 'up' | 'down' | 'stable' }
  ) => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.metricContent}>
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
        {trend && (
          <View style={styles.trendContainer}>
            {trend.direction === 'up' ? (
              <TrendingUp size={12} color="#10B981" />
            ) : trend.direction === 'down' ? (
              <TrendingDown size={12} color="#EF4444" />
            ) : (
              <Minus size={12} color="#6B7280" />
            )}
            <Text style={[
              styles.trendText,
              { color: trend.direction === 'up' ? '#10B981' : trend.direction === 'down' ? '#EF4444' : '#6B7280' }
            ]}>
              {trend.value > 0 ? '+' : ''}{trend.value}
            </Text>
          </View>
        )}
        <Text style={[styles.metricSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
    </View>
  );

  const renderENPSGauge = () => {
    const { eNPS } = metrics;
    const getScoreColor = (score: number) => {
      if (score >= 50) return '#10B981';
      if (score >= 20) return '#F59E0B';
      return '#EF4444';
    };

    return (
      <View style={[styles.enpsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.enpsHeader}>
          <Text style={[styles.enpsTitle, { color: colors.text }]}>Employee Net Promoter Score</Text>
          {eNPS.trend === 'up' ? (
            <View style={styles.enpsTrend}>
              <TrendingUp size={16} color="#10B981" />
              <Text style={styles.enpsTrendText}>+{eNPS.score - (eNPS.previousScore || 0)}</Text>
            </View>
          ) : eNPS.trend === 'down' ? (
            <View style={styles.enpsTrend}>
              <TrendingDown size={16} color="#EF4444" />
              <Text style={[styles.enpsTrendText, { color: '#EF4444' }]}>
                {eNPS.score - (eNPS.previousScore || 0)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.enpsScoreContainer}>
          <Text style={[styles.enpsScore, { color: getScoreColor(eNPS.score) }]}>{eNPS.score}</Text>
          <Text style={[styles.enpsScoreLabel, { color: colors.textSecondary }]}>
            {eNPS.score >= 50 ? 'Excellent' : eNPS.score >= 20 ? 'Good' : 'Needs Improvement'}
          </Text>
        </View>

        <View style={styles.enpsBreakdown}>
          <View style={styles.enpsSegment}>
            <View style={[styles.enpsSegmentIcon, { backgroundColor: '#10B98120' }]}>
              <ThumbsUp size={16} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.enpsSegmentValue, { color: colors.text }]}>{eNPS.promoters}</Text>
              <Text style={[styles.enpsSegmentLabel, { color: colors.textSecondary }]}>Promoters</Text>
            </View>
          </View>
          <View style={styles.enpsSegment}>
            <View style={[styles.enpsSegmentIcon, { backgroundColor: '#6B728020' }]}>
              <Minus size={16} color="#6B7280" />
            </View>
            <View>
              <Text style={[styles.enpsSegmentValue, { color: colors.text }]}>{eNPS.passives}</Text>
              <Text style={[styles.enpsSegmentLabel, { color: colors.textSecondary }]}>Passives</Text>
            </View>
          </View>
          <View style={styles.enpsSegment}>
            <View style={[styles.enpsSegmentIcon, { backgroundColor: '#EF444420' }]}>
              <ThumbsDown size={16} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.enpsSegmentValue, { color: colors.text }]}>{eNPS.detractors}</Text>
              <Text style={[styles.enpsSegmentLabel, { color: colors.textSecondary }]}>Detractors</Text>
            </View>
          </View>
        </View>

        <View style={[styles.enpsBar, { backgroundColor: colors.border }]}>
          <View 
            style={[styles.enpsBarSegment, { 
              backgroundColor: '#10B981', 
              width: `${(eNPS.promoters / eNPS.totalResponses) * 100}%` 
            }]} 
          />
          <View 
            style={[styles.enpsBarSegment, { 
              backgroundColor: '#6B7280', 
              width: `${(eNPS.passives / eNPS.totalResponses) * 100}%` 
            }]} 
          />
          <View 
            style={[styles.enpsBarSegment, { 
              backgroundColor: '#EF4444', 
              width: `${(eNPS.detractors / eNPS.totalResponses) * 100}%` 
            }]} 
          />
        </View>
      </View>
    );
  };

  const renderCategoryScores = () => (
    <View style={[styles.categoriesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.categoriesTitle, { color: colors.text }]}>Engagement by Category</Text>
      {metrics.categoryScores.slice(0, 6).map((category: CategoryScore) => (
        <View key={category.category} style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
            <View style={styles.categoryScoreContainer}>
              <Text style={[styles.categoryScore, { color: colors.text }]}>{category.score.toFixed(1)}</Text>
              {category.change !== 0 && (
                <View style={[
                  styles.categoryChange,
                  { backgroundColor: category.change > 0 ? '#10B98120' : '#EF444420' }
                ]}>
                  {category.change > 0 ? (
                    <TrendingUp size={10} color="#10B981" />
                  ) : (
                    <TrendingDown size={10} color="#EF4444" />
                  )}
                  <Text style={[
                    styles.categoryChangeText,
                    { color: category.change > 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    {category.change > 0 ? '+' : ''}{category.change.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.categoryBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.categoryBarFill, 
                { 
                  backgroundColor: category.score >= 4 ? '#10B981' : category.score >= 3 ? '#F59E0B' : '#EF4444',
                  width: `${(category.score / 5) * 100}%`
                }
              ]} 
            />
          </View>
        </View>
      ))}
    </View>
  );

  const renderSurveyCard = (survey: Survey) => {
    const TypeIcon = getTypeIcon(survey.type);
    const responseRate = Math.round((survey.responseCount / survey.targetCount) * 100);
    const statusColor = SURVEY_STATUS_COLORS[survey.status];

    return (
      <TouchableOpacity
        key={survey.id}
        style={[styles.surveyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewSurvey(survey)}
      >
        <View style={styles.surveyHeader}>
          <View style={styles.surveyHeaderLeft}>
            <View style={[styles.surveyTypeIcon, { backgroundColor: SURVEY_TYPE_COLORS[survey.type] + '20' }]}>
              <TypeIcon size={18} color={SURVEY_TYPE_COLORS[survey.type]} />
            </View>
            <View style={styles.surveyHeaderText}>
              <Text style={[styles.surveyTitle, { color: colors.text }]} numberOfLines={1}>
                {survey.title}
              </Text>
              <Text style={[styles.surveyType, { color: colors.textSecondary }]}>
                {SURVEY_TYPE_LABELS[survey.type]} • {survey.targetAudience}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {SURVEY_STATUS_LABELS[survey.status]}
            </Text>
          </View>
        </View>

        <Text style={[styles.surveyDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {survey.description}
        </Text>

        <View style={styles.surveyStats}>
          <View style={styles.surveyStatItem}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.surveyStatText, { color: colors.textSecondary }]}>
              {survey.responseCount}/{survey.targetCount} responses
            </Text>
          </View>
          <View style={styles.surveyStatItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.surveyStatText, { color: colors.textSecondary }]}>
              {new Date(survey.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.responseProgress}>
          <View style={styles.responseProgressHeader}>
            <Text style={[styles.responseProgressLabel, { color: colors.textSecondary }]}>
              Response Rate
            </Text>
            <Text style={[styles.responseProgressValue, { color: colors.text }]}>{responseRate}%</Text>
          </View>
          <View style={[styles.responseProgressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.responseProgressFill, 
                { 
                  backgroundColor: responseRate >= 70 ? '#10B981' : responseRate >= 50 ? '#F59E0B' : '#EF4444',
                  width: `${responseRate}%`
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.surveyActions}>
          {survey.status === 'active' && (
            <TouchableOpacity 
              style={[styles.surveyAction, { backgroundColor: colors.primary + '20' }]}
              onPress={() => handleSendReminder(survey)}
            >
              <Send size={14} color={colors.primary} />
              <Text style={[styles.surveyActionText, { color: colors.primary }]}>Remind</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.surveyAction, { backgroundColor: colors.border }]}
            onPress={() => handleViewSurvey(survey)}
          >
            <Eye size={14} color={colors.textSecondary} />
            <Text style={[styles.surveyActionText, { color: colors.textSecondary }]}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.surveyAction, { backgroundColor: colors.border }]}
          >
            <BarChart3 size={14} color={colors.textSecondary} />
            <Text style={[styles.surveyActionText, { color: colors.textSecondary }]}>Results</Text>
          </TouchableOpacity>
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderTemplateCard = (template: SurveyTemplate) => {
    const TypeIcon = getTypeIcon(template.type);

    return (
      <TouchableOpacity
        key={template.id}
        style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.templateIcon, { backgroundColor: SURVEY_TYPE_COLORS[template.type] + '20' }]}>
          <TypeIcon size={24} color={SURVEY_TYPE_COLORS[template.type]} />
        </View>
        <View style={styles.templateContent}>
          <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
          <Text style={[styles.templateDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {template.description}
          </Text>
          <View style={styles.templateMeta}>
            <View style={styles.templateMetaItem}>
              <FileText size={12} color={colors.textTertiary} />
              <Text style={[styles.templateMetaText, { color: colors.textTertiary }]}>
                {template.questionCount} questions
              </Text>
            </View>
            <View style={styles.templateMetaItem}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[styles.templateMetaText, { color: colors.textTertiary }]}>
                ~{template.estimatedTime} min
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.useTemplateBtn, { backgroundColor: colors.primary }]}>
          <Plus size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderActiveSurveys = () => (
    <View style={styles.activeSurveysSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Surveys</Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          {MOCK_SURVEYS.filter(s => s.status === 'active').length} active
        </Text>
      </View>
      {MOCK_SURVEYS.filter(s => s.status === 'active').slice(0, 3).map(renderSurveyCard)}
    </View>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Overall Score',
          metrics.overallScore.toFixed(1),
          'out of 5.0',
          <Star size={20} color="#F59E0B" />,
          '#F59E0B',
          { value: 0.1, direction: 'up' }
        )}
        {renderMetricCard(
          'Response Rate',
          `${metrics.responseRate}%`,
          'participation',
          <Users size={20} color="#3B82F6" />,
          '#3B82F6',
          { value: 2, direction: 'up' }
        )}
        {renderMetricCard(
          'Active Surveys',
          metrics.activeSurveys,
          'in progress',
          <ClipboardList size={20} color="#10B981" />,
          '#10B981'
        )}
        {renderMetricCard(
          'Avg. Time',
          `${metrics.averageCompletionTime}m`,
          'to complete',
          <Clock size={20} color="#8B5CF6" />,
          '#8B5CF6'
        )}
      </View>

      {renderENPSGauge()}
      {renderCategoryScores()}
      {renderActiveSurveys()}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderSurveysList = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.listHeader}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search surveys..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterChips}>
        {(['all', 'active', 'scheduled', 'closed', 'draft'] as FilterStatus[]).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterStatus === status ? colors.primary : colors.surface,
                borderColor: filterStatus === status ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterStatus === status ? '#FFFFFF' : colors.textSecondary }
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredSurveys.length > 0 ? (
        <View style={styles.surveysList}>
          {filteredSurveys.map(renderSurveyCard)}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <ClipboardList size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No surveys found</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderTemplates = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.templatesHeader}>
        <Text style={[styles.templatesTitle, { color: colors.text }]}>Survey Templates</Text>
        <Text style={[styles.templatesSubtitle, { color: colors.textSecondary }]}>
          Start from a template or create your own
        </Text>
      </View>

      <TouchableOpacity style={[styles.createCustomBtn, { backgroundColor: colors.primary }]}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.createCustomText}>Create Custom Survey</Text>
      </TouchableOpacity>

      <View style={styles.templatesList}>
        {MOCK_TEMPLATES.map(renderTemplateCard)}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderResults = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.resultsHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.resultsTitle, { color: colors.text }]}>Survey Analytics</Text>
        <View style={styles.resultsStats}>
          <View style={styles.resultsStat}>
            <Text style={[styles.resultsStatValue, { color: colors.text }]}>
              {MOCK_SURVEYS.filter(s => s.status === 'closed').length}
            </Text>
            <Text style={[styles.resultsStatLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={styles.resultsStat}>
            <Text style={[styles.resultsStatValue, { color: colors.text }]}>
              {MOCK_SURVEYS.reduce((acc, s) => acc + s.responseCount, 0)}
            </Text>
            <Text style={[styles.resultsStatLabel, { color: colors.textSecondary }]}>Total Responses</Text>
          </View>
          <View style={styles.resultsStat}>
            <Text style={[styles.resultsStatValue, { color: colors.text }]}>
              {Math.round(MOCK_SURVEYS.reduce((acc, s) => acc + (s.responseCount / s.targetCount) * 100, 0) / MOCK_SURVEYS.length)}%
            </Text>
            <Text style={[styles.resultsStatLabel, { color: colors.textSecondary }]}>Avg Response</Text>
          </View>
        </View>
      </View>

      {renderCategoryScores()}

      <View style={styles.recentResults}>
        <Text style={[styles.recentResultsTitle, { color: colors.text }]}>Recent Survey Results</Text>
        {MOCK_SURVEYS.filter(s => s.status === 'closed' || s.responseCount > 0).slice(0, 5).map(survey => (
          <TouchableOpacity
            key={survey.id}
            style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.resultCardHeader}>
              <Text style={[styles.resultCardTitle, { color: colors.text }]}>{survey.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: SURVEY_STATUS_COLORS[survey.status] + '20' }]}>
                <Text style={[styles.statusText, { color: SURVEY_STATUS_COLORS[survey.status] }]}>
                  {SURVEY_STATUS_LABELS[survey.status]}
                </Text>
              </View>
            </View>
            <View style={styles.resultCardStats}>
              <Text style={[styles.resultCardStat, { color: colors.textSecondary }]}>
                {survey.responseCount} responses
              </Text>
              <Text style={[styles.resultCardStat, { color: colors.textSecondary }]}>
                {Math.round((survey.responseCount / survey.targetCount) * 100)}% rate
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} style={styles.resultChevron} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderSurveyDetailModal = () => {
    if (!selectedSurvey) return null;

    return (
      <Modal
        visible={showSurveyDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSurveyDetail(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSurveyDetail(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Survey Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedSurvey.title}</Text>
              <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                {selectedSurvey.description}
              </Text>

              <View style={styles.detailMeta}>
                <View style={styles.detailMetaRow}>
                  <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Type</Text>
                  <View style={[styles.typeBadge, { backgroundColor: SURVEY_TYPE_COLORS[selectedSurvey.type] + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: SURVEY_TYPE_COLORS[selectedSurvey.type] }]}>
                      {SURVEY_TYPE_LABELS[selectedSurvey.type]}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: SURVEY_STATUS_COLORS[selectedSurvey.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: SURVEY_STATUS_COLORS[selectedSurvey.status] }]}>
                      {SURVEY_STATUS_LABELS[selectedSurvey.status]}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Anonymous</Text>
                  <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                    {selectedSurvey.anonymous ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Target Audience</Text>
                  <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                    {selectedSurvey.targetAudience}
                  </Text>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={[styles.detailMetaLabel, { color: colors.textSecondary }]}>Date Range</Text>
                  <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                    {new Date(selectedSurvey.startDate).toLocaleDateString()} - {new Date(selectedSurvey.endDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Response Statistics</Text>
              <View style={styles.responseStats}>
                <View style={styles.responseStat}>
                  <Text style={[styles.responseStatValue, { color: colors.text }]}>
                    {selectedSurvey.responseCount}
                  </Text>
                  <Text style={[styles.responseStatLabel, { color: colors.textSecondary }]}>Responses</Text>
                </View>
                <View style={styles.responseStat}>
                  <Text style={[styles.responseStatValue, { color: colors.text }]}>
                    {selectedSurvey.targetCount}
                  </Text>
                  <Text style={[styles.responseStatLabel, { color: colors.textSecondary }]}>Target</Text>
                </View>
                <View style={styles.responseStat}>
                  <Text style={[styles.responseStatValue, { color: colors.text }]}>
                    {Math.round((selectedSurvey.responseCount / selectedSurvey.targetCount) * 100)}%
                  </Text>
                  <Text style={[styles.responseStatLabel, { color: colors.textSecondary }]}>Rate</Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                Questions ({selectedSurvey.questions.length})
              </Text>
              {selectedSurvey.questions.map((question, index) => (
                <View key={question.id} style={styles.questionItem}>
                  <Text style={[styles.questionNumber, { color: colors.primary }]}>Q{index + 1}</Text>
                  <View style={styles.questionContent}>
                    <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
                    <View style={styles.questionMeta}>
                      <Text style={[styles.questionType, { color: colors.textTertiary }]}>
                        {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
                      </Text>
                      {question.required && (
                        <Text style={[styles.questionRequired, { color: '#EF4444' }]}>Required</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Employee Surveys',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity style={styles.headerBtn}>
              <Plus size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

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
                onPress={() => setCurrentView(view.key)}
              >
                <Icon size={18} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[
                    styles.viewTabText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {view.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'active' && renderSurveysList()}
      {currentView === 'templates' && renderTemplates()}
      {currentView === 'results' && renderResults()}

      {renderSurveyDetailModal()}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => Alert.alert('Create Survey', 'Choose a template or create from scratch')}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBtn: {
    padding: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginVertical: 12,
    gap: 6,
    borderWidth: 1,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  metricSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  enpsCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  enpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  enpsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  enpsTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enpsTrendText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  enpsScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  enpsScore: {
    fontSize: 56,
    fontWeight: '700' as const,
  },
  enpsScoreLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  enpsBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  enpsSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  enpsSegmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enpsSegmentValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  enpsSegmentLabel: {
    fontSize: 12,
  },
  enpsBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  enpsBarSegment: {
    height: '100%',
  },
  categoriesCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  categoryRow: {
    marginBottom: 14,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  categoryScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryScore: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  categoryChangeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  categoryBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  activeSurveysSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sectionCount: {
    fontSize: 14,
  },
  listHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  surveysList: {
    padding: 16,
    paddingTop: 0,
  },
  surveyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  surveyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  surveyTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surveyHeaderText: {
    flex: 1,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
    paddingRight: 80,
  },
  surveyType: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  surveyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  surveyStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  surveyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  surveyStatText: {
    fontSize: 13,
  },
  responseProgress: {
    marginBottom: 12,
  },
  responseProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  responseProgressLabel: {
    fontSize: 13,
  },
  responseProgressValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  responseProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  responseProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  surveyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  surveyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  surveyActionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 20,
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
  templatesHeader: {
    padding: 16,
  },
  templatesTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  templatesSubtitle: {
    fontSize: 14,
  },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createCustomText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  templatesList: {
    padding: 16,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  templateIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateContent: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  templateMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateMetaText: {
    fontSize: 12,
  },
  useTemplateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsHeader: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  resultsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultsStat: {
    alignItems: 'center',
  },
  resultsStatValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  resultsStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  recentResults: {
    padding: 16,
    paddingTop: 0,
  },
  recentResultsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    position: 'relative',
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
    paddingRight: 12,
  },
  resultCardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  resultCardStat: {
    fontSize: 13,
  },
  resultChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  detailMeta: {
    gap: 14,
  },
  detailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailMetaLabel: {
    fontSize: 14,
  },
  detailMetaValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  responseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  responseStat: {
    alignItems: 'center',
  },
  responseStatValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  responseStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  questionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    width: 28,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  questionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  questionType: {
    fontSize: 12,
  },
  questionRequired: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
