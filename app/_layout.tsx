import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth'; // ← Importá User
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../src/services/firebaseConfig';

export default function RootLayout() {
  // 👇 Tipamos el estado: puede ser User o null
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    };
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // ✅ Ahora TypeScript sabe que puede recibir User o null
      setLoading(false);
    });

    checkFirstTime();
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {showWelcome ? (
        <Stack.Screen name="(auth)/welcome" />
      ) : !user ? (
        <Stack.Screen name="(auth)/login" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}