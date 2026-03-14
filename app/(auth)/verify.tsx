import { router, useLocalSearchParams } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import * as emailjs from "@emailjs/browser";
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { auth, db, storage } from "../../src/services/firebaseConfig";
export default function VerifyScreen() {
  console.log("🔵 VERIFY SCREEN - Montado");

  const params = useLocalSearchParams();
  console.log("📨 Parámetros recibidos:", params);

  const email = params.email as string;
  const pendingId = params.pendingId as string;
  const rol = params.rol as string;

  console.log("📧 Email:", email);
  console.log("🆔 pendingId:", pendingId);
  console.log("👤 Rol:", rol);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    console.log("⏱️ Iniciando timer de 10 minutos");
    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? 0 : prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const sendCodeViaEmail = async (email: string, codigo: string) => {
    console.log(`📧 Reenviando código ${codigo} a ${email}`);
    try {
      await emailjs.send(
        "service_9qssrgi",
        "template_t7q8lap",
        {
          to_email: email,
          passcode: codigo,
          from_name: "Vai_vem360+"
        },
        "JqtizXiteqfzbnKAb"
      )
      console.log("✅ Email reenviado correctamente");
      return true
    } catch (error) {
      console.log("❌ Error reenviando email:", error);
      Alert.alert("Error", "No se pudo enviar el email")
      return false
    }
  }
  const subirFotoAStorage = async (base64: string, uid: string): Promise<string | null> => {
    try {
      console.log("📤 Subiendo foto a Storage...");
      const fileName = `conductores/${uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      await uploadString(storageRef, base64, 'base64', {
        contentType: 'image/jpeg'
      });

      const url = await getDownloadURL(storageRef);
      console.log("✅ Foto subida, URL:", url);
      return url;
    } catch (error) {
      console.log("❌ Error subiendo foto:", error);
      return null;
    }
  };
  const handleVerify = useCallback(async () => {
    console.log("🔍 handleVerify iniciado");
    console.log("  code ingresado:", code);
    console.log("  timeLeft:", timeLeft);
    console.log("  loading:", loading);
    console.log("  verificationSuccess:", verificationSuccess);

    if (loading || verificationSuccess) {
      console.log("⏳ Ya está procesando o ya verificó");
      return;
    }

    if (timeLeft === 0) {
      console.log("⏰ Código expirado");
      Alert.alert("Código expirado", "Solicita uno nuevo");
      return;
    }

    if (code.length !== 6) {
      console.log("❌ Código incompleto:", code.length, "dígitos");
      Alert.alert("Error", "Ingresa el código de 6 dígitos");
      return;
    }

    setLoading(true);
    console.log("🔄 Buscando validación en Firestore...");

    try {
      // Buscar la validación por pendingId
      console.log("🔍 Query a validaciones con pendingId:", pendingId);
      const q = query(
        collection(db, "validaciones"),
        where("pendingId", "==", pendingId),
        where("verificado", "==", false),
        where("expiracion", ">", Date.now())
      )

      const snapshot = await getDocs(q)
      console.log("📄 Resultados de query:", snapshot.size, "documentos");

      if (snapshot.empty) {
        console.log("❌ No se encontró validación o expiró");
        Alert.alert("Código expirado")
        setLoading(false)
        return
      }

      const docSnap = snapshot.docs[0]
      const data = docSnap.data()
      console.log("📄 Datos de validación encontrados:");
      console.log("  - email:", data.email);
      console.log("  - rol:", data.rol);
      console.log("  - código guardado:", data.codigo);
      console.log("  - intentos:", data.intentos || 0);
      console.log("  - expiración:", new Date(data.expiracion).toLocaleString());

      if ((data.intentos || 0) >= 5) {
        console.log("❌ Demasiados intentos (5/5)");
        Alert.alert("Demasiados intentos", "Solicita un nuevo código")
        setLoading(false)
        return
      }

      console.log("🔐 Comparando códigos:");
      console.log("  - Ingresado:", code);
      console.log("  - Guardado:", data.codigo);

      if (data.codigo === code) {
        console.log("✅ CÓDIGO CORRECTO");

        // PASO 1: Crear usuario en AUTHENTICATION
        console.log("🔐 Creando usuario en Firebase Auth con email:", data.email);
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
        const uid = userCredential.user.uid;
        console.log("✅ Usuario creado en Auth con UID:", uid);
        console.log("📧 emailVerified:", userCredential.user.emailVerified);

        // PASO 2: Guardar en FIRESTORE según el rol
        const collectionName = data.rol === "conductor" ? "conductores" : "usuarios";
        console.log("📁 Guardando en colección:", collectionName);

        // Quitar password de los datos
        const { password, fotoBase64, ...userData } = data;
        let fotoUrl = null;
        if (data.rol === "conductor" && data.fotoBase64) {
          fotoUrl = await subirFotoAStorage(data.fotoBase64, uid);
        }
        const datosFirestore: any = {
          ...userData,
          uid,
          verified: true,
          emailVerified: true,
          fechaRegistro: new Date(),
          fechaVerificacion: new Date().toISOString()
        };
        if (fotoUrl) {
          datosFirestore.fotoPerfil = fotoUrl;
        }
        await setDoc(doc(db, collectionName, uid), datosFirestore);
        console.log("✅ Datos guardados en Firestore");

        // PASO 3: Marcar validación como verificada
        console.log("📝 Marcando validación como verificada");
        await setDoc(docSnap.ref, {
          verificado: true,
          uidCreado: uid
        }, { merge: true });
        console.log("✅ Validación actualizada");

        setVerificationSuccess(true);

        console.log("🎉 VERIFICACIÓN EXITOSA - Mostrando alerta");
        Alert.alert(
          "✅ Verificación exitosa",
          "Tu cuenta ha sido creada correctamente",
          [
            {
              text: "OK",
              onPress: () => {
                console.log("👆 Usuario presionó OK - Volviendo a login");

                // Reemplaza toda la pila con login
                router.replace("/(auth)/login");
              }
            }
          ]
        );

      } else {
        console.log("❌ CÓDIGO INCORRECTO");
        // Incrementar intentos
        const nuevosIntentos = (data.intentos || 0) + 1;
        console.log("  Intentos actualizados:", nuevosIntentos);

        await setDoc(docSnap.ref, {
          intentos: nuevosIntentos
        }, { merge: true });

        Alert.alert("❌ Código incorrecto")
        setCode("")
        inputRef.current?.focus()
      }

    } catch (error: any) {
      console.log("❌ ERROR en verificación:");
      console.log("  Mensaje:", error.message);
      console.log("  Código:", error.code);
      console.log("  Stack:", error.stack);
      Alert.alert("Error", error.message || "No se pudo verificar el código")
    }

    setLoading(false)
  }, [code, timeLeft, pendingId, loading, verificationSuccess])

  const resendCode = async () => {
    console.log("🔄 ResendCode iniciado");
    if (timeLeft > 0) {
      console.log("⏳ Todavía no expiró, faltan:", timeLeft, "segundos");
      Alert.alert("Espera", "Debes esperar a que expire el código")
      return
    }

    setResending(true)

    try {
      console.log("🔍 Buscando validación para reenviar código");
      const q = query(
        collection(db, "validaciones"),
        where("pendingId", "==", pendingId),
        where("verificado", "==", false)
      )

      const snapshot = await getDocs(q)
      console.log("📄 Documentos encontrados:", snapshot.size);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const newCodigo = generateCode();
        console.log("🆕 Nuevo código generado:", newCodigo);

        await setDoc(docSnap.ref, {
          codigo: newCodigo,
          expiracion: Date.now() + 600000,
          intentos: 0
        }, { merge: true });
        console.log("✅ Documento actualizado con nuevo código");

        const sent = await sendCodeViaEmail(email, newCodigo);
        if (sent) {
          setTimeLeft(600);
          console.log("✅ Código reenviado, timer reiniciado");
          Alert.alert("Nuevo código enviado");
        }
      } else {
        console.log("❌ No se encontró validación para reenviar");
      }
    } catch (error) {
      console.log("❌ Error reenviando código:", error);
      Alert.alert("Error enviando código")
    }

    setResending(false)
  }

  useEffect(() => {
    console.log("👀 Code cambiado:", code);
    if (code.length === 6 && !verificationSuccess) {
      console.log("✅ Código completo, ejecutando handleVerify automático");
      handleVerify()
    }
  }, [code, handleVerify, verificationSuccess])

  const renderBoxes = () => {
    return [0, 1, 2, 3, 4, 5].map((_, i) => (
      <View key={i} style={styles.codeBox}>
        <Text style={styles.codeDigit}>{code[i] || ""}</Text>
      </View>
    ))
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verifica tu cuenta</Text>
      <Text style={styles.subtitle}>Código enviado a</Text>
      <Text style={styles.destino}>{email}</Text>

      <View style={styles.codeContainer}>{renderBoxes()}</View>

      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={code}
        onChangeText={(t) => {
          console.log("✏️ Código ingresado:", t);
          setCode(t.replace(/[^0-9]/g, ""));
        }}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <Text style={styles.timer}>Tiempo restante {formatTime(timeLeft)}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          console.log("🟢 Botón VERIFICAR presionado manualmente");
          handleVerify();
        }}
        disabled={loading || verificationSuccess}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={() => {
          console.log("🟢 Botón REENVIAR presionado");
          resendCode();
        }}
        disabled={resending || timeLeft > 0 || verificationSuccess}
      >
        {resending ? (
          <ActivityIndicator />
        ) : (
          <Text style={[styles.resendText, (timeLeft > 0 || verificationSuccess) && { opacity: 0.4 }]}>
            Reenviar código
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#f4f6f8"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10
  },
  subtitle: {
    textAlign: "center",
    color: "#666"
  },
  destino: {
    textAlign: "center",
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 30
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25
  },
  codeBox: {
    width: 45,
    height: 55,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center"
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: "bold"
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0
  },
  timer: {
    textAlign: "center",
    marginBottom: 20,
    color: "#444"
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
  resendButton: {
    alignItems: "center",
    padding: 10
  },
  resendText: {
    color: "#007AFF",
    fontWeight: "600"
  }
})