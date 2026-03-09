import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { db } from "../../src/services/firebaseConfig";

export default function VerifyScreen() {
  const params = useLocalSearchParams();
  
  const uid = Array.isArray(params.uid) ? params.uid[0] : params.uid;
  const destino = Array.isArray(params.destino) ? params.destino[0] : params.destino;
  const metodo = Array.isArray(params.metodo) ? params.metodo[0] : params.metodo;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const generateCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert("Error", "Ingresa el código de 6 dígitos");
      return;
    }

    setLoading(true);

    try {
      // Buscar el código en Firestore usando db (NO firestore)
      const validacionesRef = collection(db, 'validaciones');
      const q = query(
        validacionesRef,
        where('uid', '==', uid),
        where('verificado', '==', false),
        where('expiracion', '>', Date.now())
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert("Error", "Código expirado. Solicita uno nuevo.");
        setLoading(false);
        return;
      }

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();

      if (data.intentos >= 3) {
        Alert.alert("Error", "Demasiados intentos. Solicita nuevo código.");
        setLoading(false);
        return;
      }

      if (data.codigo === code) {
        // Código correcto
        await updateDoc(docSnap.ref, { verificado: true });
        
        // Actualizar usuario como verificado
        await updateDoc(doc(db, 'usuarios', uid as string), {
          verified: true
        });

        Alert.alert("Éxito", "Cuenta verificada correctamente");
        router.push("/(auth)/login");
      } else {
        // Código incorrecto
        await updateDoc(docSnap.ref, { intentos: data.intentos + 1 });
        Alert.alert("Error", `Código incorrecto. Te quedan ${2 - data.intentos} intentos.`);
        setCode("");
      }
    } catch (error: any) {
      console.error("Error en verificación:", error);
      Alert.alert("Error", error.message || "Error al verificar");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);

    try {
      // Invalidar códigos anteriores
      const validacionesRef = collection(db, 'validaciones');
      const q = query(
        validacionesRef,
        where('uid', '==', uid),
        where('verificado', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      const batchPromises = snapshot.docs.map(docSnap => 
        updateDoc(docSnap.ref, { expiracion: Date.now() - 1 })
      );
      
      await Promise.all(batchPromises);

      const nuevoCodigo = generateCode();

      // Guardar nuevo código
      await addDoc(collection(db, 'validaciones'), {
        destino,
        metodo,
        codigo: nuevoCodigo,
        intentos: 0,
        expiracion: Date.now() + 600000,
        verificado: false,
        uid,
        fechaCreacion: Date.now()
      });

      console.log(`📧 Nuevo código ${nuevoCodigo} enviado a ${destino}`);
      
      setTimeLeft(600);
      setCode("");
      
      Alert.alert("Enviado", "Se ha enviado un nuevo código (revisa la terminal)");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verifica tu cuenta</Text>
      
      <Text style={styles.subtitle}>
        Hemos enviado un código a:
      </Text>
      <Text style={styles.destino}>{destino}</Text>

      <TextInput
        style={styles.input}
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        editable={!loading}
      />

      <Text style={styles.timer}>
        Tiempo restante: {formatTime(timeLeft)}
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verificar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={timeLeft > 0 || loading}
      >
        <Text style={[
          styles.resend,
          (timeLeft > 0 || loading) && styles.resendDisabled
        ]}>
          {timeLeft > 0 ? `Reenviar en ${formatTime(timeLeft)}` : "Reenviar código"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666"
  },
  destino: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#007AFF",
    marginVertical: 20
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  timer: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15
  },
  buttonDisabled: {
    backgroundColor: "#99c9ff"
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
  resend: {
    textAlign: "center",
    color: "#007AFF",
    fontSize: 16
  },
  resendDisabled: {
    color: "#999"
  }
});