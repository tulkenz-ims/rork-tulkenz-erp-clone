import React from 'react';
import { Stack } from 'expo-router';
import ConsumableCharging from '@/components/ConsumableCharging';

export default function GLChargingScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'G/L Charging' }} />
      <ConsumableCharging />
    </>
  );
}
