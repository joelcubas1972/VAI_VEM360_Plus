import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../src/services/firebaseConfig';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>('welcome');

  const router = useRouter();
  const segments = useSegments();

  // Controla que la navegación solo ocurra UNA VEZ
  const navegacionCompletada = useRef(false);
  const authProcesado = useRef(false);

  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      setInitialRoute(!hasSeenWelcome ? 'welcome' : 'login');
    };

    checkFirstTime();
  }, []);

  useEffect(() => {
    // Evitar múltiples suscripciones
    if (authProcesado.current) return;
    authProcesado.current = true;

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

  // useEffect SEPARADO para la navegación, con control de una sola vez
  useEffect(() => {
    // No hacer nada si:
    // - Todavía está cargando
    // - Ya navegamos antes
    // - No hay router listo
    if (loading || navegacionCompletada.current || !router) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      // Usuario NO autenticado
      if (!inAuthGroup) {
        console.log('🚶 No usuario → redirect a', initialRoute);
        navegacionCompletada.current = true;

        // Pequeño timeout para asegurar que el navigator está listo
        setTimeout(() => {
          // Usar 'as any' para evitar error de TypeScript con rutas dinámicas
          router.replace(`/(auth)/${initialRoute}` as any);
        }, 100);
      }
    } else {
      // Usuario SÍ autenticado
      if (userRole === 'conductor') {
        console.log('🚗 Es conductor → dashboard');
        navegacionCompletada.current = true;
        setTimeout(() => {
          router.replace('/conductor/dashboard' as any);
        }, 100);
      } else if (userRole === 'usuario') {
        console.log('👤 Es usuario → servicios (para elegir servicio)');
        navegacionCompletada.current = true;
        setTimeout(() => {
          router.replace('/(tabs)/servicios' as any); 
        }, 100);
      }
    }
  }, [user, userRole, loading, initialRoute, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="conductor" />
    </Stack>
  );
}