import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ReservarMudanzaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reservar Mudanza</Text>
      <Text>Próximamente...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});