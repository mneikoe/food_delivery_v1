import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FoodCard({ name, price }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.price}>₹ {price}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  price: {
    marginTop: 6,
    color: '#FF6A00',
    fontWeight: '600',
  },
});
