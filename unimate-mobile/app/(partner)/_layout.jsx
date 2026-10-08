import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';

function PartnerTabIcon({ name, focused }) {
  return (
    <View style={[styles.tabIconWrapper, focused && styles.activeTab]}>
      <Ionicons
        name={focused ? name.replace('-outline', '') : name}
        size={20}
        color={focused ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
}

export default function PartnerLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const bottomPadding = bottomInset > 0 ? bottomInset + 2 : (Platform.OS === 'ios' ? 22 : 10);
  const tabHeight = 62 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: tabHeight,
          paddingBottom: bottomPadding,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Quản lý',
          tabBarIcon: ({ focused }) => (
            <PartnerTabIcon name="business-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Đối soát QR',
          tabBarIcon: ({ focused }) => (
            <PartnerTabIcon name="qr-code-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ đối tác',
          tabBarIcon: ({ focused }) => (
            <PartnerTabIcon name="person-circle-outline" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  tabIconWrapper: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary + '18',
  },
});
