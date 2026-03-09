import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, firestore } from "../services/firebaseConfig";

const cities = [
  { name: "Pedro Juan Caballero", code: "+595" },
  { name: "Ponta Porã", code: "+55 67" },
];

const services = [
  "Uber",
  "Uber Mujer",
  "Mototaxi",
  "Delivery",
  "Compra y traslado",
  "Grúa",
  "Mudanza",
];

export default function RegisterScreen() {
  const [tab, setTab] = useState<"usuario" | "conductor">("usuario");
  const [city, setCity] = useState(cities[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [verificationMethod, setVerificationMethod] = useState<"email" | "sms">("email");
  const [loading, setLoading] = useState(false);

  const [dni, setDni] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [serviceList, setServiceList] = useState<string[]>([]);

  const toggleService = (s: string) => {
    setServiceList((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const generateCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const handleRegister = async () => {
    if (!email || !password || password !== password2) {
      Alert.alert("Registro", "Completa datos y contraseñas iguales");
      return;
    }
    if (phone.length < 6) {
      Alert.alert("Registro", "Teléfono demasiado corto");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      const codigo = generateCode();

      await firestore().collection('validaciones').add({
        destino: verificationMethod === 'email' ? email : phone,
        metodo: verificationMethod,
        codigo,
        intentos: 0,
        expiracion: Date.now() + 600000,
        verificado: false,
        uid,
        fechaCreacion: Date.now()
      });

      const data: any = {
        email,
        rol: tab,
        telefono: city.code + phone,
        ciudad: city.name,
        verified: false,
        verificationMethod,
        fechaRegistro: new Date().toISOString(),
      };

      if (tab === "conductor") {
        data.dni = city.name === "Pedro Juan Caballero" ? dni : undefined;
        data.cpf = city.name === "Ponta Porã" ? cpf : undefined;
        data.direccion = address;
        data.licencia = license;
        data.vehiculo = vehiclePlate;
        data.servicios = serviceList;
      }

      await firestore().collection('usuarios').doc(uid).set(data);

      Alert.alert("Código enviado", `Revisa tu ${verificationMethod === 'email' ? 'correo' : 'teléfono'}`);

      router.push({
        pathname: "/(auth)/verify",
        params: { 
          uid,
          destino: verificationMethod === 'email' ? email : city.code + phone,
          metodo: verificationMethod
        }
      });

    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <>
        <Text style={styles.title}>Registro</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "usuario" && styles.tabActive]}
            onPress={() => setTab("usuario")}
          >
            <Text>Usuario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab === "conductor" && styles.tabActive]}
            onPress={() => setTab("conductor")}
          >
            <Text>Conductor</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Método de verificación</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, verificationMethod === "email" && styles.tabActive]}
            onPress={() => setVerificationMethod("email")}
          >
            <Text>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, verificationMethod === "sms" && styles.tabActive]}
            onPress={() => setVerificationMethod("sms")}
          >
            <Text>SMS</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Ciudad</Text>
        <View style={styles.cityRow}>
          {cities.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[styles.cityButton, city.name === c.name && styles.cityActive]}
              onPress={() => {
                setCity(c);
                setPhone("");
              }}
            >
              <Text>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Teléfono</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phoneCode}>
            <Text>{city.code}</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="Número"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? "eye-off" : "eye"} size={22} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry={!showPass}
          value={password2}
          onChangeText={setPassword2}
        />

        {tab === "conductor" && (
          <>
            <Text style={styles.label}>
              {city.name === "Pedro Juan Caballero" ? "Cédula" : "CPF"}
            </Text>
            <TextInput
              style={styles.input}
              value={city.name === "Pedro Juan Caballero" ? dni : cpf}
              onChangeText={city.name === "Pedro Juan Caballero" ? setDni : setCpf}
            />

            <Text style={styles.label}>Dirección</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} />

            <Text style={styles.label}>Licencia</Text>
            <TextInput style={styles.input} value={license} onChangeText={setLicense} />

            <Text style={styles.label}>Matrícula vehículo</Text>
            <TextInput
              style={styles.input}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
            />

            <Text style={styles.label}>Servicios</Text>
            <View style={styles.servicesGrid}>
              {services.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.serviceItem,
                    serviceList.includes(s) && styles.serviceActive,
                  ]}
                  onPress={() => toggleService(s)}
                >
                  <Text>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Registrando..." : "Registrar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  tabs: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  tab: { padding: 10, marginHorizontal: 5, borderRadius: 8, backgroundColor: "#eee" },
  tabActive: { backgroundColor: "#007AFF" },
  label: { marginTop: 10, fontWeight: "600" },
  input: { backgroundColor: "#fff", padding: 10, borderRadius: 8, marginTop: 5 },
  cityRow: { flexDirection: "row", marginTop: 5 },
  cityButton: { padding: 10, backgroundColor: "#eee", marginRight: 5, borderRadius: 8 },
  cityActive: { backgroundColor: "#007AFF" },
  phoneRow: { flexDirection: "row", marginTop: 5 },
  phoneCode: { padding: 10, backgroundColor: "#ddd", borderRadius: 8 },
  phoneInput: { flex: 1, backgroundColor: "#fff", padding: 10, borderRadius: 8 },
  passwordRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 10, borderRadius: 8 },
  passwordInput: { flex: 1 },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap" },
  serviceItem: { padding: 8, backgroundColor: "#eee", margin: 4, borderRadius: 8 },
  serviceActive: { backgroundColor: "#4CAF50" },
  button: { marginTop: 20, backgroundColor: "#007AFF", padding: 15, borderRadius: 8 },
  buttonText: { color: "#fff", textAlign: "center" },
  link: { marginTop: 15, textAlign: "center", color: "#007AFF" },
});