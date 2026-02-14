import React, { useRef, useEffect } from 'react';
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

// On web, horizontal ScrollView ignores mouse wheel.
// This wrapper makes a View act as a native scrollable container.
function WebHorizontalScroll({ children, style }: { children: React.ReactNode; style?: any }) {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // In react-native-web, View refs expose the underlying DOM node
    const node = containerRef.current as unknown as HTMLElement;
    if (!node) return;
    // Make it horizontally scrollable via CSS
    node.style.overflowX = 'auto';
    node.style.overflowY = 'hidden';
    node.style.scrollbarWidth = 'none'; // Firefox
    node.style.msOverflowStyle = 'none'; // IE/Edge
    node.style.webkitOverflowScrolling = 'touch';
    // Hide scrollbar for WebKit
    const styleSheet = document.createElement('style');
    const className = 'nav-scroll-' + Math.random().toString(36).slice(2, 8);
    node.classList.add(className);
    styleSheet.textContent = `.${className}::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(styleSheet);

    // Translate vertical wheel into horizontal scroll
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    };
    node.addEventListener('wheel', handler, { passive: false });
    return () => {
      node.removeEventListener('wheel', handler);
      styleSheet.remove();
    };
  }, []);

  return (
    <View ref={containerRef} style={[{ flexDirection: 'row' }, style]}>
      {children}
    </View>
  );
}

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
  const badgeCounts = useTabBadgeCounts();

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

  const navItems = filteredModules.map((module) => {
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
  });

  const innerContent = Platform.OS === 'web' ? (
    <WebHorizontalScroll style={styles.scrollContent}>
      {navItems}
    </WebHorizontalScroll>
  ) : (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {navItems}
    </ScrollView>
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
