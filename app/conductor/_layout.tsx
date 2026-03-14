import { Stack } from 'expo-router';
import React from 'react';

export default function ConductorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}