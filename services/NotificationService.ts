
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

const BACKGROUND_FETCH_TASK = 'background-game-check';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface GameLocation {
  id: string;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  time: string;
  organizer: string;
  spotsLeft: number;
}

class NotificationService {
  private static instance: NotificationService;
  private notificationToken: string | null = null;
  private isLocationTrackingEnabled = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Add methods to make them accessible on the instance
  async startListeningForNearbyGames(location: Location.LocationObject, games: any[]) {
    try {
      if (Platform.OS === 'web') {
        console.log('Background location tracking not supported on web');
        return;
      }
      
      await this.enableLocationTracking();
      console.log('Started listening for nearby games');
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  }

  stopListening() {
    try {
      this.isLocationTrackingEnabled = false;
      console.log('Stopped listening for nearby games');
    } catch (error) {
      console.log('Error stopping location tracking:', error);
    }
  }

  async initialize() {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Get notification token
    if (Platform.OS === 'ios') {
      this.notificationToken = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      this.notificationToken = (await Notifications.getExpoPushTokenAsync()).data;
    }

    // Register background task
    await this.registerBackgroundTask();
    
    return true;
  }

  async enableLocationTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission not granted');
      return false;
    }

    const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus.status !== 'granted') {
      console.log('Background location permission not granted');
      return false;
    }

    this.isLocationTrackingEnabled = true;
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    return true;
  }

  async registerBackgroundTask() {
    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      try {
        if (!this.isLocationTrackingEnabled) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const nearbyGames = await this.checkForNearbyGames(
          location.coords.latitude,
          location.coords.longitude
        );

        if (nearbyGames.length > 0) {
          await this.sendGameNotifications(nearbyGames);
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('Background task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  async checkForNearbyGames(userLat: number, userLon: number, radiusMiles: number = 10): Promise<GameLocation[]> {
    // This would typically fetch from your backend API
    // For now, using mock data similar to your existing games
    const MOCK_GAMES: GameLocation[] = [
      {
        id: '1',
        title: '3v3 Pickup Game',
        location: 'Central Park Basketball Court',
        latitude: 40.7829,
        longitude: -73.9654,
        time: '6:00 PM • Today',
        organizer: 'Mike',
        spotsLeft: 3,
      },
      {
        id: '2',
        title: '5v5 Full Court',
        location: 'Downtown Community Center',
        latitude: 40.7580,
        longitude: -73.9855,
        time: '7:30 PM • Tomorrow',
        organizer: 'Sarah',
        spotsLeft: 4,
      },
    ];

    // Filter games within radius
    return MOCK_GAMES.filter(game => {
      const distance = this.calculateDistance(userLat, userLon, game.latitude, game.longitude);
      return distance <= radiusMiles;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async sendGameNotifications(games: GameLocation[]) {
    for (const game of games) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏀 New Basketball Game Nearby!',
          body: `${game.title} at ${game.location} - ${game.spotsLeft} spots left!`,
          data: { 
            gameId: game.id,
            latitude: game.latitude,
            longitude: game.longitude,
            location: game.location
          },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    }
  }

  async sendInstantNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null,
    });
  }

  async scheduleGameReminder(gameId: string, gameTitle: string, gameTime: string, minutesBefore: number = 30) {
    const trigger = new Date();
    trigger.setMinutes(trigger.getMinutes() + minutesBefore);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏀 Game Starting Soon!',
        body: `${gameTitle} starts in ${minutesBefore} minutes`,
        data: { gameId, type: 'reminder' },
        sound: 'default',
      },
      trigger,
    });
  }

  getNotificationToken(): string | null {
    return this.notificationToken;
  }
}

// Create and export a singleton instance
const notificationService = NotificationService.getInstance();
export default notificationService;
