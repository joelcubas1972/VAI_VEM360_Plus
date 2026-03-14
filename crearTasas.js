import { initializeApp } from "firebase/app";
import { doc, getFirestore, setDoc, Timestamp } from "firebase/firestore";

// Tu configuración de Firebase (la misma que usas en tu app)
const firebaseConfig = {
  apiKey: "AIzaSyBbxHKnowB5hbPn7tHtEmWWd3jhbJ5S5HY",
  authDomain: "vaivem360plus.firebaseapp.com",
  projectId: "vaivem360plus",
  storageBucket: "vaivem360plus.firebasestorage.app",
  messagingSenderId: "1099125150131",
  appId: "1:1099125150131:web:f9c0421b1e2b2bc01dac28"
};

// Inicializar
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Crear el documento de tasas
const crearTasas = async () => {
  try {
    await setDoc(doc(db, "configuracion", "tasas"), {
      tasas: {
        PYG: 1250,
        USD: 0.18
      },
      actualizado: Timestamp.now(),
      actualizadoPor: "admin"
    });
    console.log("✅ Documento de tasas creado correctamente");
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

crearTasas();