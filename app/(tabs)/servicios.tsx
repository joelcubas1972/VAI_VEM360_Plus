import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const servicesList = [
  { 
    id: 'taxi', 
    title: 'Taxi / Uber', 
    icon: 'car', 
    color: '#4CAF50',
    description: 'Traslado en auto cómodo y seguro',
    longDescription: 'Conductores profesionales, autos con aire acondicionado, viajes dentro de la ciudad y entre ciudades.',
    availability: '24/7',
    features: ['Aire acondicionado', 'Conductores bilingües', 'Seguro de viaje']
  },
  { 
    id: 'uber_mujer', 
    title: 'Uber Mujer', 
    icon: 'woman', 
    color: '#E91E63',
    description: 'Conductoras mujeres para mayor confianza',
    longDescription: 'Exclusivo para pasajeras que prefieren conductoras. Viajes seguros y confiables.',
    availability: '24/7',
    features: ['Conductoras mujeres', 'Viajes exclusivos', 'Atención personalizada']
  },
  { 
    id: 'mototaxi', 
    title: 'Mototaxi', 
    icon: 'bicycle', 
    color: '#2196F3',
    description: 'Traslado rápido en moto',
    longDescription: 'Ideal para distancias cortas, económico y ágil. Perfecto para evitar el tráfico.',
    availability: '24/7',
    features: ['Rápido', 'Económico', 'Fácil estacionamiento']
  },
  { 
    id: 'delivery', 
    title: 'Delivery', 
    icon: 'cube', 
    color: '#FF9800',
    description: 'Envío de paquetes y documentos',
    longDescription: 'Entregas rápidas en la ciudad. Hacemos llegar tus paquetes de forma segura.',
    availability: '08:00 - 22:00',
    features: ['Seguimiento en tiempo real', 'Paquetes hasta 5kg', 'Confirmación de entrega']
  },
  { 
    id: 'compra', 
    title: 'Compra y traslado', 
    icon: 'cart', 
    color: '#9C27B0',
    description: 'Hacemos tus compras y las llevamos',
    longDescription: 'Mercado, farmacia, lo que necesites. Te ayudamos con tus compras diarias.',
    availability: '08:00 - 20:00',
    features: ['Lista de compras', 'Pago en efectivo', 'Entrega en domicilio']
  },
  { 
    id: 'grua', 
    title: 'Grúa / Mecánico', 
    icon: 'car-sport', 
    color: '#FF5722',
    description: 'Asistencia vehicular inmediata',
    longDescription: 'Grúa, cambio de neumáticos, batería, lo que necesites para tu vehículo.',
    availability: '24/7',
    features: ['Respuesta rápida', 'Mecánico a domicilio', 'Servicio de grúa']
  },
  { 
    id: 'mudanza', 
    title: 'Mudanza', 
    icon: 'cube', 
    color: '#795548',
    description: 'Transporte de muebles y pertenencias',
    longDescription: 'Camiones de diferentes tamaños, presupuesto sin cargo. Mudanzas locales e interurbanas.',
    availability: 'Con reserva',
    features: ['Camiones varios', 'Ayudantes disponibles', 'Presupuesto sin cargo']
  },
];

export default function ServiciosScreen() {
  const [selectedService, setSelectedService] = useState<typeof servicesList[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectService = (service: typeof servicesList[0]) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const handleContinue = () => {
    setModalVisible(false);
    router.push({
      pathname: '/(tabs)/mapa',
      params: { servicio: selectedService?.id }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VAI-VEM360+</Text>
        <Text style={styles.headerSubtitle}>¿Qué servicio necesitas hoy?</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.servicesGrid}>
          {servicesList.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, { borderColor: service.color }]}
              onPress={() => handleSelectService(service)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceHeader}>
                <View style={[styles.serviceIconContainer, { backgroundColor: service.color }]}>
                  <Ionicons name={service.icon as any} size={30} color="#fff" />
                </View>
                <View style={styles.serviceTitleContainer}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceAvailability}>{service.availability}</Text>
                </View>
              </View>
              
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {service.description}
              </Text>
              
              <View style={styles.serviceFooter}>
                <Text style={styles.serviceMoreInfo}>Toca para más info</Text>
                <Ionicons name="chevron-forward" size={20} color={service.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal de información del servicio */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, selectedService && { borderColor: selectedService.color }]}>
            {selectedService && (
              <>
                <View style={[styles.modalHeader, { backgroundColor: selectedService.color }]}>
                  <Ionicons name={selectedService.icon as any} size={40} color="#fff" />
                  <Text style={styles.modalTitle}>{selectedService.title}</Text>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalDescription}>
                    {selectedService.longDescription}
                  </Text>

                  <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Características:</Text>
                    {selectedService.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={selectedService.color} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={20} color="#666" />
                    <Text style={styles.infoText}>Disponibilidad: {selectedService.availability}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="cash" size={20} color="#666" />
                    <Text style={styles.infoText}>Tarifa base: Desde R$ 15,00</Text>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Volver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.continueButton, { backgroundColor: selectedService.color }]}
                    onPress={handleContinue}
                  >
                    <Text style={styles.continueButtonText}>Continuar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  serviceAvailability: {
    fontSize: 12,
    color: '#999',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  serviceMoreInfo: {
    fontSize: 12,
    color: '#999',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 3,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 15,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#007AFF',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});