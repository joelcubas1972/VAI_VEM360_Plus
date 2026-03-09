import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

// Sugerencias de ejemplo (después conectarías con Google Places API)
const suggestions = [
  { id: '1', name: 'Av. Brasil 123, Pedro Juan Caballero', lat: -22.5327, lng: -55.7333 },
  { id: '2', name: 'Rua 7 de Setembro 456, Ponta Porã', lat: -22.5361, lng: -55.7256 },
  { id: '3', name: 'Shopping China, Ponta Porã', lat: -22.5340, lng: -55.7280 },
  { id: '4', name: 'Universidad Nacional, PJC', lat: -22.5290, lng: -55.7380 },
];

export default function BuscarScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState(suggestions);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('hybrid');
  const [region, setRegion] = useState({
    latitude: -22.5327,
    longitude: -55.7333,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Filtrar sugerencias mientras escribe
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (text.length > 2) {
      const filtered = suggestions.filter(item => 
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
  };

  // Seleccionar una sugerencia
  const handleSelectSuggestion = (item: any) => {
    setSelectedLocation(item);
    setSearchText(item.name);
    setFilteredSuggestions([]);
    setRegion({
      latitude: item.lat,
      longitude: item.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  // Confirmar destino y volver a index.tsx
  const handleConfirmDestination = () => {
    if (selectedLocation) {
      router.push({
        pathname: '/(tabs)/mapa',
        params: {
          destination: JSON.stringify({
            name: selectedLocation.name,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
          })
        }
      });
    } else {
      alert('Por favor seleccioná un destino');
    }
  };

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
        onPress={(e) => {
          const coord = e.nativeEvent.coordinate;
          setSelectedLocation({
            id: 'manual',
            name: `Punto seleccionado`,
            lat: coord.latitude,
            lng: coord.longitude,
          });
        }}
      >
        {selectedLocation && (
          <Marker
            coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
            pinColor="#007AFF"
          />
        )}
      </MapView>

      {/* Barra de búsqueda */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.searchContainer}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar dirección..."
            value={searchText}
            onChangeText={handleSearchChange}
            placeholderTextColor="#999"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de sugerencias */}
        {filteredSuggestions.length > 0 && searchText.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={filteredSuggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Ionicons name="location" size={20} color="#007AFF" />
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Botón confirmar */}
        {selectedLocation && (
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirmDestination}
          >
            <Text style={styles.confirmButtonText}>Confirmar destino</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
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
    top: 60,
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
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 15,
    right: 15,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 15,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});