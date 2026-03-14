import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

const translations = {
  es: {
    title: 'Bienvenido a VAI-VEM360+',
    subtitle: 'Tu solución de movilidad en la frontera',
    button: 'Comenzar',
    back: 'Volver',
    hint: 'Toque un servicio para ver su explicación',
  },
  pt: {
    title: 'Bem-vindo ao VAI-VEM360+',
    subtitle: 'Sua solução de mobilidade na fronteira',
    button: 'Começar',
    back: 'Voltar',
    hint: 'Toque em um serviço para ver sua explicação',
  }
};

const services = [
  { id: 'uber', title: { es: 'Uber', pt: 'Uber' }, icon: 'car', color: '#4CAF50', desc: { es: 'Traslado en auto cómodo.', pt: 'Transporte em carro confortável.' } },
  { id: 'uber_mujer', title: { es: 'Uber Mujer', pt: 'Uber Mulher' }, icon: 'car', color: '#E91E63', desc: { es: 'Conductoras mujeres.', pt: 'Motoristas mulheres.' } },
  { id: 'mototaxi', title: { es: 'Mototaxi', pt: 'Mototáxi' }, icon: 'bicycle', color: '#2196F3', desc: { es: 'Traslado rápido en moto.', pt: 'Transporte rápido em moto.' } },
  { id: 'delivery', title: { es: 'Delivery', pt: 'Delivery' }, icon: 'bicycle', color: '#FF9800', desc: { es: 'Envío de paquetes.', pt: 'Entrega de pacotes.' } },
  { id: 'compra', title: { es: 'Compra y traslado', pt: 'Compra e transporte' }, icon: 'cart', color: '#9C27B0', desc: { es: 'Compramos y llevamos.', pt: 'Compramos e levamos.' } },
  { id: 'grua', title: { es: 'Grúa', pt: 'Guincho' }, icon: 'car-sport', color: '#FF5722', desc: { es: 'Asistencia vehicular.', pt: 'Assistência veicular.' } },
  { id: 'mudanza', title: { es: 'Mudanza', pt: 'Mudança' }, icon: 'cube', color: '#795548', desc: { es: 'Transporte de muebles.', pt: 'Transporte de móveis.' } },
];

export default function WelcomeScreen() {
  const [language, setLanguage] = useState<'es' | 'pt'>('es');
  const [selected, setSelected] = useState<typeof services[0] | null>(null);
  const scheme = useColorScheme(); // dark o light

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    (async () => {
      const saved = await AsyncStorage.getItem('appLanguage');
      if (saved === 'es' || saved === 'pt') setLanguage(saved);
    })();
  }, [fadeAnim, scaleAnim]);

  const changeLanguage = async (lang: 'es' | 'pt') => {
    setLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
  };

  const handleComenzar = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    router.push('/(auth)/login');
  };

  const t = translations[language];

  const isDark = scheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111' : '#f5f5f5'}
      />

      <View style={styles.languageSelector}>
        <TouchableOpacity
          style={[styles.langButton, language === 'es' && styles.langActive]}
          onPress={() => changeLanguage('es')}
        >
          <Text style={[styles.langText, language === 'es' && styles.langTextActive]}>
            🇵🇾 Español
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langButton, language === 'pt' && styles.langActive]}
          onPress={() => changeLanguage('pt')}
        >
          <Text style={[styles.langText, language === 'pt' && styles.langTextActive]}>
            🇧🇷 Português
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.logoText}>🚗</Text>
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: fadeAnim }, isDark && styles.textDark]}>
          {t.title}
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }, isDark && styles.textDark]}>
          {t.subtitle}
        </Animated.Text>

        <Text style={[styles.hint, isDark && styles.textDark]}>{t.hint}</Text>

        <View style={styles.servicesGrid}>
          {services.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceItem, { borderColor: service.color }, isDark && styles.serviceItemDark]}
              onPress={() => setSelected(service)}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons name={service.icon as any} size={40} color={service.color} />
              </Animated.View>
              <Text style={[styles.serviceText, isDark && styles.textDark]}>
                {service.title[language]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected ? (
          <Animated.View style={[styles.descriptionBox, isDark && styles.descriptionBoxDark]}>
            <Text style={[styles.descriptionTitle, isDark && styles.textDark]}>
              {selected.title[language]}
            </Text>
            <Text style={[styles.description, isDark && styles.textDark]}>
              {selected.desc[language]}
            </Text>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.backText}>{t.back}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleComenzar}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t.button}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#111',
  },
  textDark: {
    color: '#fff',
  },
  languageSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  langButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  langActive: {
    backgroundColor: '#007AFF',
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  langTextActive: {
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 80,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.04,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  serviceItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
  },
  serviceItemDark: {
    backgroundColor: '#222',
  },
  serviceText: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  descriptionBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
  },
  descriptionBoxDark: {
    backgroundColor: '#222',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});