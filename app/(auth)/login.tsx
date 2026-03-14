import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../src/services/firebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Completa email y contraseña");
      return;
    }

    setLoading(true);
    try {
      // ✅ PASO 1: Autenticar (esto funciona)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      console.log("✅ Usuario autenticado:", uid);

      // ✅ PASO 2: Intentar obtener rol de Firestore (con manejo de errores)
      try {
        console.log("🔍 Buscando usuario en Firestore con UID:", uid);

        // 1️⃣ Primero buscar en CONDUCTORES
        const conductorSnap = await getDoc(doc(db, "conductores", uid));
        
        if (conductorSnap.exists()) {
          // ✅ Es CONDUCTOR
          const conductorData = conductorSnap.data();
          console.log("👤 Es CONDUCTOR, verified:", conductorData?.verified);
          
          if (!conductorData?.verified) {
            Alert.alert("Verificación", "Debes verificar tu cuenta antes de entrar. Revisa tu email.");
            setLoading(false);
            return;
          }

          console.log("🚗 Redirigiendo a dashboard de conductor");
          router.replace("/conductor/dashboard");
          setLoading(false);
          return;
        }

        // 2️⃣ Si no es conductor, buscar en USUARIOS
        const userSnap = await getDoc(doc(db, "usuarios", uid));
        
        if (userSnap.exists()) {
          // ✅ Es USUARIO
          const userData = userSnap.data();
          console.log("👤 Es USUARIO, verified:", userData?.verified);
          
          if (!userData?.verified) {
            Alert.alert("Verificación", "Debes verificar tu cuenta antes de entrar. Revisa tu email.");
            setLoading(false);
            return;
          }

          console.log("🗺️ Redirigiendo a servicios");
          router.replace("/(tabs)/servicios");
          setLoading(false);
          return;
        }

        // 3️⃣ Si no está en ninguna colección
        console.log("❌ Usuario no encontrado en Firestore");
        Alert.alert("Error", "Usuario no encontrado en la base de datos");
        
      } catch (firestoreError: any) {
        // 🔥 SI FIRESTORE FALLA (offline), ASUMIMOS QUE ES USUARIO NORMAL
        console.log("⚠️ Firestore offline, redirigiendo a servicios por defecto");
        router.replace("/(tabs)/servicios");
      }
      
    } catch (error: any) {
      console.log("❌ Error en login:", error.message);
      Alert.alert("Error", error.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>VAI-VEM360+</Text>
        <Text style={styles.subtitle}>Iniciar sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? "eye-off" : "eye"} size={22} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  card: { margin: 20, padding: 20, borderRadius: 12, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { textAlign: "center", marginBottom: 20 },
  input: { backgroundColor: "#eee", padding: 10, borderRadius: 8, marginBottom: 10 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
  },
  passwordInput: { flex: 1 },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: { color: "#fff", textAlign: "center" },
  link: { marginTop: 15, textAlign: "center", color: "#007AFF" },
});