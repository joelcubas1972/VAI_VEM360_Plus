import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '../src/services/firebaseConfig';

// Evita que la splash screen se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Cargar fuentes (OBLIGATORIO para íconos)
  const [fontsLoaded] = useFonts({
    // Las fuentes de @expo/vector-icons se cargan automáticamente
  });

  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>('welcome');
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  const router = useRouter();
  const segments = useSegments();
  const navigationStarted = useRef(false);

  // Marcar navegación lista después del primer render
  useEffect(() => {
    setIsNavigationReady(true);
  }, []);

  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      setInitialRoute(!hasSeenWelcome ? 'welcome' : 'login');
    };
    checkFirstTime();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth cambió:', firebaseUser?.email);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const conductorDoc = await getDoc(doc(db, 'conductores', firebaseUser.uid));
          if (conductorDoc.exists()) {
            console.log('👤 Es CONDUCTOR');
            setUserRole('conductor');
          } else {
            const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
            if (userDoc.exists()) {
              console.log('👤 Es USUARIO');
              setUserRole('usuario');
            } else {
              console.log('👤 Sin rol');
              setUserRole(null);
            }
          }
        } catch (error) {
          console.error('Error:', error);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // EFECTO ÚNICO DE NAVEGACIÓN - SOLO CUANDO TODO ESTÉ LISTO
  useEffect(() => {
    if (!fontsLoaded || loading || !isNavigationReady || navigationStarted.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (navigationStarted.current) return;
      
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!user) {
        if (!inAuthGroup) {
          console.log('🚶 No usuario →', initialRoute);
          navigationStarted.current = true;
          router.replace(`/(auth)/${initialRoute}` as any);
        }
      } else if (userRole === 'conductor') {
        console.log('🚗 Conductor → dashboard');
        navigationStarted.current = true;
        router.replace('/conductor/dashboard' as any);
      } else if (userRole === 'usuario') {
        console.log('👤 Usuario → servicios');
        navigationStarted.current = true;
        router.replace('/(tabs)/servicios' as any);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fontsLoaded, loading, isNavigationReady, user, userRole, initialRoute]);

  // Ocultar splash screen cuando todo esté listo
  useEffect(() => {
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  // Mostrar splash screen mientras carga
  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="conductor" />
    </Stack>
  );
}