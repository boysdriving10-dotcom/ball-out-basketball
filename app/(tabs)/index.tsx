import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Alert, ScrollView, TouchableOpacity, Dimensions, Animated, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const { width } = Dimensions.get('window');

interface Game {
  id: string;
  title: string;
  location: string;
  time: string;
  players: string;
  organizer: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  spotsLeft: number;
  totalSpots: number;
  latitude: number;
  longitude: number;
  distance?: number;
}

const MOCK_GAMES: Game[] = [
  {
    id: '1',
    title: '3v3 Pickup Game',
    location: 'Central Park Basketball Court',
    time: '6:00 PM • Today',
    players: '3/6 players',
    organizer: 'Mike',
    skillLevel: 'Intermediate',
    spotsLeft: 3,
    totalSpots: 6,
    latitude: 40.7829,
    longitude: -73.9654,
  },
  {
    id: '2',
    title: '5v5 Full Court',
    location: 'Downtown Community Center',
    time: '7:30 PM • Tomorrow',
    players: '6/10 players',
    organizer: 'Sarah',
    skillLevel: 'Advanced',
    spotsLeft: 4,
    totalSpots: 10,
    latitude: 40.7580,
    longitude: -73.9855,
  },
  {
    id: '3',
    title: 'Beginner Friendly Game',
    location: 'Westside Recreation Center',
    time: '5:00 PM • Saturday',
    players: '4/8 players',
    organizer: 'Alex',
    skillLevel: 'Beginner',
    spotsLeft: 4,
    totalSpots: 8,
    latitude: 40.7505,
    longitude: -74.0015,
  },
];

export default function HomeScreen() {
  const [games, setGames] = useState<Game[]>(MOCK_GAMES);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [joinedGameId, setJoinedGameId] = useState<string | null>(null);
  const [dailyVerse, setDailyVerse] = useState<any>(null);
  const [servicesLoaded, setServicesLoaded] = useState<boolean>(false);
  const bounceAnim = useMemo(() => new Animated.Value(0), []);
  const insets = useSafeAreaInsets();


  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Load services lazily after initial render
  useEffect(() => {
    const loadServices = async () => {
      try {
        // Lazy load services
        const [BibleVerseService, NotificationService] = await Promise.all([
          import('@/services/BibleVerseService'),
          import('@/services/NotificationService')
        ]);
        
        const verse = await BibleVerseService.default.getTodaysVerse();
        setDailyVerse(verse);
        setServicesLoaded(true);
      } catch (error) {
        console.log('Error loading services:', error);
        setServicesLoaded(true);
      }
    };

    // Delay service loading to prioritize UI rendering
    const timer = setTimeout(loadServices, 100);
    return () => clearTimeout(timer);
  }, []);

  // Request location permission and get user location
  useEffect(() => {
    const getLocationPermission = async () => {
      try {
        // Check if we're on web platform first
        if (Platform.OS === 'web') {
          setLocationPermission(false);
          setGames(MOCK_GAMES);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationPermission(false);
          setGames(MOCK_GAMES);
          return;
        }

        setLocationPermission(true);

        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 10000,
          });
          setUserLocation(location);

          // Calculate distances and sort games by proximity
          const gamesWithDistances = MOCK_GAMES.map(game => ({
            ...game,
            distance: calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              game.latitude,
              game.longitude
            )
          })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

          setGames(gamesWithDistances);

          // Initialize notification service lazily
          if (servicesLoaded) {
            const NotificationService = await import('@/services/NotificationService');
            try {
              await NotificationService.default.initialize();
              await NotificationService.default.startListeningForNearbyGames(location, gamesWithDistances);
            } catch (notificationError) {
              console.log('Notification service error:', notificationError);
            }
          }

        } catch (locationError) {
          console.log('Failed to get current location:', locationError);
          setLocationPermission(false);
          setGames(MOCK_GAMES);
        }

      } catch (error) {
        console.log('Error with location services:', error);
        setLocationPermission(false);
        setGames(MOCK_GAMES);
      }
    };

    // Delay location services to prioritize UI rendering
    const timer = setTimeout(getLocationPermission, 500);
    return () => clearTimeout(timer);
  }, [servicesLoaded]);

  useEffect(() => {
    const bounce = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => bounce());
    };
    
    // Start animation after a brief delay to prioritize initial render
    const timer = setTimeout(bounce, 200);
    return () => clearTimeout(timer);
  }, [bounceAnim]);

  const bounceTransform = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return ['#4A90E2', '#5BA0F2'];
      case 'Intermediate': return ['#FF8C00', '#FFA500'];
      case 'Advanced': return ['#DC143C', '#FF4500'];
      default: return ['#6C7B7F', '#8B9DC3'];
    }
  };

  const openDirections = (game: Game) => {
    const { latitude, longitude } = game;
    let url: string;

    if (Platform.OS === 'ios') {
      // Use Apple Maps URL scheme for iOS
      url = `http://maps.apple.com/?q=${encodeURIComponent(game.location)}&ll=${latitude},${longitude}&dirflg=d`;
    } else {
      // Use Google Maps for Android
      url = `geo:${latitude},${longitude}?q=${encodeURIComponent(game.location)}`;
    }

    Linking.openURL(url).catch(err => {
      console.error("Failed to open map URL:", err);
      Alert.alert('Error', 'Could not open directions. Please try again later.');
    });
  };

  const joinGame = useCallback((gameId: string) => {
    // Update the game state to reduce available spots
    const updatedGames = games.map(game => {
      if (game.id === gameId && game.spotsLeft > 0) {
        return {
          ...game,
          spotsLeft: game.spotsLeft - 1,
          players: `${game.totalSpots - game.spotsLeft + 1}/${game.totalSpots} players`
        };
      }
      return game;
    });

    setGames(updatedGames);
    setJoinedGameId(gameId);

    Alert.alert(
      '🎉 Awesome!',
      'You have successfully joined the game! Get ready to ball! 🏀\n\nRemember to review other players after the game to help build our community reputation system.',
      [
        {
          text: 'OK',
          onPress: () => console.log('User joined game:', gameId)
        }
      ]
    );
  }, [games]);

  // Show loading screen while services are initializing
  if (!servicesLoaded && Platform.OS !== 'web') {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.loadingEmoji}>🏀</ThemedText>
        <ThemedText style={styles.loadingText}>Loading your courts...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F4C75']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.headerContent, { transform: [{ translateY: bounceTransform }] }]}>
          <ThemedText style={styles.headerEmoji}>🏀</ThemedText>
          <ThemedText style={styles.headerTitle}>Pickup Basketball</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {locationPermission ? 'Games near you! 🔥' : 'Find your court, find your crew! 🔥'}
          </ThemedText>
        </Animated.View>

        {/* Floating bubbles */}
        <ThemedView style={styles.bubble1} />
        <ThemedView style={styles.bubble2} />
        <ThemedView style={styles.bubble3} />
      </LinearGradient>

      {/* Daily Bible Verse */}
      {dailyVerse && (
        <ThemedView style={styles.bibleVerseContainer}>
          <LinearGradient
            colors={['#2E2E3A', '#3A3A4A']}
            style={styles.bibleVerseCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedView style={styles.bibleVerseHeader}>
              <ThemedText style={styles.bibleVerseLabel}>📖 Daily Verse</ThemedText>
              <ThemedText style={styles.bibleVerseDateText}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </ThemedText>
            </ThemedView>
            <ThemedText style={styles.bibleVerseText}>"{dailyVerse.text}"</ThemedText>
            <ThemedText style={styles.bibleVerseReference}>— {dailyVerse.reference}</ThemedText>
          </LinearGradient>
        </ThemedView>
      )}

      {/* Quick Stats */}
      <ThemedView style={styles.statsContainer}>
        <ThemedView style={styles.statItem}>
          <ThemedText style={styles.statNumber}>12</ThemedText>
          <ThemedText style={styles.statLabel}>Games Today</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statItem}>
          <ThemedText style={styles.statNumber}>47</ThemedText>
          <ThemedText style={styles.statLabel}>Players Online</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statItem}>
          <ThemedText style={styles.statNumber}>8</ThemedText>
          <ThemedText style={styles.statLabel}>Courts Active</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Games List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>
            {locationPermission ? '🔥 Games Near You' : '🔥 Available Games'}
          </ThemedText>
        </ThemedView>

        {games.map((game, index) => (
          <ThemedView key={game.id} style={[styles.gameCard, { marginTop: index === 0 ? 16 : 12 }]}>
            {/* Card Header */}
            <ThemedView style={styles.gameHeader}>
              <ThemedText style={styles.gameTitle}>{game.title}</ThemedText>
              <LinearGradient
                colors={getSkillLevelColor(game.skillLevel)}
                style={styles.skillBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ThemedText style={styles.skillText}>{game.skillLevel}</ThemedText>
              </LinearGradient>
            </ThemedView>

            {/* Game Details */}
            <ThemedView style={styles.gameDetails}>
              <ThemedView style={styles.gameDetailRow}>
                <ThemedText style={styles.gameDetailIcon}>📍</ThemedText>
                <ThemedText style={styles.gameDetailText}>
                  {game.location}
                  {game.distance && (
                    <ThemedText style={styles.gameDetailHighlight}> • {game.distance.toFixed(1)} mi away</ThemedText>
                  )}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.gameDetailRow}>
                <ThemedText style={styles.gameDetailIcon}>⏰</ThemedText>
                <ThemedText style={styles.gameDetailText}>{game.time}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.gameDetailRow}>
                <ThemedText style={styles.gameDetailIcon}>👥</ThemedText>
                <ThemedText style={styles.gameDetailText}>{game.players}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.gameDetailRow}>
                <ThemedText style={styles.gameDetailIcon}>⭐</ThemedText>
                <ThemedText style={styles.gameDetailText}>Organized by {game.organizer}</ThemedText>
              </ThemedView>
            </ThemedView>

            {/* Progress and Join Button */}
            <ThemedView style={styles.gameActions}>
              <ThemedView style={styles.progressContainer}>
                <ThemedView style={styles.progressBar}>
                  <LinearGradient
                    colors={['#4A90E2', '#5BA0F2']}
                    style={[
                      styles.progressFill,
                      { width: `${((game.totalSpots - game.spotsLeft) / game.totalSpots) * 100}%` }
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </ThemedView>
                <ThemedText style={styles.progressText}>
                  🔥 {game.spotsLeft} spots left!
                </ThemedText>
              </ThemedView>

              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => joinGame(game.id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#0F4C75', '#3282B8']}
                  style={styles.joinButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ThemedText style={styles.joinButtonText}>🏀 JOIN GAME</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </ThemedView>

            {/* Directions Button - Show only if this game was the one joined */}
            {joinedGameId === game.id && (
              <TouchableOpacity
                style={[styles.joinButton, { marginTop: 12 }]}
                onPress={() => openDirections(game)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#4CAF50', '#8BC34A']} // Green gradient for directions
                  style={styles.joinButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ThemedText style={styles.joinButtonText}>🗺️ GET DIRECTIONS</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ThemedView>
        ))}

        {/* Map Call-to-Action */}
        <ThemedView style={styles.ctaContainer}>
          <LinearGradient
            colors={['#2E3440', '#434C5E']}
            style={styles.ctaCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={styles.ctaEmoji}>🗺️</ThemedText>
            <ThemedText style={styles.ctaTitle}>Find Courts Near You</ThemedText>
            <ThemedText style={styles.ctaSubtitle}>Explore all basketball courts in your area on the map!</ThemedText>
          </LinearGradient>
        </ThemedView>

        {/* Fun Call-to-Action */}
        <ThemedView style={styles.ctaContainer}>
          <LinearGradient
            colors={['#2E3440', '#434C5E']}
            style={styles.ctaCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={styles.ctaEmoji}>🚀</ThemedText>
            <ThemedText style={styles.ctaTitle}>Ready to Ball?</ThemedText>
            <ThemedText style={styles.ctaSubtitle}>Create your own game and get the squad together!</ThemedText>
          </LinearGradient>
        </ThemedView>

        {/* Bottom padding */}
        <ThemedView style={{ height: 120 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  headerEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  bubble1: {
    position: 'absolute',
    top: 20,
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bubble2: {
    position: 'absolute',
    top: 80,
    left: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bubble3: {
    position: 'absolute',
    bottom: 20,
    right: 60,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bibleVerseContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: -20,
    zIndex: 1,
  },
  bibleVerseCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  bibleVerseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  bibleVerseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  bibleVerseDateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bibleVerseText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  bibleVerseReference: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  gameCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  skillText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  gameDetails: {
    marginBottom: 12,
  },
  gameDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 2,
  },
  gameDetailIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 18,
  },
  gameDetailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    lineHeight: 16,
  },
  gameDetailHighlight: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  gameActions: {
    flexDirection: width < 400 ? 'column' : 'row',
    alignItems: width < 400 ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: width < 400 ? 12 : 0,
  },
  progressContainer: {
    flex: width < 400 ? 1 : 1,
    marginRight: width < 400 ? 0 : 16,
    marginBottom: width < 400 ? 12 : 0,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 6,
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 48,
    flex: 1,
  },
  joinButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  ctaContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  ctaCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});