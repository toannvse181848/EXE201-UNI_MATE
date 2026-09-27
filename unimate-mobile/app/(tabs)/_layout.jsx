import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';

function TabIcon({ name, focused }) {
  return (
    <View style={focused ? styles.activeTab : null}>
      <Ionicons
        name={focused ? name.replace('-outline', '') : name}
        size={22}
        color={focused ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Đối với Android có phím điều hướng hệ thống 3 nút (Back, Home, Recents) hoặc cử chỉ vuốt,
  // insets.bottom sẽ phản ánh chính xác chiều cao của thanh điều hướng (thường là 48dp).
  // Đảm bảo padding dưới luôn đẩy icon và label lên trên thanh điều hướng, không bị cấn phím.
  const bottomInset = insets.bottom;
  const bottomPadding = bottomInset > 0 ? bottomInset + 4 : (Platform.OS === 'ios' ? 24 : 10);
  const tabHeight = 60 + (bottomInset > 0 ? bottomInset : (Platform.OS === 'ios' ? 24 : 10));

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
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  activeTab: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 2,
  },
});
