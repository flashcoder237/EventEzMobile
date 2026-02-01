import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'EventDetails'>;

export default function EventDetailsScreen() {
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Détails de l'événement</Text>
      <Text style={styles.id}>ID: {eventId}</Text>
      <Text style={styles.placeholder}>
        Cet écran affichera les détails complets de l'événement
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  id: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
});
