import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface GamePost {
  id: string;
  title: string;
  location: string;
  time: string;
  date: string;
  players: string;
  organizer: string;
  organizerId: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  spotsLeft: number;
  totalSpots: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  removed?: boolean;
}

const GAMES_KEY = 'ballout_user_games';

class GameService {
  private static instance: GameService;

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  async getGames(): Promise<GamePost[]> {
    try {
      const raw = await AsyncStorage.getItem(GAMES_KEY);
      const games: GamePost[] = raw ? JSON.parse(raw) : [];
      return games.filter((g) => !g.removed);
    } catch {
      return [];
    }
  }

  async getAllGamesIncludingRemoved(): Promise<GamePost[]> {
    try {
      const raw = await AsyncStorage.getItem(GAMES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveGames(games: GamePost[]): Promise<void> {
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games));
  }

  async createGame(
    input: Omit<GamePost, 'id' | 'createdAt' | 'removed'>
  ): Promise<GamePost> {
    const game: GamePost = {
      ...input,
      id: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${input.organizerId}-${input.title}-${Date.now()}`
      ),
      createdAt: new Date().toISOString(),
      removed: false,
    };

    const games = await this.getAllGamesIncludingRemoved();
    games.unshift(game);
    await this.saveGames(games);
    return game;
  }

  async removeGame(gameId: string): Promise<boolean> {
    const games = await this.getAllGamesIncludingRemoved();
    const index = games.findIndex((g) => g.id === gameId);
    if (index === -1) return false;
    games[index] = { ...games[index], removed: true };
    await this.saveGames(games);
    return true;
  }

  async purgeUserGames(userId: string): Promise<void> {
    const games = await this.getAllGamesIncludingRemoved();
    await this.saveGames(games.filter((g) => g.organizerId !== userId));
  }

  async joinGame(gameId: string): Promise<GamePost | null> {
    const games = await this.getAllGamesIncludingRemoved();
    const index = games.findIndex((g) => g.id === gameId && !g.removed);
    if (index === -1) return null;

    const game = games[index];
    if (game.spotsLeft <= 0) return game;

    const filled = game.totalSpots - game.spotsLeft + 1;
    games[index] = {
      ...game,
      spotsLeft: game.spotsLeft - 1,
      players: `${filled}/${game.totalSpots} players`,
    };
    await this.saveGames(games);
    return games[index];
  }
}

export default GameService.getInstance();
