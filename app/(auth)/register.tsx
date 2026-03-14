import * as emailjs from "@emailjs/browser";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  Image, // 👈 ESTE IMPORT FALTABA
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from "../../src/services/firebaseConfig";
const cities = [
  { name: "Pedro Juan Caballero", code: "+595", country: "PY" },
  { name: "Ponta Porã", code: "+55", country: "BR" }
];

const services = [
  { name: "Uber", icon: "car" },
  { name: "Uber Mujer", icon: "human-female" },
  { name: "Mototaxi", icon: "motorbike" },
  { name: "Delivery", icon: "package-variant" },
  { name: "Grúa", icon: "tow-truck" },
  { name: "Mudanza", icon: "truck" }
];
// Métodos de pago/cobro
const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', icon: '💰' },
  { id: 'pix_br', label: 'Pix Brasilero', icon: '🇧🇷' },
  { id: 'tarjeta_credito_br', label: 'Tarjeta crédito brasilera', icon: '💳' },
  { id: 'tarjeta_debito_br', label: 'Tarjeta débito brasilera', icon: '💳' },
  { id: 'tarjeta_credito_py', label: 'Tarjeta crédito paraguaya', icon: '🇵🇾' },
  { id: 'tarjeta_debito_py', label: 'Tarjeta débito paraguaya', icon: '🇵🇾' },
  { id: 'transferencia_py', label: 'Transferencia bancaria paraguaya', icon: '🏦' },
  { id: 'giros_tigo', label: 'Giros (Tigo Money)', icon: '📱' },
];
export default function RegisterScreen() {
  console.log("📝 REGISTER SCREEN - Montado");

  const [tab, setTab] = useState<"usuario" | "conductor">("usuario");
  const [city, setCity] = useState(cities[0]);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [dni, setDni] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState("");
  const [vehicleMarca, setVehicleMarca] = useState("");
  const [vehicleModelo, setVehicleModelo] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev => {
      if (prev.includes(methodId)) {
        return prev.filter(id => id !== methodId); // Quitar si ya está
      } else {
        return [...prev, methodId]; // Agregar si no está
      }
    });
  };
  const sendCodeViaEmail = async (email: string, codigo: string) => {
    console.log(`📧 Enviando código ${codigo} a ${email}`);
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
      );
      console.log("✅ Email enviado correctamente");
      return true;
    } catch (error) {
      console.log("❌ Error enviando email:", error);
      Alert.alert("Error enviando email");
      return false;
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso necesario", "Se necesita permiso para usar la cámara");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      console.log("📸 Foto tomada con cámara");
      setPhoto(result.assets[0].base64);
    } else {
      Alert.alert("Error", "No se pudo obtener la foto");
    }
  };

  const seleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso necesario", "Se necesita permiso para acceder a la galería");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      console.log("🖼️ Foto seleccionada de galería");
      setPhoto(result.assets[0].base64);
    } else {
      Alert.alert("Error", "No se pudo obtener la foto");
    }
  };

  const handleRegister = async () => {
    console.log("=== INICIO REGISTRO ===");
    console.log("📋 Datos del formulario:");
    console.log("  Tab seleccionado:", tab);
    console.log("  Email:", email);
    console.log("  Nombre:", nombre);
    console.log("  Apellido:", apellido);
    console.log("  Teléfono:", phone);
    console.log("  Ciudad:", city.name);

    if (tab === "conductor") {
      console.log("  Servicio seleccionado:", selectedService);
      console.log("  DNI:", dni);
      console.log("  Vehículo:", vehicleMarca, vehicleModelo, vehicleColor, vehiclePlate);
    }

    console.log("  Términos aceptados:", termsAccepted);

    if (!email || !password || password !== password2) {
      console.log("❌ Validación falló: Email vacío o contraseñas no coinciden");
      Alert.alert("Error", "Revisa email o contraseñas");
      return;
    }

    if (tab === "conductor" && !selectedService) {
      console.log("❌ Conductor: No seleccionó servicio");
      Alert.alert("Error", "Selecciona un servicio");
      return;
    }

    if (!termsAccepted) {
      console.log("❌ No aceptó términos");
      Alert.alert("Error", "Debes aceptar los términos");
      return;
    }

    setLoading(true);

    try {
      // 🔥 PASO 1: Generar código y guardar SOLO en validaciones
      const codigo = generateCode();
      const pendingId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log("🔑 Código generado:", codigo);
      console.log("🆔 pendingId:", pendingId);

      const cleanPhone = phone.replace(/\D/g, "");
      const phoneFull = `${city.code}${cleanPhone}`;
      console.log("📞 Teléfono completo:", phoneFull);

      // Guardar TODOS los datos en validaciones
      const datosValidacion = {
        pendingId,
        email,
        password, // ⚠️ Temporal, se borrará después
        nombre,
        apellido,
        telefono: phoneFull,
        rol: tab,
        ciudad: city.name,
        ...(tab === "conductor" && {
          dni,
          direccion: address,
          licencia: license,
          servicio: selectedService,
          metodosCobro: selectedPaymentMethods,
          fotoBase64: photo,
          vehiculo: {
            marca: vehicleMarca,
            modelo: vehicleModelo,
            color: vehicleColor,
            matricula: vehiclePlate
          }
        }),
        codigo,
        verificado: false,
        intentos: 0,
        expiracion: Date.now() + 600000,
        fechaRegistro: new Date(),
        terminos: {
          aceptado: true,
          version: tab === "conductor" ? "conductor_v1.0" : "usuario_v1.0",
          fechaAceptacion: new Date()
        }
      };

      console.log("📤 Guardando en Firestore (colección 'validaciones')...");
      const docRef = await addDoc(collection(db, "validaciones"), datosValidacion);
      console.log("✅ Documento guardado con ID:", docRef.id);

      const emailSent = await sendCodeViaEmail(email, codigo);
      if (!emailSent) {
        setLoading(false);
        return;
      }

      console.log("🚀 Navegando a verify con:", { email, pendingId, rol: tab });

      // 🔥 PASO 2: Ir a verify con el email y pendingId
      router.push({
        pathname: "/(auth)/verify",
        params: {
          email,
          pendingId,
          rol: tab
        }
      });

    } catch (error: any) {
      console.log("❌ ERROR en registro:", error);
      console.log("  Mensaje:", error.message);
      console.log("  Stack:", error.stack);
      Alert.alert("Error", error.message);
    }

    setLoading(false);
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");

    if (city.country === "PY") {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
    } else {
      if (cleaned.length <= 5) return cleaned;
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Crear Cuenta</Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === "usuario" && styles.tabActive]}
              onPress={() => {
                console.log("🔘 Cambiando a tab: usuario");
                setTab("usuario");
              }}
            >
              <Text style={[styles.tabText, tab === "usuario" && styles.tabTextActive]}>
                Usuario
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, tab === "conductor" && styles.tabActive]}
              onPress={() => {
                console.log("🔘 Cambiando a tab: conductor");
                setTab("conductor");
              }}
            >
              <Text style={[styles.tabText, tab === "conductor" && styles.tabTextActive]}>
                Conductor
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Ciudad</Text>
            <View style={styles.cityRow}>
              {cities.map(c => (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.cityButton, city.name === c.name && styles.cityActive]}
                  onPress={() => {
                    console.log("🏙️ Ciudad seleccionada:", c.name);
                    setCity(c);
                  }}
                >
                  <Text style={city.name === c.name ? styles.cityTextActive : styles.cityText}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={(text) => {
                console.log("✏️ Nombre cambiado:", text);
                setNombre(text);
              }}
              placeholder="Tu nombre"
            />

            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              value={apellido}
              onChangeText={(text) => {
                console.log("✏️ Apellido cambiado:", text);
                setApellido(text);
              }}
              placeholder="Tu apellido"
            />

            <Text style={styles.label}>Teléfono</Text>
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>{city.code}</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                keyboardType="phone-pad"
                onChangeText={handlePhoneChange}
                placeholder={city.country === "PY" ? "985 444 681" : "98544-4681"}
                maxLength={city.country === "PY" ? 11 : 10}
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                console.log("✏️ Email cambiado:", text);
                setEmail(text);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="tu@email.com"
              textContentType="emailAddress"
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  console.log("🔑 Contraseña cambiada (oculta)");
                  setPassword(text);
                }}
                placeholder="Mínimo 6 caracteres"
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPassword2}
                value={password2}
                onChangeText={(text) => {
                  console.log("🔑 Confirmación contraseña cambiada");
                  setPassword2(text);
                }}
                placeholder="Repite tu contraseña"
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword2(!showPassword2)}
              >
                <Ionicons
                  name={showPassword2 ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {tab === "conductor" && (
              <>
                <Text style={styles.sectionTitle}>Servicio</Text>
                <View style={styles.serviceGrid}>
                  {services.map(service => (
                    <TouchableOpacity
                      key={service.name}
                      style={[
                        styles.serviceButton,
                        selectedService === service.name && styles.serviceActive
                      ]}
                      onPress={() => {
                        console.log("🔘 Servicio seleccionado:", service.name);
                        setSelectedService(service.name);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={service.icon as any}
                        size={22}
                        color={selectedService === service.name ? "#fff" : "#333"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.serviceText,
                          selectedService === service.name && styles.serviceTextActive
                        ]}
                      >
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sectionTitle}>Métodos de cobro</Text>
                <Text style={styles.subLabel}>Selecciona todos los que aceptas:</Text>
                <View style={styles.paymentGrid}>
                  {paymentMethods.map(method => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentButton,
                        selectedPaymentMethods.includes(method.id) && styles.paymentActive
                      ]}
                      onPress={() => togglePaymentMethod(method.id)}
                    >
                      <Text style={styles.paymentIcon}>{method.icon}</Text>
                      <Text style={[
                        styles.paymentText,
                        selectedPaymentMethods.includes(method.id) && styles.paymentTextActive
                      ]}>
                        {method.label}
                      </Text>
                      {selectedPaymentMethods.includes(method.id) && (
                        <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sectionTitle}>Datos de conductor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DNI"
                  value={dni}
                  onChangeText={(text) => {
                    console.log("✏️ DNI cambiado:", text);
                    setDni(text);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Dirección"
                  value={address}
                  onChangeText={(text) => {
                    console.log("✏️ Dirección cambiada:", text);
                    setAddress(text);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Licencia"
                  value={license}
                  onChangeText={(text) => {
                    console.log("✏️ Licencia cambiada:", text);
                    setLicense(text);
                  }}
                />

                <Text style={styles.sectionTitle}>Vehículo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Marca"
                  value={vehicleMarca}
                  onChangeText={(text) => {
                    console.log("🚗 Marca:", text);
                    setVehicleMarca(text);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Modelo"
                  value={vehicleModelo}
                  onChangeText={(text) => {
                    console.log("🚗 Modelo:", text);
                    setVehicleModelo(text);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Color"
                  value={vehicleColor}
                  onChangeText={(text) => {
                    console.log("🎨 Color:", text);
                    setVehicleColor(text);
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Matrícula"
                  value={vehiclePlate}
                  onChangeText={(text) => {
                    console.log("🔢 Matrícula:", text);
                    setVehiclePlate(text);
                  }}
                />

                <Text style={styles.sectionTitle}>Foto de perfil</Text>
                <View style={styles.photoContainer}>
                  {photo ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera" size={40} color="#ccc" />
                    </View>
                  )}

                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={tomarFoto}>
                      <Ionicons name="camera" size={20} color="#fff" />
                      <Text style={styles.photoButtonText}>Cámara</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.photoButton} onPress={seleccionarFoto}>
                      <Ionicons name="images" size={20} color="#fff" />
                      <Text style={styles.photoButtonText}>Galería</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <View style={styles.terms}>
              <TouchableOpacity
                style={[styles.checkbox, termsAccepted && styles.checkboxActive]}
                onPress={() => {
                  console.log("✅ Términos aceptados:", !termsAccepted);
                  setTermsAccepted(!termsAccepted);
                }}
              >
                {termsAccepted && <Ionicons name="checkmark" size={18} color="#fff" />}
              </TouchableOpacity>
              <Text>
                Acepto los{" "}
                <Text
                  style={styles.link}
                  onPress={() => {
                    console.log("📄 Abriendo términos para rol:", tab);
                    router.push({ pathname: "/(auth)/terms", params: { role: tab } });
                  }}
                >
                  Términos y condiciones
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                console.log("🟢 Botón CREAR CUENTA presionado");
                handleRegister();
              }}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creando..." : "Crear cuenta"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f6f8" },
  container: { padding: 25 },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e9ecef",
    borderRadius: 12,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    padding: 14,
    alignItems: "center"
  },
  tabActive: {
    backgroundColor: "#007AFF",
    borderRadius: 12
  },
  tabText: {
    fontWeight: "600",
    color: "#555"
  },
  tabTextActive: {
    color: "#fff"
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa"
  },
  cityRow: { flexDirection: "row" },
  cityButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#eee",
    marginRight: 6,
    borderRadius: 8,
    alignItems: "center"
  },
  cityActive: { backgroundColor: "#007AFF" },
  cityText: { color: "#444" },
  cityTextActive: { color: "#fff", fontWeight: "600" },
  sectionTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold"
  },
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10
  },
  serviceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#eef1f4",
    borderRadius: 20,
    margin: 4
  },
  serviceActive: { backgroundColor: "#007AFF" },
  serviceText: { color: "#333", fontWeight: "500" },
  serviceTextActive: { color: "#fff" },
  terms: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#007AFF",
    marginRight: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center"
  },
  checkboxActive: { backgroundColor: "#007AFF" },
  link: {
    color: "#007AFF",
    fontWeight: "600"
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
  phoneContainer: {
    flexDirection: "row",
    marginBottom: 8
  },
  countryCode: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRightWidth: 0,
    justifyContent: "center"
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333"
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#fafafa"
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa"
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    backgroundColor: "#fafafa",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10
  },
  eyeIcon: {
    padding: 14,
    backgroundColor: "#fafafa",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10
  },
  // 👇 NUEVOS ESTILOS PARA LA FOTO
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  // 👇 AGREGAR AQUÍ:
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    marginTop: -5,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  paymentActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  paymentText: {
    fontSize: 13,
    color: '#333',
    marginRight: 4,
  },
  paymentTextActive: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 4,
  },
});
