import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="match" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="select-place" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="chat-room" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="place-detail" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="voucher-detail" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
