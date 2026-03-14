import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useTranslation } from '../../src/i18n/useTranslation';
import { auth, db } from '../../src/services/firebaseConfig';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_APIKEY = 'AIzaSyCjnQrWBaAbchyIGaQGvIv9zd0wtjmrf9o';

// Tipos de cambio
const exchangeRates = {
  BRL: 1,
  PYG: 1250,
  USD: 0.18,
};

const currencySymbols = {
  BRL: 'R$',
  PYG: 'Gs',
  USD: 'US$',
};
const metodosPago = [
  { id: 'efectivo', label: 'Efectivo', icon: '💰' },
  { id: 'pix_br', label: 'Pix Brasilero', icon: '🇧🇷' },
  { id: 'tarjeta_credito_br', label: 'Tarjeta crédito brasilera', icon: '💳' },
  { id: 'tarjeta_debito_br', label: 'Tarjeta débito brasilera', icon: '💳' },
  { id: 'tarjeta_credito_py', label: 'Tarjeta crédito paraguaya', icon: '🇵🇾' },
  { id: 'tarjeta_debito_py', label: 'Tarjeta débito paraguaya', icon: '🇵🇾' },
  { id: 'transferencia_py', label: 'Transferencia bancaria paraguaya', icon: '🏦' },
  { id: 'giros_tigo', label: 'Giros (Tigo Money)', icon: '📱' },
];
export default function MapaScreen() {
  const { t, language } = useTranslation();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const servicioSeleccionado = params.servicio as string || 'Uber';
  //console.log("🎯 Servicio recibido en mapa:", servicioSeleccionado);
  // Helper para convertir hex a RGB (para transparencias)
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 122, 255';
  };

  // Animaciones para la tarjeta moderna
  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const [cardVisible, setCardVisible] = useState(false);
  const [cardMinimized, setCardMinimized] = useState(false);
  const [cardContent, setCardContent] = useState<any>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !cardMinimized,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { },
    })
  ).current;

  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [notifications] = useState(3);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('hybrid');
  const [destination, setDestination] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [ridePrice, setRidePrice] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'PYG' | 'USD'>('BRL');
  const [selectedMetodoPago, setSelectedMetodoPago] = useState('efectivo');
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // Estados para la búsqueda
  const [buscandoConductor, setBuscandoConductor] = useState(false);
  const [conductorAsignado, setConductorAsignado] = useState<any>(null);
  const [conductoresContactados, setConductoresContactados] = useState<any[]>([]);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [tiempoParaCancelar, setTiempoParaCancelar] = useState(0);
  const [puedeCancelar, setPuedeCancelar] = useState(false);
  const timeoutRef = useRef<any>(null);
  const cancelTimerRef = useRef<any>(null);

  // 🔥 NUEVO: Estado para conductores reales desde Firebase
  const [conductoresReales, setConductoresReales] = useState<any[]>([]);
  const [loadingConductores, setLoadingConductores] = useState(true);

  const getServiceInfo = () => {
    const info: any = {
      taxi: { title: 'Taxis disponibles', color: '#4CAF50', icon: 'car' },
      uber_mujer: { title: 'Conductoras disponibles', color: '#E91E63', icon: 'woman' },
      mototaxi: { title: 'Mototaxis disponibles', color: '#2196F3', icon: 'bicycle' },
      grua: { title: 'Grúas disponibles', color: '#FF5722', icon: 'car-sport' },
      mudanza: { title: 'Camiones de mudanza', color: '#795548', icon: 'cube' },
      delivery: { title: 'Delivery disponible', color: '#FF9800', icon: 'cube' },
      compra: { title: 'Compra y traslado', color: '#9C27B0', icon: 'cart' }
    };
    return info[servicioSeleccionado] || info.taxi;
  };

  const serviceInfo = getServiceInfo();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permiso de ubicación denegado');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
  }, []);

  useEffect(() => {
    console.log(`🔍 Buscando conductores para servicio: ${servicioSeleccionado}`);

    const q = query(
      collection(db, "conductores"),
      where("servicio", "==", servicioSeleccionado),
      where("disponible", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📊 Conductores encontrados para ${servicioSeleccionado}: ${snapshot.size}`);

      const conductores = snapshot.docs.map(doc => {
        const data = doc.data();

        // Solo validamos que tenga ubicación, sin depender de region
        if (!data.ubicacion?.latitud || !data.ubicacion?.longitud) return null;

        return {
          id: doc.id,
          type: data.servicio,
          service: data.servicio,
          lat: data.ubicacion.latitud,
          lng: data.ubicacion.longitud,
          driver: `${data.nombre || ''} ${data.apellido || ''}`.trim() || 'Conductor',
          plate: data.vehiculo?.matricula || 'ABC-123',
          disponible: data.disponible,
          marca: data.vehiculo?.marca || 'Toyota',
          modelo: data.vehiculo?.modelo || 'Corolla',
          color: data.vehiculo?.color || 'Blanco',
        };
      }).filter(c => c !== null);

      console.log(`✅ Conductores en mapa: ${conductores.length}`);
      setConductoresReales(conductores);
      setLoadingConductores(false);
    });

    return () => unsubscribe();
  }, [servicioSeleccionado]); // 👈 SOLO servicioSeleccionado como dependencia

  useEffect(() => {
    if (!params.destination) return;

    try {
      const dest = typeof params.destination === 'string'
        ? JSON.parse(params.destination)
        : params.destination;

      if (dest && dest.lat && dest.lng) {
        setDestination({
          latitude: dest.lat,
          longitude: dest.lng,
        });
      }
    } catch (e) {
      console.log("Error parsing destination", e);
    }
  }, [params.destination]);

  useEffect(() => {
    if (destination && region) {
      fetchRoutes();
    }
  }, [destination, region]);

  // Limpiar timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (cancelTimerRef.current) {
        clearInterval(cancelTimerRef.current);
      }
    };
  }, []);

  // Iniciar contador de 30 segundos cuando se asigna conductor
  useEffect(() => {
    if (conductorAsignado) {
      setPuedeCancelar(true);
      setTiempoParaCancelar(30);

      cancelTimerRef.current = setInterval(() => {
        setTiempoParaCancelar((prev) => {
          if (prev <= 1) {
            clearInterval(cancelTimerRef.current);
            setPuedeCancelar(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPuedeCancelar(false);
      setTiempoParaCancelar(0);
      if (cancelTimerRef.current) {
        clearInterval(cancelTimerRef.current);
      }
    }
  }, [conductorAsignado]);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/(auth)/login');
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'taxi': return '#4CAF50';
      case 'uber_mujer': return '#E91E63';
      case 'grua': return '#FF5722';
      case 'mototaxi': return '#2196F3';
      case 'mudanza': return '#795548';
      case 'delivery': return '#FF9800';
      case 'compra': return '#9C27B0';
      default: return '#007AFF';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'taxi': return 'car';
      case 'uber_mujer': return 'woman';
      case 'grua': return 'car-sport';
      case 'mototaxi': return 'bicycle';
      case 'mudanza': return 'cube';
      case 'delivery': return 'cube';
      case 'compra': return 'cart';
      default: return 'location';
    }
  };

  const calculatePrice = (distance: number, duration: number) => {
    const hour = new Date().getHours();
    const nightMultiplier = (hour >= 22 || hour < 6) ? 1.3 : 1;

    const services: any = {
      Uber: { base: 15, km: 1.5, min: 0.3 },
      uber_mujer: { base: 18, km: 1.8, min: 0.35 },
      mototaxi: { base: 10, km: 1.2, min: 0.2 },
      grua: { base: 30, km: 3.5, min: 0.5 },
      mudanza: { base: 50, km: 2.5, min: 1 },
      delivery: { base: 8, km: 1, min: 0.1 },
      compra: { base: 12, km: 1.2, min: 0.15 }
    };

    const service = services[servicioSeleccionado] || services.Uber;
    let price = service.base + (distance * service.km) + (duration * service.min);
    price = price * nightMultiplier;
    return price;
  };

  const fetchRoutes = async () => {
    if (!region || !destination) return;

    const origin = region.latitude + "," + region.longitude;
    const dest = destination.latitude + "," + destination.longitude;

    const url =
      "https://maps.googleapis.com/maps/api/directions/json?origin=" +
      origin +
      "&destination=" +
      dest +
      "&alternatives=true" +
      "&mode=driving" +
      "&key=" +
      GOOGLE_MAPS_APIKEY;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) return;

      setAvailableRoutes(data.routes);
      setSelectedRouteIndex(0);

      const best = data.routes[0];
      const coords = decodePolyline(best.overview_polyline.points);

      setRouteCoordinates(coords);
      setRouteDistance(best.legs[0].distance.value / 1000);
      setRouteDuration(best.legs[0].duration.value / 60);

    } catch (e) {
      console.log(e);
    }
  };

  const decodePolyline = (encoded: string) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Mostrar tarjeta moderna
  const mostrarTarjeta = (titulo: string, mensaje: string, tipo: 'info' | 'success' | 'error' | 'contactando' = 'info', conductor?: any) => {
    setCardContent({
      titulo,
      mensaje,
      tipo,
      conductor
    });
    setCardVisible(true);
    setCardMinimized(false);
    pan.setValue({ x: 0, y: 0 });

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const ocultarTarjeta = () => {
    Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCardVisible(false);
      setCardContent(null);
      setCardMinimized(false);
    });
  };

  const toggleMinimizar = () => {
    if (cardMinimized) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
      setCardMinimized(false);
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.3, useNativeDriver: true, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 0.8, duration: 300, useNativeDriver: true })
      ]).start();
      setCardMinimized(true);
    }
  };

  const handleCardPress = () => {
    if (cardMinimized) {
      toggleMinimizar();
    }
  };

  const buscarConductorAutomatico = async () => {
    console.log("🚀 USUARIO SOLICITANDO VIAJE");
    console.log("  Destino:", destination);
    console.log("  Conductores disponibles:", conductoresReales.length);
    console.log("  Servicio:", servicioSeleccionado);

    if (!destination || conductoresReales.length === 0) {
      console.log("❌ Error: Sin destino o sin conductores");
      mostrarTarjeta("Error", "No hay conductores disponibles en este momento", 'error');
      return;
    }

    if (!region) {
      console.log("❌ Error: Sin ubicación");
      mostrarTarjeta("Error", "No se pudo obtener tu ubicación", 'error');
      return;
    }

    console.log("✅ Validaciones pasadas, iniciando búsqueda...");
    setBuscandoConductor(true);
    setConductorAsignado(null);
    setConductoresContactados([]);

    try {
      const nuevoViaje = {
        usuarioId: auth.currentUser?.uid,
        usuarioNombre: auth.currentUser?.email,
        origen: {
          lat: region.latitude,
          lng: region.longitude,
          direccion: "Mi ubicación"
        },
        destino: {
          lat: destination.latitude,
          lng: destination.longitude,
          direccion: "Destino"
        },
        tipo: [servicioSeleccionado],
        estado: "pendiente",
        precio: ridePrice || 25000,
        monedaPago: selectedCurrency,
        metodoPago: selectedMetodoPago,
        distancia: routeDistance || 3.5,
        tiempoEstimado: Math.round(routeDuration) || 5,
        fecha: new Date(),
        conductorId: null
      };

      console.log("📝 Creando viaje:", nuevoViaje);
      const docRef = await addDoc(collection(db, "viajes"), nuevoViaje);
      console.log("✅ Viaje creado con ID:", docRef.id);

      // CONTINUAR CON LA LÓGICA DE CONTACTAR CONDUCTORES
      const conductoresConDistancia = conductoresReales.map(conductor => {
        const distancia = calcularDistancia(
          region.latitude,
          region.longitude,
          conductor.lat,
          conductor.lng
        );
        return {
          ...conductor,
          distanciaKm: distancia,
          etaCalculado: Math.round(distancia * 2)
        };
      });

      const conductoresOrdenados = conductoresConDistancia.sort((a, b) => a.distanciaKm - b.distanciaKm);

      let indiceActual = 0;
      const TIEMPO_ESPERA = 7;

      const contactarSiguienteConductor = () => {
        if (indiceActual >= conductoresOrdenados.length) {
          setBuscandoConductor(false);
          mostrarTarjeta("Lo sentimos", "No hay conductores disponibles", 'error');
          return;
        }

        const conductor = conductoresOrdenados[indiceActual];

        setConductoresContactados(prev => [...prev, conductor.id]);

        mostrarTarjeta(
          "🔄 Contactando",
          `${conductor.driver} (${indiceActual + 1}/${conductoresOrdenados.length})`,
          'contactando',
          conductor
        );

        setTiempoRestante(TIEMPO_ESPERA);

        let segundosPasados = 0;
        const intervalo = setInterval(() => {
          segundosPasados++;
          setTiempoRestante(TIEMPO_ESPERA - segundosPasados);
          if (cardVisible && cardContent?.tipo === 'contactando') {
            setCardContent((prev: any) => ({
              ...prev,
              mensaje: `${conductor.driver} (${indiceActual + 1}/${conductoresOrdenados.length})\nEsperando... ${TIEMPO_ESPERA - segundosPasados}s`
            }));
          }
        }, 1000);

        timeoutRef.current = setTimeout(() => {
          clearInterval(intervalo);

          // 🔥 IMPORTANTE: Escuchar en Firestore si este conductor aceptó
          // Creamos un listener para este conductor específico
          const viajeRef = doc(db, "viajes", docRef.id);
          const unsubscribe = onSnapshot(viajeRef, (snapshot) => {
            const viajeData = snapshot.data();

            // Si el conductor aceptó (conductorId tiene el ID de este conductor)
            if (viajeData?.conductorId === conductor.id && viajeData?.estado === "aceptado") {
              unsubscribe(); // Limpiamos el listener

              // Limpiar cualquier otro timeout pendiente
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              clearInterval(intervalo);

              // Asignar este conductor
              setConductorAsignado(conductor);
              setBuscandoConductor(false);
              setTiempoRestante(0);

              mostrarTarjeta(
                "✅ Viaje asignado",
                `${conductor.driver} aceptó el viaje`,
                'success',
                conductor
              );
            }
          });

          // Si pasa el tiempo sin que este conductor acepte, pasamos al siguiente
          const timeoutConductor = setTimeout(() => {
            unsubscribe(); // Limpiamos el listener

            // Verificar si ya no fue asignado por otro conductor
            if (!conductorAsignado) {
              mostrarTarjeta(
                "⏳ No disponible",
                `${conductor.driver} no respondió`,
                'info'
              );
              indiceActual++;
              contactarSiguienteConductor();
            }
          }, TIEMPO_ESPERA * 1000);

          // Guardar el timeout para poder cancelarlo después
          timeoutRef.current = timeoutConductor;

        }, 1000); // Pequeño delay antes de empezar a escuchar
      };

      contactarSiguienteConductor();

    } catch (error) {
      console.log("❌ Error creando viaje:", error);
      mostrarTarjeta("Error", "No se pudo crear el viaje", 'error');
      setBuscandoConductor(false);
    }
  };

  const cancelarBusqueda = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setBuscandoConductor(false);
    setConductorAsignado(null);
    setConductoresContactados([]);
    setTiempoRestante(0);
    ocultarTarjeta();
    mostrarTarjeta("Cancelado", "Búsqueda cancelada", 'info');
  };

  const cancelarViaje = () => {
    if (!puedeCancelar) {
      mostrarTarjeta("No disponible", "Ya pasaron los 30 segundos, no puedes cancelar", 'error');
      return;
    }

    setConductorAsignado(null);
    setBuscandoConductor(false);
    ocultarTarjeta();
    mostrarTarjeta("Viaje cancelado", "Has cancelado el viaje", 'info');
  };

  const handleRequestRide = () => {
    console.log("🟢🟢🟢 BOTÓN SOLICITAR VIAJE PRESIONADO");
    console.log("  destination:", destination);
    console.log("  buscandoConductor:", buscandoConductor);
    console.log("  conductorAsignado:", conductorAsignado);
    console.log("  conductoresReales.length:", conductoresReales.length);

    if (!destination) {
      mostrarTarjeta("Error", "Selecciona un destino", 'error');
      router.push({
        pathname: "/(tabs)/buscar",
        params: { servicio: servicioSeleccionado }
      });
      return;
    }

    if (buscandoConductor) {
      mostrarTarjeta("En curso", "Ya hay una búsqueda activa", 'info');
      return;
    }

    if (conductorAsignado) {
      mostrarTarjeta("✅ Viaje asignado", `Conductor: ${conductorAsignado.driver}`, 'success', conductorAsignado);
      return;
    }

    // 👈 LLAMAR A LA FUNCIÓN EXTERNA (AHORA ASYNC)
    buscarConductorAutomatico();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.languageText}>
            {language === 'es' ? '🇵🇾' : '🇧🇷'}
          </Text>
          <Text style={styles.serviceTitle}>{serviceInfo.title}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timeText}>10:25</Text>
          <View style={styles.batteryIcon}>
            <Ionicons name="battery-full" size={20} color="#333" />
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={22} color="#333" />
            {notifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{notifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector de vista de mapa */}
      <View style={styles.mapTypeSelector}>
        <TouchableOpacity
          style={[styles.mapTypeButton, mapType === 'standard' && styles.mapTypeActive]}
          onPress={() => setMapType('standard')}
        >
          <Ionicons name="map" size={20} color={mapType === 'standard' ? '#fff' : '#333'} />
          <Text style={[styles.mapTypeText, mapType === 'standard' && styles.mapTypeTextActive]}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapTypeButton, mapType === 'hybrid' && styles.mapTypeActive]}
          onPress={() => setMapType('hybrid')}
        >
          <Ionicons name="earth" size={20} color={mapType === 'hybrid' ? '#fff' : '#333'} />
          <Text style={[styles.mapTypeText, mapType === 'hybrid' && styles.mapTypeTextActive]}>Satélite</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType={mapType}
        >
          {conductoresReales.map((car) => (
            <Marker
              key={car.id}
              coordinate={{ latitude: car.lat, longitude: car.lng }}
              title={`${car.driver} - ${car.eta} min`}
              opacity={conductoresContactados.includes(car.id) ? 0.5 : 1}
            >
              <View style={[
                styles.marker,
                { backgroundColor: getMarkerColor(car.type) },
                conductorAsignado?.id === car.id && styles.markerAsignado,
                conductoresContactados.includes(car.id) && !conductorAsignado && styles.markerContactado
              ]}>
                <Ionicons name={getMarkerIcon(car.type)} size={20} color="#fff" />
                {car.favorite && (
                  <View style={styles.favoriteBadge}>
                    <Ionicons name="star" size={12} color="#FFC107" />
                  </View>
                )}
              </View>
            </Marker>
          ))}

          {destination && (
            <Marker
              coordinate={{
                latitude: destination.latitude,
                longitude: destination.longitude,
              }}
              pinColor="red"
              title="Destino"
            />
          )}

          {destination && region && GOOGLE_MAPS_APIKEY && (
            <MapViewDirections
              origin={{
                latitude: region.latitude,
                longitude: region.longitude,
              }}
              destination={destination}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor={serviceInfo.color}
              mode="DRIVING"
              language={language === 'es' ? 'es' : 'pt'}
              timePrecision="now"
              alternativeRoutes={true}
              onReady={(result) => {
                if (!result || !result.coordinates) return;
                setRouteDistance(result.distance);
                setRouteDuration(result.duration);
                setRidePrice(calculatePrice(result.distance, result.duration));
                setRouteCoordinates(result.coordinates);
              }}
              onError={(errorMessage) => {
                console.log('Error en ruta:', errorMessage);
              }}
            />
          )}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor={serviceInfo.color}
            />
          )}
        </MapView>
      </View>

      {/* Tarjeta flotante MODERNA */}
      {cardVisible && cardContent && (
        <Animated.View
          style={[
            styles.floatingCard,
            {
              backgroundColor: cardContent.tipo === 'success'
                ? `rgba(${hexToRgb(serviceInfo.color)}, 0.30)`
                : cardContent.tipo === 'error'
                  ? `rgba(${hexToRgb(serviceInfo.color)}, 0.30)`
                  : cardContent.tipo === 'contactando'
                    ? `rgba(${hexToRgb(serviceInfo.color)}, 0.30)`
                    : `rgba(${hexToRgb(serviceInfo.color)}, 0.30)`,
              borderColor: cardContent.tipo === 'success'
                ? '#4CAF50'
                : cardContent.tipo === 'error'
                  ? '#FF3B30'
                  : serviceInfo.color,
              borderWidth: 1,
            },
            cardMinimized && styles.cardMinimized,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: scaleAnim }
              ],
              opacity: opacityAnim
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableWithoutFeedback onPress={handleCardPress}>
            <View>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIconContainer, { backgroundColor: serviceInfo.color }]}>
                    {cardContent.tipo === 'success' && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                    {cardContent.tipo === 'error' && <Ionicons name="alert-circle" size={18} color="#fff" />}
                    {cardContent.tipo === 'contactando' && <Ionicons name="sync" size={18} color="#fff" />}
                    {cardContent.tipo === 'info' && <Ionicons name="information-circle" size={18} color="#fff" />}
                  </View>
                  <Text style={[styles.cardTitle, {
                    color: '#000',
                    fontWeight: '800',
                    textShadowColor: 'rgba(255, 255, 255, 0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2
                  }]} numberOfLines={1}>
                    {cardMinimized ? '' : cardContent.titulo}
                  </Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  <TouchableOpacity onPress={toggleMinimizar} style={[styles.cardIconButton, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                    <Ionicons
                      name={cardMinimized ? "expand" : "contract"}
                      size={18}
                      color={serviceInfo.color}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={ocultarTarjeta} style={[styles.cardIconButton, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                    <Ionicons name="close" size={18} color={serviceInfo.color} />
                  </TouchableOpacity>
                </View>
              </View>

              {!cardMinimized && (
                <>
                  {cardContent.tipo !== 'success' && (  // ← No mostrar mensaje si es success
                    <Text style={[styles.cardMessage, {
                      color: '#000',
                      fontWeight: '600',
                      textShadowColor: 'rgba(255, 255, 255, 0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2
                    }]}>{cardContent.mensaje}</Text>
                  )}

                  {cardContent.tipo === 'contactando' && (
                    <>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((7 - tiempoRestante) / 7) * 100}%`, backgroundColor: serviceInfo.color }]} />
                      </View>
                      <TouchableOpacity
                        style={[styles.cardButton, { backgroundColor: serviceInfo.color }]}
                        onPress={cancelarBusqueda}
                      >
                        <Text style={styles.cardButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {cardContent.tipo === 'success' && cardContent.conductor && (
                    <>
                      <View style={styles.conductorInfo}>
                        <View style={styles.conductorDetails}>
                          {/* ✅ NOMBRE DEL CONDUCTOR AGREGADO */}
                          <Text style={styles.conductorName}>
                            {cardContent.conductor.driver}
                          </Text>

                          <Text style={[styles.conductorPlate, {
                            color: '#000',
                            fontWeight: '700',
                            textShadowColor: 'rgba(255, 255, 255, 0.5)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 2
                          }]}>{cardContent.conductor.plate}</Text>

                          <View style={styles.vehicleDetails}>
                            <Text style={styles.vehicleText}>
                              {cardContent.conductor.marca || 'Toyota'} {cardContent.conductor.modelo || 'Corolla'}
                            </Text>
                            <Text style={[styles.vehicleColor, { color: cardContent.conductor.color?.toLowerCase() || '#666' }]}>
                              Color: {cardContent.conductor.color || 'Blanco'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.etaContainer}>
                          <Text style={styles.conductorEta}>⏱️ {cardContent.conductor.etaCalculado} min</Text>
                        </View>
                      </View>
                      {puedeCancelar && (
                        <TouchableOpacity
                          style={[styles.cancelRideButton, { backgroundColor: serviceInfo.color }]}
                          onPress={cancelarViaje}
                        >
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={styles.cancelRideText}>
                            CANCELAR VIAJE ({tiempoParaCancelar}s)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  <View style={styles.dragIndicator}>
                    <Ionicons name="menu" size={14} color="#999" />
                    <Text style={[styles.dragText, { color: '#999' }]}>Arrastra para mover</Text>
                  </View>
                </>
              )}

              {cardMinimized && (
                <View style={styles.minimizedContent}>
                  <View style={[styles.minimizedIconContainer, { backgroundColor: serviceInfo.color }]}>
                    {cardContent.tipo === 'success' && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
                    {cardContent.tipo === 'error' && <Ionicons name="alert-circle" size={24} color="#fff" />}
                    {cardContent.tipo === 'contactando' && <Ionicons name="sync" size={24} color="#fff" />}
                    {cardContent.tipo === 'info' && <Ionicons name="information-circle" size={24} color="#fff" />}
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* Indicadores compactos */}
      {buscandoConductor && !cardVisible && (
        <View style={[styles.compactIndicator, { borderColor: serviceInfo.color }]}>
          <Ionicons name="sync" size={20} color={serviceInfo.color} />
          <Text style={styles.compactText}>Buscando... {tiempoRestante}s</Text>
        </View>
      )}

      {conductorAsignado && !cardVisible && (
        <View style={[styles.compactIndicator, { borderColor: '#4CAF50' }]}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.compactText}>{conductorAsignado.driver} · {conductorAsignado.etaCalculado} min</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {/* Barra de búsqueda */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push({
            pathname: '/(tabs)/buscar',
            params: { servicio: servicioSeleccionado }
          })}
        >
          <Ionicons name="search" size={20} color={serviceInfo.color} />
          <Text style={styles.searchText}>
            {destination ? 'Cambiar destino' : '¿A dónde querés ir?'}
          </Text>
        </TouchableOpacity>

        {/* Botón de cancelar viaje */}
        {buscandoConductor && (
          <TouchableOpacity
            style={styles.cancelSearchButton}
            onPress={cancelarBusqueda}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.cancelRideText}>CANCELAR BÚSQUEDA</Text>
          </TouchableOpacity>
        )}

        {/* Rutas alternativas */}
        {availableRoutes.length > 1 && (
          <View style={styles.routesContainer}>
            <Text style={styles.routesLabel}>Rutas alternativas:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableRoutes.map((route, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.routeButton,
                    selectedRouteIndex === index && styles.routeButtonSelected,
                  ]}
                  onPress={() => {
                    setSelectedRouteIndex(index);
                    const selected = availableRoutes[index];
                    if (selected && selected.overview_polyline) {
                      const coords = decodePolyline(selected.overview_polyline.points);
                      setRouteCoordinates(coords);
                      setRouteDistance(selected.legs[0].distance.value / 1000);
                      setRouteDuration(selected.legs[0].duration.value / 60);
                      setRidePrice(calculatePrice(
                        selected.legs[0].distance.value / 1000,
                        selected.legs[0].duration.value / 60
                      ));
                    }
                  }}
                >
                  <Text style={[
                    styles.routeText,
                    selectedRouteIndex === index && styles.routeTextSelected,
                  ]}>
                    Ruta {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Información del viaje */}
        {routeDistance > 0 && (
          <View style={styles.tripInfoContainer}>
            <View style={styles.tripInfoRow}>
              <Ionicons name="map" size={20} color="#666" />
              <Text style={styles.tripInfoText}>Distancia: {routeDistance.toFixed(1)} km</Text>
            </View>
            <View style={styles.tripInfoRow}>
              <Ionicons name="time" size={20} color="#666" />
              <Text style={styles.tripInfoText}>Duración: {Math.round(routeDuration)} min</Text>
            </View>
            <View style={styles.tripInfoRow}>
              <Ionicons name="cash" size={20} color={serviceInfo.color} />
              <Text style={styles.tripInfoText}>
                Precio: {currencySymbols[selectedCurrency]} {(ridePrice * exchangeRates[selectedCurrency]).toFixed(2)}
              </Text>
            </View>

            {/* Selector de moneda de pago */}
            <View style={styles.paymentCurrencyContainer}>
              <Text style={styles.paymentCurrencyLabel}>Seleccione moneda de pago:</Text>
              <View style={styles.paymentCurrencySelector}>
                {Object.keys(currencySymbols).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.paymentCurrencyButton,
                      selectedCurrency === curr && styles.paymentCurrencyActive
                    ]}
                    onPress={() => setSelectedCurrency(curr as 'BRL' | 'PYG' | 'USD')}
                  >
                    <Text style={[
                      styles.paymentCurrencyText,
                      selectedCurrency === curr && styles.paymentCurrencyTextActive
                    ]}>
                      {currencySymbols[curr as keyof typeof currencySymbols]} {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodLabel}>Forma de pago:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.paymentMethodScroll}
              >
                {metodosPago.map((metodo) => (
                  <TouchableOpacity
                    key={metodo.id}
                    style={[
                      styles.paymentMethodButton,
                      selectedMetodoPago === metodo.id && styles.paymentMethodActive
                    ]}
                    onPress={() => setSelectedMetodoPago(metodo.id)}
                  >
                    <Text style={styles.paymentMethodIcon}>{metodo.icon}</Text>
                    <Text style={[
                      styles.paymentMethodText,
                      selectedMetodoPago === metodo.id && styles.paymentMethodTextActive
                    ]}>
                      {metodo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={[
                styles.requestButton,
                { backgroundColor: serviceInfo.color },
                (buscandoConductor || conductorAsignado) && styles.requestButtonDisabled
              ]}
              onPress={handleRequestRide}
              disabled={buscandoConductor}
            >
              <Text style={styles.requestButtonText}>
                {buscandoConductor ? 'BUSCANDO...' :
                  conductorAsignado ? 'VIAJE ASIGNADO' :
                    'SOLICITAR VIAJE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón de CERRAR SESIÓN */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Menú inferior */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/servicios')}>
          <Ionicons name="grid" size={24} color="#007AFF" />
          <Text style={[styles.menuText, styles.menuTextActive]}>Servicios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/mapa')}>
          <Ionicons name="map" size={24} color="#999" />
          <Text style={styles.menuText}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push({
          pathname: '/(tabs)/buscar',
          params: { servicio: servicioSeleccionado }
        })}>
          <Ionicons name="search" size={24} color="#999" />
          <Text style={styles.menuText}>Buscar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/explore')}>
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    marginRight: 5,
  },
  languageText: {
    fontSize: 20,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  batteryIcon: {
    marginRight: 5,
  },
  notificationButton: {
    position: 'relative',
    padding: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: height * 0.45,
    width: width,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerAsignado: {
    borderWidth: 3,
    borderColor: '#4CAF50',
    transform: [{ scale: 1.1 }],
  },
  markerContactado: {
    opacity: 0.5,
  },
  favoriteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  mapTypeSelector: {
    flexDirection: 'row',
    position: 'absolute',
    top: 100,
    right: 15,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  mapTypeActive: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  mapTypeText: {
    fontSize: 12,
    color: '#333',
  },
  mapTypeTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  cancelSearchButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingCard: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 20,
    borderWidth: 1,
  },
  cardMinimized: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconButton: {
    padding: 6,
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#333', // Color más oscuro
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardMessage: {
    fontSize: 14,
    color: '#333', // Color más oscuro
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelRideButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  cancelRideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dragIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dragText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '400',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  conductorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  conductorPlate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000', // Negro sólido
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Fondo semi-transparente
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  conductorEta: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  minimizedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  minimizedIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    marginHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  compactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  routesContainer: {
    marginBottom: 10,
  },
  routesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  routeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    marginRight: 10,
  },
  routeButtonSelected: {
    backgroundColor: '#007AFF',
  },
  routeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  routeTextSelected: {
    color: '#fff',
  },
  tripInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripInfoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  currencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
  },
  currencyActive: {
    backgroundColor: '#007AFF',
  },
  currencyText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  currencyTextActive: {
    color: '#fff',
  },
  requestButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  requestButtonDisabled: {
    opacity: 0.7,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  menuItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  menuText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  menuTextActive: {
    color: '#007AFF',
  },
  conductorDetails: {
    flex: 1,
    marginRight: 10,
  },
  vehicleDetails: {
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  vehicleColor: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  etaContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  conductorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    alignSelf: 'flex-start', // Para que el fondo se ajuste al texto
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Fondo blanco semitransparente
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    overflow: 'hidden',
  },
  paymentCurrencyContainer: {
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  paymentCurrencyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  paymentCurrencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentCurrencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 21,
    alignItems: 'center',
  },
  paymentCurrencyActive: {
    backgroundColor: '#007AFF',
  },
  paymentCurrencyText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentCurrencyTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentMethodContainer: {
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  paymentMethodScroll: {
    flexDirection: 'row',
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethodActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentMethodIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
});