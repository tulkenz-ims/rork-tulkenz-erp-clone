import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { NAVIGATION_MODULES, type NavigationModule } from '@/constants/navigationModules';
import { useTabBadgeCounts, getBadgeSeverityColor, type TabBadgeCounts } from '@/hooks/useTabBadgeCounts';

interface ScrollableNavBarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  visibleModules: string[];
}

export default function ScrollableNavBar({
  activeRoute,
  onNavigate,
  visibleModules,
}: ScrollableNavBarProps) {
  const { colors, barColors, barText, companyColors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const wrapperRef = useRef<View>(null);
  const badgeCounts = useTabBadgeCounts();

  // On web, mouse wheel doesn't scroll horizontal ScrollView by default.
  // Capture wheel events and translate vertical delta into horizontal scroll.
  useEffect(() => {
    if (Platform.OS !== 'web' || !wrapperRef.current) return;
    const node = wrapperRef.current as unknown as HTMLElement;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        scrollOffset.current += e.deltaY;
        scrollOffset.current = Math.max(0, scrollOffset.current);
        scrollViewRef.current?.scrollTo({ x: scrollOffset.current, animated: false });
      }
    };
    node.addEventListener('wheel', handler, { passive: false });
    return () => node.removeEventListener('wheel', handler);
  }, []);

  const filteredModules = NAVIGATION_MODULES.filter(
    (m) => visibleModules.includes(m.key)
  );

  const hasCompanyColors = companyColors.length > 0;
  // When company colors are set, use contrasting text; otherwise use theme colors
  const iconColor = hasCompanyColors ? barText : colors.textSecondary;
  const activeColor = hasCompanyColors ? barText : colors.primary;
  const activeIconBg = hasCompanyColors ? (barText === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)') : colors.primary + '20';
  const indicatorColor = hasCompanyColors ? barText : colors.primary;

  const getIsActive = (module: NavigationModule) => {
    if (module.route === activeRoute) return true;
    if (module.route === '(dashboard)' && activeRoute === '(dashboard)') return true;
    return false;
  };

  const containerStyle = [
    styles.container,
    {
      borderTopColor: hasCompanyColors ? 'transparent' : colors.border,
      paddingBottom: Platform.OS === 'web' ? 8 : insets.bottom,
    },
  ];

  const innerContent = (
    <View ref={wrapperRef} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.x; }}
        scrollEventThrottle={16}
      >
        {filteredModules.map((module) => {
          const isActive = getIsActive(module);

          return (
            <NavItem
              key={module.key}
              module={module}
              isActive={isActive}
              onPress={() => onNavigate(module.route)}
              iconColor={iconColor}
              activeColor={activeColor}
              activeIconBg={activeIconBg}
              indicatorColor={indicatorColor}
              badgeCounts={badgeCounts}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  if (hasCompanyColors) {
    return (
      <LinearGradient
        colors={barColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={containerStyle}
      >
        {innerContent}
      </LinearGradient>
    );
  }

  return (
    <View style={[containerStyle, { backgroundColor: colors.surface }]}>
      {innerContent}
    </View>
  );
}

interface NavItemProps {
  module: NavigationModule;
  isActive: boolean;
  onPress: () => void;
  iconColor: string;
  activeColor: string;
  activeIconBg: string;
  indicatorColor: string;
  badgeCounts: TabBadgeCounts;
}

function NavItem({ module, isActive, onPress, iconColor, activeColor, activeIconBg, indicatorColor, badgeCounts }: NavItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ModuleIcon = module.icon;

  const getBadgeForModule = (moduleKey: string) => {
    switch (moduleKey) {
      case 'inventory':
        return badgeCounts.inventory;
      case 'cmms':
        return badgeCounts.cmms;
      case 'procurement':
        return badgeCounts.procurement;
      case 'approvals':
        return badgeCounts.approvals;
      case 'dashboard':
        return badgeCounts.dashboard;
      default:
        return null;
    }
  };

  const badge = getBadgeForModule(module.key);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.navItemContainer}
    >
      <Animated.View
        style={[
          styles.navItem,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isActive ? activeIconBg : 'transparent',
            },
          ]}
        >
          <ModuleIcon
            size={22}
            color={isActive ? activeColor : iconColor}
          />
          {badge && badge.count > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: getBadgeSeverityColor(badge.severity),
                },
              ]}
            >
              <Text style={styles.badgeText}>
                {badge.count > 99 ? '99+' : badge.count}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.label,
            {
              color: isActive ? activeColor : iconColor,
              fontWeight: isActive ? '600' : '400',
            },
          ]}
          numberOfLines={1}
        >
          {module.label}
        </Text>
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: indicatorColor }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  navItemContainer: {
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 64,
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    textAlign: 'center' as const,
    maxWidth: 70,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
  },
});
