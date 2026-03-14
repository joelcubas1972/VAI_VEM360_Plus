// app/(auth)/terms.tsx
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function TermsScreen() {
  const { role } = useLocalSearchParams();
  
  const termsContent = role === 'conductor' 
    ? `TÉRMINOS Y CONDICIONES PARA CONDUCTORES

1. REQUISITOS DEL CONDUCTOR
- Licencia de conducir vigente
- Vehículo en óptimas condiciones
- Documentación del vehículo al día
- Seguro de responsabilidad civil

2. RELACIÓN CON LA PLATAFORMA
El conductor es un socio independiente, no un empleado de Vai_vem360+. Como tal, es responsable de sus obligaciones fiscales y laborales.

3. OBLIGACIONES DEL CONDUCTOR
- Mantener el vehículo limpio y en buen estado
- Comportamiento respetuoso con los pasajeros
- Cumplir las leyes de tránsito
- No cancelar viajes injustificadamente

4. COMISIONES
La plataforma retendrá un porcentaje por cada viaje realizado como contraprestación por el servicio de intermediación.

5. SANCIONES
El incumplimiento de estas condiciones puede resultar en suspensión o eliminación de la cuenta.`
    : `TÉRMINOS Y CONDICIONES PARA USUARIOS

1. USO DE LA PLATAFORMA
Vai_vem360+ es una plataforma tecnológica que conecta usuarios con conductores independientes.

2. RESPONSABILIDAD DEL USUARIO
- Proporcionar información veraz
- Comportamiento respetuoso con el conductor
- No dejar objetos personales en el vehículo
- Pagar el servicio a través de la aplicación

3. CANCELACIONES
Las cancelaciones después de cierto tiempo pueden generar cargos. Consulta nuestra política de cancelación.

4. SEGURIDAD
- Verifica que el vehículo y conductor coincidan con la app
- Usa el cinturón de seguridad
- Reporta cualquier incidente a través de la app

5. PRIVACIDAD
Tus datos personales serán tratados conforme a nuestra política de privacidad y solo serán compartidos con el conductor necesario para el servicio.`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Términos y Condiciones</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.termsText}>{termsContent}</Text>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  closeButton: {
    fontSize: 24,
    color: '#007AFF'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    padding: 20
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333'
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});