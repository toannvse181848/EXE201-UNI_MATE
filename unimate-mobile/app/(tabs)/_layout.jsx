import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';

function TabIcon({ name, focused }) {
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

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Đối với Android có phím điều hướng hệ thống 3 nút hoặc cử chỉ vuốt,
  // insets.bottom phản ánh chính xác chiều cao của thanh điều hướng (thường là 48dp).
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
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Ghép đôi',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="flame-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Địa điểm & Ưu đãi',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="storefront-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="chatbubbles-outline" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" focused={focused} />
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
    fontSize: 10.5,
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
