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

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── Web horizontal scroll wrapper ─────────────────────────────
function WebHorizontalScroll({ children, style }: { children: React.ReactNode; style?: any }) {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement;
    if (!node) return;
    node.style.overflowX = 'auto';
    node.style.overflowY = 'hidden';
    node.style.scrollbarWidth = 'none';
    node.style.msOverflowStyle = 'none';
    node.style.webkitOverflowScrolling = 'touch';
    const styleSheet = document.createElement('style');
    const className = 'nav-scroll-' + Math.random().toString(36).slice(2, 8);
    node.classList.add(className);
    styleSheet.textContent = `.${className}::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(styleSheet);
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
  const { colors, barColors, barText, companyColors, isLight, isHUD } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const badgeCounts = useTabBadgeCounts();

  const filteredModules = NAVIGATION_MODULES.filter(m => visibleModules.includes(m.key));
  const hasCompanyColors = companyColors.length > 0;

  // ── Theme-aware nav bar colors ────────────────────────────────
  // When company colors are set, they override everything.
  // Otherwise, derive from the active theme.
  const activeColor = hasCompanyColors
    ? barText
    : colors.hudPrimary;

  const inactiveColor = hasCompanyColors
    ? barText + 'AA'
    : isLight
      ? colors.textSecondary
      : colors.textTertiary;

  const indicatorColor = hasCompanyColors
    ? barText
    : colors.hudPrimary;

  // Border top: HUD gets bright cyan border, light themes get a subtle separator
  const borderTopColor = hasCompanyColors
    ? 'transparent'
    : isHUD
      ? colors.hudBorderBright
      : colors.border;

  // Background: HUD stays dark, light themes use surface white/near-white
  const bgColor = hasCompanyColors
    ? undefined
    : isHUD
      ? colors.hudSurface
      : colors.surface;

  const getIsActive = (module: NavigationModule) => {
    if (module.route === activeRoute) return true;
    if (module.route === '(dashboard)' && activeRoute === '(dashboard)') return true;
    return false;
  };

  const navItems = filteredModules.map(module => (
    <NavItem
      key={module.key}
      module={module}
      isActive={getIsActive(module)}
      onPress={() => onNavigate(module.route)}
      activeColor={activeColor}
      inactiveColor={inactiveColor}
      indicatorColor={indicatorColor}
      isLight={isLight}
      badgeCounts={badgeCounts}
    />
  ));

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

  const containerStyle = [
    styles.container,
    {
      borderTopColor,
      borderTopWidth: 1,
      paddingBottom: Platform.OS === 'web' ? 8 : insets.bottom,
    },
  ];

  // Company colors override: use gradient
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
    <View style={[containerStyle, { backgroundColor: bgColor }]}>
      {innerContent}
    </View>
  );
}

// ── Nav item ───────────────────────────────────────────────────
interface NavItemProps {
  module: NavigationModule;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  indicatorColor: string;
  isLight: boolean;
  badgeCounts: TabBadgeCounts;
}

function NavItem({
  module, isActive, onPress,
  activeColor, inactiveColor, indicatorColor, isLight, badgeCounts,
}: NavItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ModuleIcon = module.icon;

  const getBadgeForModule = (moduleKey: string) => {
    switch (moduleKey) {
      case 'inventory':   return badgeCounts.inventory;
      case 'cmms':        return badgeCounts.cmms;
      case 'procurement': return badgeCounts.procurement;
      case 'approvals':   return badgeCounts.approvals;
      case 'dashboard':   return badgeCounts.dashboard;
      default:            return null;
    }
  };

  const badge = getBadgeForModule(module.key);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.navItemContainer}
    >
      <Animated.View style={[styles.navItem, { transform: [{ scale: scaleAnim }] }]}>

        {/* Top accent line — active indicator */}
        {isActive && (
          <View style={[styles.topAccentLine, { backgroundColor: indicatorColor }]} />
        )}

        {/* Icon area */}
        <View style={styles.iconArea}>
          <ModuleIcon
            size={20}
            color={isActive ? activeColor : inactiveColor}
          />
          {/* Badge */}
          {badge && badge.count > 0 && (
            <View style={[styles.badge, { backgroundColor: getBadgeSeverityColor(badge.severity) }]}>
              <Text style={styles.badgeText}>
                {badge.count > 99 ? '99+' : badge.count}
              </Text>
            </View>
          )}
        </View>

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: isActive ? activeColor : inactiveColor,
              fontWeight: isActive ? '700' : '400',
              fontFamily: MONO,
            },
          ]}
          numberOfLines={1}
        >
          {module.label.toUpperCase()}
        </Text>

        {/* Corner brackets on active item */}
        {isActive && (
          <>
            <View style={[styles.bracketTL, { borderColor: indicatorColor }]} />
            <View style={[styles.bracketTR, { borderColor: indicatorColor }]} />
          </>
        )}

      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 0,
  },
  navItemContainer: {
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
    position: 'relative',
  },
  topAccentLine: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 2,
  },
  iconArea: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    position: 'relative',
  },
  label: {
    fontSize: 8,
    textAlign: 'center',
    maxWidth: 68,
    letterSpacing: 0.8,
  },
  bracketTL: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 6,
    height: 6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  bracketTR: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
});
