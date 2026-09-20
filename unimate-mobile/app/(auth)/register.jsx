import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';

const options = [
  {
    key: 'student',
    icon: 'school-outline',
    title: 'Sinh viên',
    desc: 'Tìm bạn học, cơ hội thực tập và mở rộng mạng lưới',
    gradient: [COLORS.primary, COLORS.primaryDark],
    route: '/(auth)/register-student',
  },
  {
    key: 'partner',
    icon: 'briefcase-outline',
    title: 'Đối tác / Doanh nghiệp',
    desc: 'Tiếp cận sinh viên tài năng và quảng bá cơ hội',
    gradient: [COLORS.secondary, COLORS.secondaryDark],
    route: '/(auth)/register-partner',
  },
];

export default function Register() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Bạn là ai?</Text>
          <Text style={styles.subtitle}>
            Chọn loại tài khoản phù hợp với bạn
          </Text>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => router.push(opt.route)}
              activeOpacity={0.85}
              style={styles.optionWrapper}
            >
              <LinearGradient
                colors={opt.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.optionCard}
              >
                <View style={styles.optionIconBg}>
                  <Ionicons name={opt.icon} size={32} color={COLORS.white} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{opt.title}</Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.white + 'AA'} />
              </LinearGradient>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Đã có tài khoản?{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  backBtn: {
    padding: 16,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 40,
  },
  optionWrapper: { marginBottom: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  optionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    color: COLORS.white + 'CC',
    fontSize: 13,
    lineHeight: 18,
  },
  loginLink: { alignItems: 'center', marginTop: 32 },
  loginLinkText: { color: COLORS.textSecondary, fontSize: 14 },
});
