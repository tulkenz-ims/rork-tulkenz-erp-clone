import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  GitBranch,
  Search,
  Filter,
  X,
  Users,
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  MapPin,
  UserCog,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDepartments } from '@/hooks/useDepartments';
import { useFacilities } from '@/hooks/useFacilities';
import {
  useOrgHierarchy,
  useOrgTree,
  getHierarchyStats,
  OrgEmployee,
  OrgNode,
} from '@/hooks/useOrgHierarchy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 24;
const VERTICAL_GAP = 60;
const CONNECTOR_COLOR = '#CBD5E1';

const ROLE_COLORS: Record<string, string> = {
  superadmin: '#DC2626',
  admin: '#EA580C',
  manager: '#7C3AED',
  supervisor: '#2563EB',
  employee: '#059669',
  contractor: '#6B7280',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  inactive: '#6B7280',
  on_leave: '#F59E0B',
};

type ViewMode = 'hierarchy' | 'department' | 'facility';

interface LayoutNode extends OrgNode {
  x: number;
  y: number;
  width: number;
  subtreeWidth: number;
}

export default function OrgChartScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgEmployee | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState(1);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const { data: departments = [] } = useDepartments();
  const { data: facilities = [] } = useFacilities();

  const {
    data: employees = [],
    isLoading,
    refetch,
    isRefetching,
  } = useOrgHierarchy({
    facilityId: selectedFacility || undefined,
    departmentCode: selectedDepartment || undefined,
  });

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      emp =>
        emp.full_name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.employee_code.toLowerCase().includes(query) ||
        (emp.position && emp.position.toLowerCase().includes(query))
    );
  }, [employees, searchQuery]);

  const orgTree = useOrgTree(filteredEmployees);
  const stats = useMemo(() => getHierarchyStats(employees), [employees]);

  const hasFilters = selectedFacility || selectedDepartment || searchQuery;

  const clearFilters = useCallback(() => {
    setSelectedFacility(null);
    setSelectedDepartment(null);
    setSearchQuery('');
  }, []);

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set(employees.map(e => e.id));
    setExpandedNodes(allIds);
  }, [employees]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.4));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  const calculateLayout = useCallback((nodes: OrgNode[], startX: number = 0, level: number = 0): LayoutNode[] => {
    const result: LayoutNode[] = [];
    let currentX = startX;

    nodes.forEach(node => {
      const isExpanded = expandedNodes.has(node.id) || level === 0;
      const visibleChildren = isExpanded ? node.children : [];
      
      let childLayouts: LayoutNode[] = [];
      let subtreeWidth = NODE_WIDTH;

      if (visibleChildren.length > 0) {
        childLayouts = calculateLayout(visibleChildren, currentX, level + 1);
        subtreeWidth = childLayouts.reduce((sum, child) => sum + child.subtreeWidth + HORIZONTAL_GAP, -HORIZONTAL_GAP);
        subtreeWidth = Math.max(subtreeWidth, NODE_WIDTH);
      }

      const nodeX = currentX + subtreeWidth / 2 - NODE_WIDTH / 2;
      const nodeY = level * (NODE_HEIGHT + VERTICAL_GAP);

      result.push({
        ...node,
        x: nodeX,
        y: nodeY,
        width: NODE_WIDTH,
        subtreeWidth,
        children: childLayouts as OrgNode[],
      });

      currentX += subtreeWidth + HORIZONTAL_GAP;
    });

    return result;
  }, [expandedNodes]);

  const layoutNodes = useMemo(() => calculateLayout(orgTree), [calculateLayout, orgTree]);

  const totalWidth = useMemo(() => {
    if (layoutNodes.length === 0) return SCREEN_WIDTH;
    const maxX = Math.max(...layoutNodes.map(n => n.x + n.width));
    return Math.max(maxX + 40, SCREEN_WIDTH);
  }, [layoutNodes]);

  const totalHeight = useMemo(() => {
    const maxLevel = Math.max(...employees.map(e => e.level), 0);
    return Math.max((maxLevel + 1) * (NODE_HEIGHT + VERTICAL_GAP) + 100, SCREEN_HEIGHT * 0.6);
  }, [employees]);

  const getDepartmentName = (code: string | null) => {
    if (!code) return 'No Department';
    const dept = departments.find(d => d.department_code === code);
    return dept?.name || code;
  };

  const getFacilityName = (id: string | null) => {
    if (!id) return 'No Facility';
    const fac = facilities.find(f => f.id === id);
    return fac?.name || 'Unknown';
  };

  const renderConnector = (parent: LayoutNode, child: LayoutNode) => {
    const startX = parent.x + NODE_WIDTH / 2;
    const startY = parent.y + NODE_HEIGHT;
    const endX = child.x + NODE_WIDTH / 2;
    const endY = child.y;
    const midY = startY + (endY - startY) / 2;

    return (
      <View key={`connector-${parent.id}-${child.id}`} style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            styles.connectorVertical,
            {
              left: startX - 1,
              top: startY,
              height: midY - startY,
              backgroundColor: CONNECTOR_COLOR,
            },
          ]}
        />
        <View
          style={[
            styles.connectorHorizontal,
            {
              left: Math.min(startX, endX),
              top: midY - 1,
              width: Math.abs(endX - startX),
              backgroundColor: CONNECTOR_COLOR,
            },
          ]}
        />
        <View
          style={[
            styles.connectorVertical,
            {
              left: endX - 1,
              top: midY,
              height: endY - midY,
              backgroundColor: CONNECTOR_COLOR,
            },
          ]}
        />
      </View>
    );
  };

  const renderNode = (node: LayoutNode, depth: number = 0) => {
    const roleColor = ROLE_COLORS[node.role] || colors.primary;
    const statusColor = STATUS_COLORS[node.status] || colors.textTertiary;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || depth === 0;
    const childNodes = node.children as LayoutNode[];

    return (
      <React.Fragment key={node.id}>
        <Pressable
          style={[
            styles.nodeCard,
            {
              left: node.x,
              top: node.y,
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: '#000',
            },
          ]}
          onPress={() => setSelectedEmployee(node)}
        >
          <View style={[styles.nodeRoleBorder, { backgroundColor: roleColor }]} />
          
          <View style={styles.nodeContent}>
            <View style={styles.nodeHeader}>
              <View style={[styles.nodeAvatar, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.nodeAvatarText, { color: roleColor }]}>
                  {node.first_name[0]}{node.last_name[0]}
                </Text>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            </View>
            
            <Text style={[styles.nodeName, { color: colors.text }]} numberOfLines={1}>
              {node.full_name}
            </Text>
            <Text style={[styles.nodePosition, { color: colors.textSecondary }]} numberOfLines={1}>
              {node.position || node.role}
            </Text>
          </View>

          {hasChildren && (
            <Pressable
              style={[styles.expandButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronUp size={12} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={12} color={colors.textSecondary} />
              )}
              <Text style={[styles.expandCount, { color: colors.textSecondary }]}>
                {node.direct_reports_count}
              </Text>
            </Pressable>
          )}
        </Pressable>

        {isExpanded && childNodes.map(child => renderConnector(node, child))}
        {isExpanded && childNodes.map(child => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  const renderGroupedByDepartment = () => {
    const grouped = employees.reduce((acc, emp) => {
      const key = emp.department_code || 'unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    }, {} as Record<string, OrgEmployee[]>);

    return (
      <View style={styles.groupedContainer}>
        {Object.entries(grouped).map(([deptCode, emps]) => (
          <View key={deptCode} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.groupHeader, { borderBottomColor: colors.border }]}>
              <Building2 size={18} color={colors.primary} />
              <Text style={[styles.groupTitle, { color: colors.text }]}>
                {deptCode === 'unassigned' ? 'Unassigned' : getDepartmentName(deptCode)}
              </Text>
              <View style={[styles.groupCount, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.groupCountText, { color: colors.primary }]}>{emps.length}</Text>
              </View>
            </View>
            <View style={styles.groupMembers}>
              {emps.slice(0, 6).map(emp => (
                <Pressable
                  key={emp.id}
                  style={[styles.groupMember, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => setSelectedEmployee(emp)}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: (ROLE_COLORS[emp.role] || colors.primary) + '20' }]}>
                    <Text style={[styles.memberAvatarText, { color: ROLE_COLORS[emp.role] || colors.primary }]}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </Text>
                  </View>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {emp.full_name}
                  </Text>
                </Pressable>
              ))}
              {emps.length > 6 && (
                <View style={[styles.moreMembers, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.moreMembersText, { color: colors.textSecondary }]}>
                    +{emps.length - 6} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGroupedByFacility = () => {
    const grouped = employees.reduce((acc, emp) => {
      const key = emp.facility_id || 'unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    }, {} as Record<string, OrgEmployee[]>);

    return (
      <View style={styles.groupedContainer}>
        {Object.entries(grouped).map(([facId, emps]) => (
          <View key={facId} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.groupHeader, { borderBottomColor: colors.border }]}>
              <MapPin size={18} color={colors.success} />
              <Text style={[styles.groupTitle, { color: colors.text }]}>
                {facId === 'unassigned' ? 'Unassigned' : getFacilityName(facId)}
              </Text>
              <View style={[styles.groupCount, { backgroundColor: colors.successBg }]}>
                <Text style={[styles.groupCountText, { color: colors.success }]}>{emps.length}</Text>
              </View>
            </View>
            <View style={styles.groupMembers}>
              {emps.slice(0, 6).map(emp => (
                <Pressable
                  key={emp.id}
                  style={[styles.groupMember, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => setSelectedEmployee(emp)}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: (ROLE_COLORS[emp.role] || colors.primary) + '20' }]}>
                    <Text style={[styles.memberAvatarText, { color: ROLE_COLORS[emp.role] || colors.primary }]}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </Text>
                  </View>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {emp.full_name}
                  </Text>
                </Pressable>
              ))}
              {emps.length > 6 && (
                <View style={[styles.moreMembers, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.moreMembersText, { color: colors.textSecondary }]}>
                    +{emps.length - 6} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Org Chart',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        <Pressable
          style={[
            styles.filterButton,
            { backgroundColor: hasFilters ? colors.primary + '20' : colors.backgroundSecondary },
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={16} color={hasFilters ? colors.primary : colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.viewModeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewModeScroll}>
          {([
            { key: 'hierarchy', label: 'Hierarchy', icon: GitBranch },
            { key: 'department', label: 'By Department', icon: Building2 },
            { key: 'facility', label: 'By Facility', icon: MapPin },
          ] as const).map(mode => (
            <Pressable
              key={mode.key}
              style={[
                styles.viewModeButton,
                { backgroundColor: viewMode === mode.key ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setViewMode(mode.key)}
            >
              <mode.icon size={14} color={viewMode === mode.key ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.viewModeText, { color: viewMode === mode.key ? '#FFF' : colors.text }]}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {viewMode === 'hierarchy' && (
        <View style={styles.toolbarContainer}>
          <View style={styles.toolbarLeft}>
            <Pressable
              style={[styles.toolbarButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={expandAll}
            >
              <Text style={[styles.toolbarButtonText, { color: colors.text }]}>Expand All</Text>
            </Pressable>
            <Pressable
              style={[styles.toolbarButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={collapseAll}
            >
              <Text style={[styles.toolbarButtonText, { color: colors.text }]}>Collapse</Text>
            </Pressable>
          </View>
          <View style={styles.toolbarRight}>
            <Pressable
              style={[styles.zoomButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={zoomOut}
            >
              <ZoomOut size={16} color={colors.textSecondary} />
            </Pressable>
            <View style={[styles.zoomIndicator, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.zoomText, { color: colors.text }]}>{Math.round(scale * 100)}%</Text>
            </View>
            <Pressable
              style={[styles.zoomButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={zoomIn}
            >
              <ZoomIn size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.zoomButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={resetZoom}
            >
              <Maximize2 size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.statsBar}>
        <View style={[styles.statPill, { backgroundColor: colors.primaryLight }]}>
          <Users size={12} color={colors.primary} />
          <Text style={[styles.statPillText, { color: colors.primary }]}>{stats.totalEmployees}</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.successBg }]}>
          <UserCog size={12} color={colors.success} />
          <Text style={[styles.statPillText, { color: colors.success }]}>{stats.managers} managers</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.warningBg }]}>
          <Layers size={12} color={colors.warning} />
          <Text style={[styles.statPillText, { color: colors.warning }]}>{stats.maxLevel} levels</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading organization...
          </Text>
        </View>
      ) : filteredEmployees.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <GitBranch size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Employees Found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {hasFilters
              ? 'Try adjusting your filters'
              : 'Add employees to see the organization chart'}
          </Text>
          {hasFilters && (
            <Pressable
              style={[styles.clearFiltersButton, { backgroundColor: colors.primary }]}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </Pressable>
          )}
        </View>
      ) : viewMode === 'hierarchy' ? (
        <ScrollView
          ref={scrollViewRef}
          style={styles.chartScrollView}
          contentContainerStyle={[
            styles.chartContent,
            { 
              width: totalWidth * scale, 
              height: totalHeight * scale,
              transform: [{ scale }],
            },
          ]}
          horizontal
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          maximumZoomScale={2}
          minimumZoomScale={0.4}
        >
          <View style={[styles.chartCanvas, { width: totalWidth, height: totalHeight }]}>
            {layoutNodes.map(node => renderNode(node))}
          </View>
        </ScrollView>
      ) : viewMode === 'department' ? (
        <ScrollView
          style={styles.groupedScrollView}
          contentContainerStyle={styles.groupedScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {renderGroupedByDepartment()}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.groupedScrollView}
          contentContainerStyle={styles.groupedScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {renderGroupedByFacility()}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
          <View style={[styles.filtersModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.filtersHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filtersTitle, { color: colors.text }]}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.filtersContent}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Facility</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    !selectedFacility && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedFacility(null)}
                >
                  <Text style={[styles.filterOptionText, { color: !selectedFacility ? colors.primary : colors.text }]}>
                    All
                  </Text>
                </Pressable>
                {facilities.map(fac => (
                  <Pressable
                    key={fac.id}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      selectedFacility === fac.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedFacility(fac.id)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedFacility === fac.id ? colors.primary : colors.text }]}>
                      {fac.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Department</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    !selectedDepartment && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedDepartment(null)}
                >
                  <Text style={[styles.filterOptionText, { color: !selectedDepartment ? colors.primary : colors.text }]}>
                    All
                  </Text>
                </Pressable>
                {departments.filter(d => d.status === 'active').map(dept => (
                  <Pressable
                    key={dept.id}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      selectedDepartment === dept.department_code && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedDepartment(dept.department_code)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedDepartment === dept.department_code ? colors.primary : colors.text }]}>
                      {dept.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.filtersFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.filtersClearBtn, { borderColor: colors.border }]}
                onPress={clearFilters}
              >
                <Text style={[styles.filtersClearText, { color: colors.textSecondary }]}>Clear All</Text>
              </Pressable>
              <Pressable
                style={[styles.filtersApplyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.filtersApplyText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={!!selectedEmployee}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
            {selectedEmployee && (
              <>
                <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                  <Pressable onPress={() => setSelectedEmployee(null)} style={styles.modalCloseBtn}>
                    <X size={24} color={colors.text} />
                  </Pressable>
                </View>

                <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.profileSection}>
                    <View style={[styles.profileAvatar, { backgroundColor: (ROLE_COLORS[selectedEmployee.role] || colors.primary) + '20' }]}>
                      <Text style={[styles.profileAvatarText, { color: ROLE_COLORS[selectedEmployee.role] || colors.primary }]}>
                        {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                      </Text>
                    </View>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {selectedEmployee.full_name}
                    </Text>
                    <Text style={[styles.profilePosition, { color: colors.textSecondary }]}>
                      {selectedEmployee.position || selectedEmployee.role}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[selectedEmployee.status] || colors.textTertiary) + '20' }]}>
                      <View style={[styles.statusDotLarge, { backgroundColor: STATUS_COLORS[selectedEmployee.status] }]} />
                      <Text style={[styles.statusText, { color: STATUS_COLORS[selectedEmployee.status] }]}>
                        {selectedEmployee.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Contact</Text>
                    
                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Mail size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Email</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEmployee.email}</Text>
                      </View>
                    </View>

                    {selectedEmployee.profile?.phone && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <Phone size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Phone</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEmployee.profile.phone}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Organization</Text>
                    
                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Briefcase size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Role</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEmployee.role}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Building2 size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Department</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {getDepartmentName(selectedEmployee.department_code)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <MapPin size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Facility</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {getFacilityName(selectedEmployee.facility_id)}
                        </Text>
                      </View>
                    </View>

                    {selectedEmployee.hire_date && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <Calendar size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Hire Date</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                      Reporting Structure
                    </Text>
                    
                    {selectedEmployee.manager ? (
                      <View style={[styles.managerCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <Text style={[styles.managerLabel, { color: colors.textTertiary }]}>Reports To</Text>
                        <Text style={[styles.managerName, { color: colors.text }]}>
                          {selectedEmployee.manager.first_name} {selectedEmployee.manager.last_name}
                        </Text>
                        {selectedEmployee.manager.position && (
                          <Text style={[styles.managerPosition, { color: colors.textSecondary }]}>
                            {selectedEmployee.manager.position}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.managerCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <Text style={[styles.noManager, { color: colors.textSecondary }]}>
                          No manager assigned (Top-level)
                        </Text>
                      </View>
                    )}

                    {selectedEmployee.direct_reports_count > 0 && (
                      <View style={[styles.reportsCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
                        <Users size={20} color={colors.primary} />
                        <Text style={[styles.reportsLabel, { color: colors.primary }]}>
                          {selectedEmployee.direct_reports_count} Direct Report{selectedEmployee.direct_reports_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  viewModeScroll: {
    gap: 8,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  toolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolbarButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    margin: 16,
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  clearFiltersText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  chartScrollView: {
    flex: 1,
  },
  chartContent: {
    minWidth: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  chartCanvas: {
    position: 'relative',
    padding: 20,
  },
  nodeCard: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  nodeRoleBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  nodeContent: {
    flex: 1,
    padding: 10,
    paddingTop: 8,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nodeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeAvatarText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodeName: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  nodePosition: {
    fontSize: 10,
  },
  expandButton: {
    position: 'absolute',
    bottom: -12,
    left: '50%',
    marginLeft: -18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  expandCount: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  connectorVertical: {
    position: 'absolute',
    width: 2,
  },
  connectorHorizontal: {
    position: 'absolute',
    height: 2,
  },
  groupedScrollView: {
    flex: 1,
  },
  groupedScrollContent: {
    padding: 16,
  },
  groupedContainer: {
    gap: 16,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  groupTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  groupCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  groupMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  groupMember: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '500' as const,
    maxWidth: 100,
  },
  moreMembers: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  moreMembersText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filtersModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filtersContent: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filtersFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  filtersClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  filtersClearText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  filtersApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  filtersApplyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  detailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  detailContent: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '600' as const,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  profilePosition: {
    fontSize: 15,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  detailSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  managerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  managerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  managerName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  managerPosition: {
    fontSize: 13,
    marginTop: 2,
  },
  noManager: {
    fontSize: 14,
    fontStyle: 'italic' as const,
  },
  reportsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  reportsLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
