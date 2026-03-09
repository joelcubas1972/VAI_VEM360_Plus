import { useState } from 'react';
import { Currency, formatPrice } from '../utils/currency';

const BASE_RATE_BRL_PER_KM = 2; // 2 reales por km

// Función Haversine para calcular distancia entre dos puntos [citation:5]
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function useRouteCalculator() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('BRL');

  // Calcular precio basado en distancia
  const calculatePrice = (distanceKm: number): number => {
    return distanceKm * BASE_RATE_BRL_PER_KM;
  };

  // Buscar conductor según algoritmo
  const findBestDriver = (
    userLocation: { lat: number; lng: number },
    drivers: any[],
    favorites: string[]
  ) => {
    // 1. Calcular distancia a cada conductor
    const driversWithDistance = drivers.map(driver => ({
      ...driver,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        driver.lat,
        driver.lng
      ),
    }));

    // 2. Separar favoritos y no favoritos
    const favoriteDrivers = driversWithDistance.filter(d => favorites.includes(d.id));
    const otherDrivers = driversWithDistance.filter(d => !favorites.includes(d.id));

    // 3. Ordenar por cercanía
    favoriteDrivers.sort((a, b) => a.distance - b.distance);
    otherDrivers.sort((a, b) => a.distance - b.distance);

    // 4. Combinar: favoritos primero, luego otros
    return [...favoriteDrivers, ...otherDrivers];
  };

  return {
    calculatePrice,
    formatPrice: (amount: number) => formatPrice(amount, selectedCurrency),
    selectedCurrency,
    setSelectedCurrency,
    findBestDriver,
    calculateDistance,
  };
}