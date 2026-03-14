import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBVSQU5WMSY82SDByHX1nyUCQdaCDiv1Wk",
  authDomain: "vai-vem360plus.firebaseapp.com",
  projectId: "vai-vem360plus",
  storageBucket: "vai-vem360plus.firebasestorage.app",
  messagingSenderId: "908589959237",
  appId: "1:908589959237:web:7b89f4a5d81281ad3cbb2c"
};

// Inicializar app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

console.log("Firebase App Options:", app.options);

// ✅ Auth
export const auth = getAuth(app);

// ✅ Firestore con configuración específica para Expo
export const db = getFirestore(app);

// ✅ Forzar conexión con timeout (esto puede ayudar)
if (__DEV__) {
  // En desarrollo, podemos intentar conectar con emulador o configuraciones especiales
  console.log("📱 Modo desarrollo - configurando Firestore");
}

export const storage = getStorage(app);
export const functions = getFunctions(app);