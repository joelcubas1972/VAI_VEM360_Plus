import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

export default function ConductorDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [region, setRegion] = useState({
    latitude: -22.5327,
    longitude: -55.7333,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Datos de ejemplo
  const earnings = 125000;
  const todayStats = {
    viajes: 8,
    rating: 4.9,
    km: 125,
  };

  const requests = [
    { id: 1, name: 'María', time: 3, type: 'taxi', from: 'Centro', to: 'Shopping', price: 25000 },
    { id: 2, name: 'Juan', time: 5, type: 'taxi', price: 22000 },
    { id: 3, name: 'Carlos', time: 8, type: 'grua', price: 45000 },
  ];

  const scheduledTrips = [
    { id: 1, date: 'Mañana 10:30', type: 'mudanza', location: 'PJC' },
  ];
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Header con estado */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
          <Text style={styles.statusText}>{isOnline ? 'EN LÍNEA' : 'DESCONECTADO'}</Text>
        </View>
        <View style={styles.earningsContainer}>
          <Text style={styles.earningsLabel}>Hoy</Text>
          <Text style={styles.earningsValue}>Gs {earnings.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.connectButton, isOnline ? styles.disconnectButton : styles.connectButtonStyle]}
          onPress={() => setIsOnline(!isOnline)}
        >
          <Text style={styles.connectButtonText}>
            {isOnline ? 'DESCONECTAR' : 'CONECTAR'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
        >
          {/* Marcadores de zonas calientes (simuladas) */}
          <Marker coordinate={{ latitude: -22.5327, longitude: -55.7333 }}>
            <View style={styles.heatMarker}>
              <Text style={styles.heatText}>🔥</Text>
            </View>
          </Marker>
        </MapView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Solicitud principal */}
        {isOnline && requests.length > 0 && (
          <View style={styles.mainRequest}>
            <Text style={styles.sectionTitle}>⏳ SOLICITUD ACTIVA</Text>
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>👤</Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{requests[0].name}</Text>
                    <Text style={styles.userTime}>⏱️ {requests[0].time} min</Text>
                  </View>
                </View>
                <Text style={styles.requestPrice}>Gs {requests[0].price}</Text>
              </View>
              <Text style={styles.requestRoute}>
                🚕 {requests[0].from || 'Centro'} → {requests[0].to || 'Shopping'}
              </Text>
              <View style={styles.requestActions}>
                <TouchableOpacity style={[styles.actionButton, styles.acceptButton]}>
                  <Text style={styles.actionButtonText}>✅ ACEPTAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
                  <Text style={[styles.actionButtonText, styles.rejectButtonText]}>❌ RECHAZAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Otras solicitudes (Trip Radar) */}
        {isOnline && requests.length > 1 && (
          <View style={styles.otherRequests}>
            <Text style={styles.sectionTitle}>👥 OTRAS SOLICITUDES</Text>
            {requests.slice(1).map((req) => (
              <TouchableOpacity key={req.id} style={styles.otherRequestCard}>
                <View style={styles.otherRequestLeft}>
                  <Text style={styles.otherRequestName}>{req.name}</Text>
                  <Text style={styles.otherRequestTime}>⏱️ {req.time} min</Text>
                </View>
                <View style={styles.otherRequestRight}>
                  <Text style={styles.otherRequestType}>
                    {req.type === 'taxi' ? '🚕' : req.type === 'grua' ? '🛻' : '🛵'}
                  </Text>
                  <Text style={styles.otherRequestPrice}>Gs {req.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Viajes programados */}
        {scheduledTrips.length > 0 && (
          <View style={styles.scheduledContainer}>
            <Text style={styles.sectionTitle}>📅 VIAJES PROGRAMADOS</Text>
            {scheduledTrips.map((trip) => (
              <View key={trip.id} style={styles.scheduledCard}>
                <Text style={styles.scheduledDate}>{trip.date}</Text>
                <Text style={styles.scheduledType}>
                  {trip.type === 'mudanza' ? '📦 Mudanza' : '🚕 Taxi'} - {trip.location}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Estadísticas rápidas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.viajes}</Text>
            <Text style={styles.statLabel}>Viajes hoy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.rating} ⭐</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.km} km</Text>
            <Text style={styles.statLabel}>Recorridos</Text>
          </View>
        </View>
      </ScrollView>

      {/* Menú inferior */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={[styles.menuText, styles.menuTextActive]}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="time" size={24} color="#999" />
          <Text style={styles.menuText}>Viajes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="cash" size={24} color="#999" />
          <Text style={styles.menuText}>Ganancias</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  earningsContainer: {
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 10,
    color: '#999',
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  connectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectButtonStyle: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: height * 0.25,
    width: width,
  },
  map: {
    flex: 1,
  },
  heatMarker: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    padding: 8,
    borderRadius: 20,
  },
  heatText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 70,
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
  requestPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  requestRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rejectButtonText: {
    color: '#FF3B30',
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
  otherRequestLeft: {
    flex: 1,
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
  otherRequestRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otherRequestType: {
    fontSize: 20,
  },
  otherRequestPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  scheduledContainer: {
    marginBottom: 15,
  },
  scheduledCard: {
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
  scheduledDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scheduledType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
});