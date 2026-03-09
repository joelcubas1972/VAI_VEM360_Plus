import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
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
import { auth } from '../../src/services/firebaseConfig';

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

export default function MapaScreen() {
  const { t, language } = useTranslation();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const servicioSeleccionado = params.servicio as string || 'taxi';

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
      onPanResponderRelease: () => {},
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

  // Datos de ejemplo
  const allNearbyCars = [
    { id: 1, type: 'taxi', service: 'taxi', lat: -22.5327, lng: -55.7333, driver: 'Carlos', eta: 3, favorite: true, plate: 'ABC-123', rating: 4.8, disponible: true },
    { id: 2, type: 'taxi', service: 'taxi', lat: -22.5340, lng: -55.7350, driver: 'Maria', eta: 5, favorite: false, plate: 'DEF-456', rating: 4.5, disponible: true },
    { id: 3, type: 'taxi', service: 'taxi', lat: -22.5310, lng: -55.7320, driver: 'Juan', eta: 2, favorite: false, plate: 'GHI-789', rating: 4.9, disponible: true },
  ];

  const nearbyCars = allNearbyCars.filter(car => car.service === servicioSeleccionado);

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
      taxi: { base: 15, km: 1.5, min: 0.3 },
      uber_mujer: { base: 18, km: 1.8, min: 0.35 },
      mototaxi: { base: 10, km: 1.2, min: 0.2 },
      grua: { base: 30, km: 3.5, min: 0.5 },
      mudanza: { base: 50, km: 2.5, min: 1 },
      delivery: { base: 8, km: 1, min: 0.1 },
      compra: { base: 12, km: 1.2, min: 0.15 }
    };

    const service = services[servicioSeleccionado] || services.taxi;
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

      // 🚫 ELIMINADO: mapRef.current.fitToCoordinates - YA NO HACE ZOOM AUTOMÁTICO
      
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
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

  const buscarConductorAutomatico = () => {
    if (!destination || nearbyCars.length === 0) {
      mostrarTarjeta("Error", "No hay conductores disponibles en este momento", 'error');
      return;
    }

    if (!region) {
      mostrarTarjeta("Error", "No se pudo obtener tu ubicación", 'error');
      return;
    }

    setBuscandoConductor(true);
    setConductorAsignado(null);
    setConductoresContactados([]);

    const conductoresConDistancia = nearbyCars.map(conductor => {
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
        
        const acepta = indiceActual === 1;
        
        if (acepta) {
          setConductorAsignado(conductor);
          setBuscandoConductor(false);
          setTiempoRestante(0);
          
          mostrarTarjeta(
            "✅ Viaje asignado",
            `${conductor.driver}\n${conductor.plate}\nLlega en ${conductor.etaCalculado} min`,
            'success',
            conductor
          );
        } else {
          mostrarTarjeta(
            "⏳ No disponible",
            `${conductor.driver} no aceptó`,
            'info'
          );
          indiceActual++;
          contactarSiguienteConductor();
        }
      }, TIEMPO_ESPERA * 1000);
    };

    contactarSiguienteConductor();
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
      mostrarTarjeta("Asignado", `Conductor: ${conductorAsignado.driver}`, 'success');
      return;
    }

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

      {/* Mapa - SIN ZOOM AUTOMÁTICO */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType={mapType}
          // 🚫 SIN fitToCoordinates - el zoom NO cambia automáticamente
        >
          {nearbyCars.map((car) => (
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

      {/* Tarjeta flotante MODERNA - estilo iOS/macOS */}
      {cardVisible && cardContent && (
        <Animated.View 
          style={[
            styles.floatingCard,
            cardContent.tipo === 'success' && styles.cardSuccess,
            cardContent.tipo === 'error' && styles.cardError,
            cardContent.tipo === 'contactando' && styles.cardContactando,
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
                  {cardContent.tipo === 'success' && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
                  {cardContent.tipo === 'error' && <Ionicons name="alert-circle" size={20} color="#FF3B30" />}
                  {cardContent.tipo === 'contactando' && <Ionicons name="sync" size={20} color="#007AFF" />}
                  {cardContent.tipo === 'info' && <Ionicons name="information-circle" size={20} color="#007AFF" />}
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {cardMinimized ? '📌' : cardContent.titulo}
                  </Text>
                </View>
                <View style={styles.cardHeaderRight}>
                  <TouchableOpacity onPress={toggleMinimizar} style={styles.cardIconButton}>
                    <Ionicons 
                      name={cardMinimized ? "expand" : "contract"} 
                      size={18} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={ocultarTarjeta} style={styles.cardIconButton}>
                    <Ionicons name="close" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {!cardMinimized && (
                <>
                  <Text style={styles.cardMessage}>{cardContent.mensaje}</Text>
                  
                  {cardContent.tipo === 'contactando' && (
                    <>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((7 - tiempoRestante) / 7) * 100}%` }]} />
                      </View>
                      <TouchableOpacity 
                        style={styles.cardButton}
                        onPress={cancelarBusqueda}
                      >
                        <Text style={styles.cardButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {cardContent.tipo === 'success' && cardContent.conductor && (
                    <>
                      <View style={styles.conductorInfo}>
                        <Text style={styles.conductorPlate}>{cardContent.conductor.plate}</Text>
                        <Text style={styles.conductorEta}>⏱️ {cardContent.conductor.etaCalculado} min</Text>
                      </View>
                      
                      {/* Botón de cancelar viaje con temporizador de 30 segundos */}
                      {puedeCancelar && (
                        <TouchableOpacity 
                          style={styles.cancelRideButton}
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
                    <Text style={styles.dragText}>Arrastra para mover</Text>
                  </View>
                </>
              )}

              {cardMinimized && (
                <View style={styles.minimizedContent}>
                  {cardContent.tipo === 'success' && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                  {cardContent.tipo === 'error' && <Ionicons name="alert-circle" size={24} color="#FF3B30" />}
                  {cardContent.tipo === 'contactando' && <Ionicons name="sync" size={24} color="#007AFF" />}
                  {cardContent.tipo === 'info' && <Ionicons name="information-circle" size={24} color="#007AFF" />}
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

        {/* Botón de cancelar viaje (solo visible durante búsqueda) */}
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

            <View style={styles.currencyContainer}>
              {Object.keys(currencySymbols).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyButton,
                    selectedCurrency === curr && styles.currencyActive
                  ]}
                  onPress={() => setSelectedCurrency(curr as any)}
                >
                  <Text style={[
                    styles.currencyText,
                    selectedCurrency === curr && styles.currencyTextActive
                  ]}>
                    {currencySymbols[curr as keyof typeof currencySymbols]} {curr}
                  </Text>
                </TouchableOpacity>
              ))}
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
  // Botón de cancelar búsqueda (fuera de la tarjeta)
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
  // Tarjeta flotante MODERNA - estilo iOS/macOS
  floatingCard: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Más transparente
    borderRadius: 24, // Más redondeado
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(20px)', // Efecto blur (en iOS)
  },
  cardMinimized: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardSuccess: {
    borderLeftWidth: 0,
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  cardError: {
    borderLeftWidth: 0,
    borderTopWidth: 3,
    borderTopColor: '#FF3B30',
  },
  cardContactando: {
    borderLeftWidth: 0,
    borderTopWidth: 3,
    borderTopColor: '#007AFF',
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconButton: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cardMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '400',
  },
  cardButton: {
    backgroundColor: '#FF3B30',
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
  // Botón de cancelar viaje dentro de la tarjeta
  cancelRideButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
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
    color: '#999',
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
    backgroundColor: '#007AFF',
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
    fontWeight: '600',
    color: '#333',
  },
  conductorEta: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  minimizedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
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
});