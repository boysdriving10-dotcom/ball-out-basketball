
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Dimensions, Platform, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

type Court = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  activeGames: number;
};

const MOCK_COURTS: Court[] = [
  { id: '1', name: 'Central Park Basketball Court', latitude: 40.785091, longitude: -73.968285, address: '1000 5th Ave, New York, NY', rating: 4.5, activeGames: 3 },
  { id: '2', name: 'Brooklyn Bridge Park Court', latitude: 40.700292, longitude: -73.996453, address: '334 Furman St, Brooklyn, NY', rating: 4.2, activeGames: 2 },
  { id: '3', name: 'The Cage at West 4th', latitude: 40.731233, longitude: -74.002754, address: 'W 4th St, New York, NY', rating: 4.8, activeGames: 5 },
  { id: '4', name: "Wilton's Corner Court", latitude: 39.75339849692943, longitude: -74.97046005749134, address: 'Wilton Ave, Philadelphia, PA', rating: 4.0, activeGames: 1 },
  { id: '5', name: 'Mayapple Rd Court', latitude: 39.74309024523072, longitude: -75.01724368502401, address: 'Mayapple Rd, Philadelphia, PA', rating: 3.8, activeGames: 0 },
];

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const centerOnUser = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  useEffect(() => {
    centerOnUser();
  }, []);

  const getMapUrl = () => {
    const center = userLocation ? 
      `${userLocation.latitude},${userLocation.longitude}` : 
      '40.7128,-74.0060'; // Default to NYC
    
    if (Platform.OS === 'ios') {
      // Use Apple Maps for iOS
      const [lat, lng] = center.split(',');
      return `https://maps.apple.com/?ll=${lat},${lng}&z=12&t=m`;
    } else {
      // Use Google Maps for other platforms
      const markers = MOCK_COURTS.map(court => 
        `markers=color:red%7Clabel:${court.id}%7C${court.latitude},${court.longitude}`
      ).join('&');

      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO4YCVfNAcP-4Q&center=${center}&zoom=12&${markers}`;
    }
  };

  const openInNativeMap = (court: Court) => {
    if (Platform.OS === 'ios') {
      // Open in Apple Maps
      const url = `http://maps.apple.com/?q=${encodeURIComponent(court.name)}&ll=${court.latitude},${court.longitude}`;
      Linking.openURL(url);
    } else {
      // Open in Google Maps
      const url = `https://www.google.com/maps/search/?api=1&query=${court.latitude},${court.longitude}`;
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          source={{ uri: getMapUrl() }}
          style={styles.webview}
          allowsFullscreenVideo={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
        
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
          <Text style={styles.locationButtonText}>📍</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.courtsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.courtsTitle}>🏀 Nearby Courts</Text>
        {MOCK_COURTS.map(court => (
          <TouchableOpacity 
            key={court.id} 
            style={styles.courtItem}
            onPress={() => openInNativeMap(court)}
          >
            <Text style={styles.courtName}>{court.name}</Text>
            <Text style={styles.courtAddress}>{court.address}</Text>
            <View style={styles.courtStats}>
              <Text style={styles.rating}>⭐ {court.rating}</Text>
              <Text style={styles.activeGames}>🏀 {court.activeGames} active games</Text>
            </View>
            <Text style={styles.tapToOpen}>
              {Platform.OS === 'ios' ? '📍 Tap to open in Apple Maps' : '📍 Tap to open in Google Maps'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  locationButtonText: {
    fontSize: 20,
  },
  courtsList: {
    maxHeight: 250,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  courtsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 15,
    textAlign: 'center',
  },
  courtItem: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  courtName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  courtAddress: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  courtStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rating: {
    fontSize: 14,
    color: '#FFD700',
  },
  activeGames: {
    fontSize: 14,
    color: '#FF6B35',
  },
  tapToOpen: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
