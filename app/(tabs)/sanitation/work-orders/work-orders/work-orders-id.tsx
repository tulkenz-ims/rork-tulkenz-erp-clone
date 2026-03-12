import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSupabaseSanitationWorkOrders } from '@/hooks/useSupabaseSanitationWorkOrders';
import SanitationWorkOrderDetail from '@/components/SanitationWorkOrderDetail';
import { AlertTriangle } from 'lucide-react-native';

const HUD = {
  bg: '#020912',
  bgCard: '#050f1e',
  cyan: '#00e5ff',
  text: '#e0f4ff',
  textSec: '#7aa8c8',
  textTertiary: '#3a6080',
  error: '#ff2d55',
  borderBright: '#1a4060',
};

export default function SanitationWorkOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { useSingleWorkOrder } = useSupabaseSanitationWorkOrders();

  const { data: workOrder, isLoading, error } = useSingleWorkOrder(id || null);

  const handleClose = () => {
    // SanitationWorkOrderDetail handles timer guard internally.
    // This only fires when it's safe to leave.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/sanitation');
    }
  };

  if (isLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={HUD.cyan} />
          <Text style={[s.loadingTxt, { color: HUD.textSec }]}>Loading task...</Text>
        </View>
      </View>
    );
  }

  if (error || !workOrder) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.center}>
          <View style={[s.errorIcon, { backgroundColor: HUD.error + '15' }]}>
            <AlertTriangle size={44} color={HUD.error} />
          </View>
          <Text style={[s.errorTitle, { color: HUD.text }]}>Task Not Found</Text>
          <Text style={[s.errorSub, { color: HUD.textSec }]}>
            This sanitation task does not exist or may have been removed.
          </Text>
          <Text style={[s.errorId, { color: HUD.textTertiary }]}>ID: {id}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SanitationWorkOrderDetail
        workOrder={workOrder}
        onClose={handleClose}
        canEdit={true}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingTxt: { fontSize: 15, marginTop: 8 },
  errorIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  errorTitle: { fontSize: 20, fontWeight: '700' },
  errorSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  errorId: { fontSize: 11, marginTop: 6 },
});
