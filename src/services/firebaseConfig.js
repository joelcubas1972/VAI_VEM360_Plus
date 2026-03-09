import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAl7WlJ6qpBxxkv6LMb-WTl0AlntVNiP9w",
  authDomain: "vaivem360plus.firebaseapp.com",
  projectId: "vaivem360plus",
  storageBucket: "vaivem360plus.firebasestorage.app",
  messagingSenderId: "174063189211",
  appId: "1:174063189211:web:d597fbd029da65229a60fe"
};

const app = initializeApp(firebaseConfig);

// Auth con persistencia (AsyncStorage)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;