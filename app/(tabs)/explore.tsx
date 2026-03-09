import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

export default function ExploreScreen() {
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('hybrid');
  const [region] = useState({
    latitude: -22.5327,
    longitude: -55.7333,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  return (
    <SafeAreaView style={styles.container}>
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
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType={mapType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: width,
    height: height,
  },
  mapTypeSelector: {
    flexDirection: 'row',
    position: 'absolute',
    top: 20,
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
});