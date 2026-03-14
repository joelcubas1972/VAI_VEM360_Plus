// src/hooks/useProtectedRoute.ts
import { useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '../services/firebaseConfig';

export function useProtectedRoute(allowedRole: 'usuario' | 'conductor' | 'any' = 'any') {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'usuario' | 'conductor' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setIsLoading(false);
        if (allowedRole !== 'any') {
          router.replace('/(auth)/login');
        }
        return;
      }

      try {
        // Verificar conductor primero
        const conductorRef = doc(db, 'conductores', firebaseUser.uid);
        const conductorSnap = await getDoc(conductorRef);
        
        if (conductorSnap.exists()) {
          setUserRole('conductor');
          if (allowedRole === 'usuario') {
            router.replace('/(tabs)');
            return;
          }
        } else {
          const userRef = doc(db, 'usuarios', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setUserRole('usuario');
            if (allowedRole === 'conductor') {
              router.replace('/conductor/dashboard');
              return;
            }
          } else {
            setUserRole(null);
            router.replace('/(auth)/register');
            return;
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, [allowedRole]);

  return { isLoading, userRole, user };
}