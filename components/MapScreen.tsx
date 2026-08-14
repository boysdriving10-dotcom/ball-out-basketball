
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import CourtService, { Court, MapBounds } from '@/services/CourtService';

const DEFAULT_REGION: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const DEBOUNCE_MS = 400;

function regionToBounds(region: Region): MapBounds {
  return {
    south: region.latitude - region.latitudeDelta / 2,
    north: region.latitude + region.latitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
  };
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBoundsRef = useRef<string>('');

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const loadCourtsForRegion = useCallback(async (nextRegion: Region) => {
    const bounds = regionToBounds(nextRegion);
    const boundsKey = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

    if (boundsKey === latestBoundsRef.current) {
      return;
    }
    latestBoundsRef.current = boundsKey;

    setLoading(true);
    setError(null);

    try {
      const results = await CourtService.fetchCourtsForBounds(bounds);
      setCourts(results);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load courts right now.';
      setError(message);
      setCourts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleCourtFetch = useCallback(
    (nextRegion: Region) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        loadCourtsForRegion(nextRegion);
      }, DEBOUNCE_MS);
    },
    [loadCourtsForRegion]
  );

  const centerOnUser = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        latestBoundsRef.current = '';
        loadCourtsForRegion(DEFAULT_REGION);
        return;
      }

      setLocationDenied(false);

      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 10000)
        ),
      ]);

      const nextRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      mapRef.current?.animateToRegion(nextRegion, 500);
      setRegion(nextRegion);
      latestBoundsRef.current = '';
      loadCourtsForRegion(nextRegion);
    } catch (locationError) {
      console.log('Error getting location:', locationError);
      setLocationDenied(true);
      latestBoundsRef.current = '';
      loadCourtsForRegion(region);
    }
  };

  useEffect(() => {
    centerOnUser();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
    scheduleCourtFetch(nextRegion);
  };

  const retryFetch = () => {
    latestBoundsRef.current = '';
    loadCourtsForRegion(region);
  };

  const openInNativeMap = (court: Court) => {
    const label = CourtService.getCourtLocationLabel(court);

    if (Platform.OS === 'ios') {
      const url = `http://maps.apple.com/?q=${encodeURIComponent(label)}&ll=${court.latitude},${court.longitude}`;
      Linking.openURL(url);
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${court.latitude},${court.longitude}`;
      Linking.openURL(url);
    }
  };

  const renderCourtListContent = () => {
    if (loading && courts.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#FF6B35" />
          <Text style={styles.stateText}>Searching for courts...</Text>
        </View>
      );
    }

    if (error && courts.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!loading && !error && courts.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            No basketball courts found in this area. Try moving the map or tapping 📍 to recenter.
          </Text>
        </View>
      );
    }

    return courts.map((court) => (
      <TouchableOpacity
        key={court.id}
        style={styles.courtItem}
        onPress={() => openInNativeMap(court)}
      >
        <Text style={styles.courtName}>{court.name}</Text>
        <Text style={styles.courtAddress}>{court.address}</Text>
        {(court.rating != null || court.activeGames != null) && (
          <View style={styles.courtStats}>
            {court.rating != null && (
              <Text style={styles.rating}>⭐ {court.rating}</Text>
            )}
            {court.activeGames != null && (
              <Text style={styles.activeGames}>
                🏀 {court.activeGames} active games
              </Text>
            )}
          </View>
        )}
        <Text style={styles.tapToOpen}>
          {Platform.OS === 'ios'
            ? '📍 Tap to open in Apple Maps'
            : '📍 Tap to open in Google Maps'}
        </Text>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {courts.map((court) => (
            <Marker
              key={court.id}
              coordinate={{
                latitude: court.latitude,
                longitude: court.longitude,
              }}
              title={court.name}
              description={court.address}
              pinColor="#FF6B35"
            />
          ))}
        </MapView>

        {loading && courts.length > 0 && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.loadingBannerText}>Updating courts...</Text>
          </View>
        )}

        {locationDenied && (
          <View style={styles.locationBanner}>
            <Text style={styles.locationBannerText}>
              Location access is off. Showing default map area.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
          <Text style={styles.locationButtonText}>📍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.courtsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.courtsTitle}>🏀 Nearby Courts</Text>
        {renderCourtListContent()}
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
  map: {
    flex: 1,
  },
  loadingBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loadingBannerText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
  },
  locationBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 80,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationBannerText: {
    color: '#fff',
    fontSize: 12,
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
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  stateText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
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
