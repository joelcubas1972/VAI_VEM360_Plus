import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LocationSubscription } from 'expo-location';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { collection, doc, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { auth, db } from '../../src/services/firebaseConfig';
const { width, height } = Dimensions.get('window');

interface Coordenadas {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface Viaje {
  id: string;
  conductorId?: string;
  usuarioNombre?: string;
  origen?: {
    lat: number;
    lng: number;
    direccion: string;
  };
  destino?: {
    lat: number;
    lng: number;
    direccion: string;
  };
  precio?: number;
  estado?: 'pendiente' | 'aceptado' | 'en_curso' | 'completado' | 'rechazado';
  fecha?: Timestamp;
  tiempoEstimado?: number;
  distancia?: number;
  rating?: number;
}

interface ZonaCaliente {
  id: string;
  ubicacion?: {
    latitud: number;
    longitud: number;
  };
  activo?: boolean;
  intensidad?: number;
}

interface Estadisticas {
  viajes: number;
  rating: number;
  km: number;
}

export default function ConductorDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Coordenadas | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: -22.5327,
    longitude: -55.7333,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Estados para múltiples monedas
  const [earnings, setEarnings] = useState({ gs: 0, brl: 0, usd: 0 });
  const [todayStats, setTodayStats] = useState<Estadisticas>({
    viajes: 0,
    rating: 0,
    km: 0,
  });

  const [tasasCambio, setTasasCambio] = useState({ PYG: 1250, USD: 0.18 });
  const [requests, setRequests] = useState<Viaje[]>([]);
  const [activeRequest, setActiveRequest] = useState<Viaje | null>(null);
  const [heatZones, setHeatZones] = useState<ZonaCaliente[]>([]);
  const [conductorInfo, setConductorInfo] = useState<any>(null);
  const notificarNuevaSolicitud = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 NUEVA SOLICITUD",
          body: "Tienes un viaje disponible",
          sound: 'default', // ← ESTO USA EL SONIDO DEL TELÉFONO
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.log("Error con notificación:", error);
    }
  };
  const conductorId = auth.currentUser?.uid;
  const locationSubscription = useRef<LocationSubscription | null>(null);
  const mapRef = useRef<MapView>(null);
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  // Obtener información del conductor
  useEffect(() => {
    if (!conductorId) return;
    const unsubscribe = onSnapshot(doc(db, "conductores", conductorId), (doc) => {
      if (doc.exists()) {
        setConductorInfo(doc.data());
      }
    });
    return () => unsubscribe();
  }, [conductorId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "configuracion", "tasas"), (doc) => {
      if (doc.exists()) {
        setTasasCambio(doc.data().tasas);
        console.log("💰 Tasas cargadas:", doc.data().tasas);
      }
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (!auth.currentUser) {
      router.push("/(auth)/login");
      return;
    }
  }, []);

  // Geolocalización en tiempo real
  useEffect(() => {
    let isMounted = true;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación');
        return;
      }

      try {
        const initialLocation = await Location.getCurrentPositionAsync({});
        if (isMounted && initialLocation) {
          const newLocation = {
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude,
            heading: initialLocation.coords.heading || 0
          };
          setLocation(newLocation);
          setRegion({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (newLocation) => {
            if (isMounted) {
              const updatedLocation = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                heading: newLocation.coords.heading || 0
              };
              setLocation(updatedLocation);

              if (isOnline) {
                setRegion({
                  latitude: updatedLocation.latitude,
                  longitude: updatedLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              }

              if (isOnline && conductorId) {
                updateDoc(doc(db, "conductores", conductorId), {
                  "ubicacion": {
                    latitud: updatedLocation.latitude,
                    longitud: updatedLocation.longitude,
                    ultimaActualizacion: Timestamp.now(),
                    heading: updatedLocation.heading || 0
                  }
                }).catch(error => console.error("Error actualizando ubicación:", error));
              }
            }
          }
        );
      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
      }
    };

    startLocationTracking();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [isOnline, conductorId]);

  // ✅ Escuchar TODOS los viajes pendientes del servicio del conductor
  useEffect(() => {
    if (!conductorId || !isOnline || !conductorInfo?.servicio) return;

    console.log(`🎧 Conductor disponible - Escuchando solicitudes de servicio: ${conductorInfo.servicio}`);

    const q = query(
      collection(db, "viajes"),
      where("estado", "==", "pendiente"),
      where("tipo", "array-contains", conductorInfo.servicio),
      where("metodoPago", "in", conductorInfo.metodosCobro)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const viajes: Viaje[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Viaje, 'id'>
      }));
      if (requests.length === 0 && viajes.length > 0) {
        notificarNuevaSolicitud();
        Vibration.vibrate(500);
      }
      console.log(`📱 ${viajes.length} solicitudes encontradas para ${conductorInfo.servicio}`);
      setRequests(viajes);
    }, (error) => {
      console.error("Error escuchando viajes:", error);
    });

    return () => unsubscribe();
  }, [conductorId, isOnline, conductorInfo?.servicio, conductorInfo?.metodosCobro]);

  // ✅ Escuchar viajes ASIGNADOS a este conductor
  useEffect(() => {
    if (!conductorId) return;

    const q = query(
      collection(db, "viajes"),
      where("conductorId", "==", conductorId),
      where("estado", "in", ["aceptado", "en_curso"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const viajes: Viaje[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Viaje, 'id'>
      }));

      setActiveRequest(viajes[0] || null);
    });

    return () => unsubscribe();
  }, [conductorId]);

  // Escuchar zonas calientes
  useEffect(() => {
    const q = query(
      collection(db, "zonas_calientes"),
      where("activo", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const zonas: ZonaCaliente[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<ZonaCaliente, 'id'>
      }));
      setHeatZones(zonas);
    });

    return () => unsubscribe();
  }, []);

  // Calcular estadísticas
  // Calcular estadísticas por moneda de pago
  useEffect(() => {
    if (!conductorId) return;

    const q = query(
      collection(db, "viajes"),
      where("conductorId", "==", conductorId),
      where("estado", "==", "completado")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Inicializar sumas por moneda (EN SU MONEDA ORIGINAL)
      let totalBRL = 0;  // Solo viajes pagados en BRL
      let totalPYG = 0;  // Solo viajes pagados en PYG
      let totalUSD = 0;  // Solo viajes pagados en USD
      let totalViajes = 0;
      let totalKm = 0;
      let sumaRating = 0;

      snapshot.docs.forEach(doc => {
        const viaje = doc.data();
        totalViajes++;
        totalKm += viaje.distancia || 0;
        sumaRating += viaje.rating || 0;

        // 🔥 IMPORTANTE: Usar la moneda en que se pagó el viaje
        const moneda = viaje.monedaPago || 'BRL'; // Si no tiene, asumir BRL
        const precio = viaje.precio || 0;

        // Sumar SOLO en su moneda original
        switch (moneda) {
          case 'BRL':
            totalBRL += precio;
            break;
          case 'PYG':
            totalPYG += precio;
            break;
          case 'USD':
            totalUSD += precio;
            break;
          default:
            totalBRL += precio;
        }
      });

      // Actualizar earnings con las sumas en cada moneda
      setEarnings({
        brl: Math.round(totalBRL * 100) / 100,  // BRL con 2 decimales
        gs: Math.round(totalPYG),                // PYG entero
        usd: Math.round(totalUSD * 100) / 100    // USD con 2 decimales
      });

      setTodayStats({
        viajes: totalViajes,
        rating: totalViajes > 0 ? Math.round((sumaRating / totalViajes) * 10) / 10 : 0,
        km: Math.round(totalKm),
      });
    });

    return () => unsubscribe();
  }, [conductorId]);

  const toggleDisponibilidad = async () => {
    if (!conductorId) {
      Alert.alert("Error", "No hay conductor autenticado");
      return;
    }

    if (!location) {
      Alert.alert("Error", "Esperando ubicación...");
      return;
    }

    setLoading(true);
    try {
      const nuevoEstado = !isOnline;

      await updateDoc(doc(db, "conductores", conductorId), {
        disponible: nuevoEstado,
        servicio: conductorInfo?.servicio || 'taxi',
        ...(nuevoEstado && location ? {
          ubicacion: {
            latitud: location.latitude,
            longitud: location.longitude,
            ultimaActualizacion: Timestamp.now(),
            heading: location.heading || 0
          }
        } : {})
      });

      setIsOnline(nuevoEstado);

      Alert.alert(
        nuevoEstado ? "🟢 En línea" : "🔴 Desconectado",
        nuevoEstado
          ? "Ya estás visible para los usuarios"
          : "Ya no recibirás solicitudes"
      );

    } catch (error) {
      Alert.alert("Error", "No se pudo cambiar el estado");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const aceptarViaje = async (viajeId: string) => {
    if (!conductorId) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "viajes", viajeId), {
        estado: "aceptado",
        aceptadoEn: Timestamp.now(),
        conductorId: conductorId
      });

      await updateDoc(doc(db, "conductores", conductorId), {
        disponible: false,
        enViaje: true,
        viajeActual: viajeId
      });

      Alert.alert("✅ Éxito", "Viaje aceptado");
    } catch (error) {
      Alert.alert("Error", "No se pudo aceptar el viaje");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const rechazarViaje = async (viajeId: string) => {
    try {
      await updateDoc(doc(db, "viajes", viajeId), {
        estado: "rechazado",
        rechazadoEn: Timestamp.now()
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo rechazar el viaje");
      console.error(error);
    }
  };

  const finalizarViaje = async (viajeId: string) => {
    if (!conductorId) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "viajes", viajeId), {
        estado: "completado",
        completadoEn: Timestamp.now()
      });

      await updateDoc(doc(db, "conductores", conductorId), {
        enViaje: false,
        viajeActual: null,
        disponible: true
      });

      Alert.alert("✅ Viaje completado", "Gracias por tu servicio");
    } catch (error) {
      Alert.alert("Error", "No se pudo finalizar el viaje");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const centerMapOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="locate-outline" size={50} color="#007AFF" />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Header con estado y monedas */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            activeRequest ? styles.viajeDot : (isOnline ? styles.onlineDot : styles.offlineDot)
          ]} />
          <Text style={styles.statusText}>
            {activeRequest ? 'EN VIAJE' : (isOnline ? 'EN LÍNEA' : 'DESCONECTADO')}
          </Text>
        </View>

        {/* Contenedor de monedas */}
        <View style={styles.currencyContainer}>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyLabel}>R$</Text>
            <Text style={styles.currencyValue}>{earnings.brl.toFixed(2)}</Text>
          </View>
          <View style={styles.currencyDivider} />
          <View style={styles.currencyItem}>
            <Text style={styles.currencyLabel}>Gs</Text>
            <Text style={styles.currencyValue}>{earnings.gs.toLocaleString()}</Text>
          </View>
          <View style={styles.currencyDivider} />
          <View style={styles.currencyItem}>
            <Text style={styles.currencyLabel}>US$</Text>
            <Text style={styles.currencyValue}>{earnings.usd.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.connectButton,
            activeRequest ? styles.viajeButton : (isOnline ? styles.disconnectButton : styles.connectButtonStyle),
            loading && styles.buttonDisabled
          ]}
          onPress={toggleDisponibilidad}
          disabled={loading || !location || !!activeRequest}
        >
          <Text style={styles.connectButtonText}>
            {loading ? '...' :
              activeRequest ? 'VIAJE' : (isOnline ? 'DESC' : 'CON')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsTraffic={true}
        >
          {/* Marcador personalizado del auto */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              rotation={location.heading || 0}
            >
              <View style={[styles.carMarker, { transform: [{ rotate: `${location.heading || 0}deg` }] }]}>
                <Ionicons name="car-sport" size={40} color="#007AFF" />
              </View>
            </Marker>
          )}

          {/* Zonas calientes */}
          {heatZones.map((zona) => (
            zona.ubicacion && (
              <Marker
                key={zona.id}
                coordinate={{
                  latitude: zona.ubicacion.latitud,
                  longitude: zona.ubicacion.longitud
                }}
              >
                <View style={styles.heatMarker}>
                  <Text style={styles.heatText}>🔥</Text>
                  {(zona.intensidad || 0) > 5 && (
                    <View style={styles.heatPulse} />
                  )}
                </View>
              </Marker>
            )
          ))}
        </MapView>

        {/* Botón para centrar en mi ubicación */}
        <TouchableOpacity style={styles.centerButton} onPress={centerMapOnUser}>
          <Ionicons name="locate" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Contenido desplazable */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {activeRequest && (
          <View style={styles.mainRequest}>
            <Text style={styles.sectionTitle}>
              {activeRequest.estado === 'aceptado' ? '✅ VIAJE ACEPTADO' : '🔄 VIAJE EN CURSO'}
            </Text>
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>👤</Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{activeRequest.usuarioNombre || 'Cliente'}</Text>
                    <Text style={styles.userTime}>⏱️ {activeRequest.tiempoEstimado || 5} min</Text>
                  </View>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.requestPrice}>R$ {(activeRequest.precio || 0).toFixed(2)}</Text>
                  <Text style={styles.requestPriceSmall}>Gs {Math.round((activeRequest.precio || 0) * tasasCambio.PYG).toLocaleString()}</Text>
                </View>
              </View>

              <Text style={styles.requestRoute}>
                🚕 {activeRequest.origen?.direccion || 'Origen'} → {activeRequest.destino?.direccion || 'Destino'}
              </Text>

              {activeRequest.estado === 'aceptado' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => {
                    updateDoc(doc(db, "viajes", activeRequest.id), {
                      estado: "en_curso"
                    });
                  }}
                >
                  <Text style={styles.actionButtonText}>🚀 INICIAR VIAJE</Text>
                </TouchableOpacity>
              )}

              {activeRequest.estado === 'en_curso' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => finalizarViaje(activeRequest.id)}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>✅ FINALIZAR VIAJE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {isOnline && requests.length > 0 && !activeRequest && (
          <View style={styles.otherRequests}>
            <Text style={styles.sectionTitle}>📱 SOLICITUDES ({requests.length})</Text>
            {requests.map((req) => (
              <View key={req.id} style={styles.otherRequestCard}>
                <View style={styles.otherRequestLeft}>
                  <Text style={styles.otherRequestName}>{req.usuarioNombre || 'Cliente'}</Text>
                  <Text style={styles.otherRequestTime}>⏱️ {req.tiempoEstimado || 3} min</Text>
                  <Text style={styles.otherRequestDistance}>
                    📍 {req.distancia ? `${req.distancia} km` : 'Cerca'}
                  </Text>
                </View>
                <View style={styles.otherRequestRight}>
                  <View style={styles.otherRequestPriceContainer}>
                    <Text style={styles.otherRequestPrice}>R$ {(req.precio || 0).toFixed(2)}</Text>
                    <Text style={styles.otherRequestPriceSmall}>Gs {Math.round((req.precio || 0) * tasasCambio.PYG).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bigAcceptButton}
                    onPress={() => aceptarViaje(req.id)}
                    disabled={loading}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.bigAcceptButtonText}>ACEPTAR CARRERA</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {isOnline && requests.length === 0 && !activeRequest && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>Esperando solicitudes...</Text>
            <Text style={styles.emptyStateSubtext}>Mantente cerca de zonas con alta demanda 🔥</Text>
          </View>
        )}

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.viajes}</Text>
            <Text style={styles.statLabel}>Viajes hoy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {todayStats.rating > 0 ? todayStats.rating.toFixed(1) : '0.0'} ⭐
            </Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.km} km</Text>
            <Text style={styles.statLabel}>Recorridos</Text>
          </View>
        </View>
        {/* Botón de CERRAR SESIÓN */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            // Desconectar al conductor
            if (conductorId && isOnline) {
              await updateDoc(doc(db, "conductores", conductorId), {
                disponible: false
              });
            }
            // Cerrar sesión
            await auth.signOut();
            router.replace('/(auth)/login');
          }}
        >
          <Ionicons name="log-out" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Menú inferior */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={[styles.menuText, styles.menuTextActive]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/historial' as any)}
        >
          <Ionicons name="time" size={24} color="#999" />
          <Text style={styles.menuText}>Viajes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/ganancias' as any)}
        >
          <Ionicons name="cash" size={24} color="#999" />
          <Text style={styles.menuText}>Ganancias</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/perfil-conductor' as any)}
        >
          <Ionicons name="person" size={24} color="#999" />
          <Text style={styles.menuText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: '#4CAF50',
  },
  offlineDot: {
    backgroundColor: '#FF3B30',
  },
  viajeDot: {
    backgroundColor: '#FFA500',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  currencyItem: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  currencyLabel: {
    fontSize: 9,
    color: '#999',
  },
  currencyValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  currencyDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#eee',
  },
  connectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 55,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  connectButtonStyle: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  viajeButton: {
    backgroundColor: '#FFA500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: height * 0.5,
    width: width,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  carMarker: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  heatMarker: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatText: {
    fontSize: 20,
  },
  heatPulse: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    zIndex: -1,
  },
  centerButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingTop: 15,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    marginTop: 5,
  },
  mainRequest: {
    marginBottom: 15,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    fontSize: 20,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userTime: {
    fontSize: 12,
    color: '#999',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  requestPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  requestPriceSmall: {
    fontSize: 10,
    color: '#999',
  },
  requestRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  otherRequests: {
    marginBottom: 15,
  },
  otherRequestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  otherRequestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  otherRequestTime: {
    fontSize: 12,
    color: '#999',
  },
  otherRequestDistance: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  otherRequestRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otherRequestPriceContainer: {
    alignItems: 'flex-end',
    marginRight: 5,
  },
  otherRequestPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  otherRequestPriceSmall: {
    fontSize: 9,
    color: '#999',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 5,
  },
  smallAcceptButton: {
    backgroundColor: '#4CAF50',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallRejectButton: {
    backgroundColor: '#fff',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    height: 60,
  },
  menuItem: {
    alignItems: 'center',
  },
  menuText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuTextActive: {
    color: '#007AFF',
  },
  // Botón grande de aceptar
  bigAcceptButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bigAcceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Botón cerrar sesión
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  otherRequestLeft: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

});