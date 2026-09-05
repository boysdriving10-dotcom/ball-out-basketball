
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import SafetyService from '@/services/SafetyService';
import GameService from '@/services/GameService';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  gamesPlayed: number;
  createdAt: string;
  bio?: string;
  positions: string[];
  photos: string[];
  highlights: string[];
  profilePicture?: string;
  friends: string[];
  friendRequests: string[];
  sentFriendRequests: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<boolean>;
  acceptFriendRequest: (userId: string) => Promise<boolean>;
  rejectFriendRequest: (userId: string) => Promise<boolean>;
  removeFriend: (userId: string) => Promise<boolean>;
  searchUsers: (query: string) => Promise<User[]>;
  getAllUsers: () => Promise<User[]>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  bio?: string;
  positions: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'basketball_app_users';
const CURRENT_USER_KEY = 'basketball_app_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
  };

  const getUsers = async (): Promise<User[]> => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  };

  const saveUsers = async (users: User[]) => {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const users = await getUsers();
      
      // Check if user already exists
      const existingUser = users.find(
        u => u.email.toLowerCase() === userData.email.toLowerCase() || 
             u.username.toLowerCase() === userData.username.toLowerCase()
      );
      
      if (existingUser) {
        console.log('User already exists with this email or username');
        return false; // User already exists
      }

      const hashedPassword = await hashPassword(userData.password);
      const newUser: User = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          userData.email + Date.now().toString()
        ),
        username: userData.username,
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        skillLevel: userData.skillLevel,
        gamesPlayed: 0,
        createdAt: new Date().toISOString(),
        bio: userData.bio || '',
        positions: userData.positions || [],
        photos: [],
        highlights: [],
        profilePicture: undefined,
        friends: [],
        friendRequests: [],
        sentFriendRequests: [],
      };

      // Store password separately for login verification
      const userWithPassword = { ...newUser, password: hashedPassword };
      users.push(userWithPassword);
      await saveUsers(users);

      // Set current user (without password)
      setUser(newUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const users = await getUsers();
      const hashedPassword = await hashPassword(password);
      
      console.log('Attempting login for:', email);
      console.log('Total users in storage:', users.length);
      
      const user = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && 
             (u as any).password === hashedPassword
      );

      if (user) {
        if (await SafetyService.isUserDisabled(user.id)) {
          console.log('Login failed: account disabled');
          return false;
        }

        // Remove password from user object before setting state
        const { password: _, ...userWithoutPassword } = user as any;
        setUser(userWithoutPassword);
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
        console.log('Login successful for user:', userWithoutPassword.username);
        return true;
      }

      console.log('Login failed: Invalid credentials');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const userId = user.id;
      const users = await getUsers();

      // Remove this account and scrub friend graph references to it.
      const remainingUsers = users
        .filter((u) => u.id !== userId)
        .map((u) => ({
          ...u,
          friends: (u.friends || []).filter((id) => id !== userId),
          friendRequests: (u.friendRequests || []).filter((id) => id !== userId),
          sentFriendRequests: (u.sentFriendRequests || []).filter((id) => id !== userId),
        }));

      await saveUsers(remainingUsers);

      // Remove reviews written by or about this user.
      try {
        const reviewsRaw = await AsyncStorage.getItem('basketball_app_reviews');
        if (reviewsRaw) {
          const reviews = JSON.parse(reviewsRaw).filter(
            (r: { reviewerId: string; reviewedUserId: string }) =>
              r.reviewerId !== userId && r.reviewedUserId !== userId
          );
          await AsyncStorage.setItem('basketball_app_reviews', JSON.stringify(reviews));
        }
      } catch (reviewError) {
        console.error('Error cleaning reviews during account deletion:', reviewError);
      }

      await GameService.purgeUserGames(userId);
      await SafetyService.purgeUserData(userId);

      setUser(null);
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      return true;
    } catch (error) {
      console.error('Delete account error:', error);
      return false;
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!user) return;

    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

      // Update in users list
      const users = await getUsers();
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...userData };
        await saveUsers(users);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const sendFriendRequest = async (userId: string): Promise<boolean> => {
    if (!user || userId === user.id) return false;

    try {
      if (await SafetyService.isBlockedEitherWay(user.id, userId)) {
        return false;
      }
      if (await SafetyService.isUserDisabled(userId)) {
        return false;
      }

      const users = await getUsers();
      const targetUser = users.find(u => u.id === userId);
      const currentUserIndex = users.findIndex(u => u.id === user.id);

      if (!targetUser || currentUserIndex === -1) return false;

      // Check if already friends or request already sent
      if (user.friends.includes(userId) || user.sentFriendRequests.includes(userId)) {
        return false;
      }

      // Update target user's friend requests
      const targetUserIndex = users.findIndex(u => u.id === userId);
      users[targetUserIndex].friendRequests = [...(users[targetUserIndex].friendRequests || []), user.id];

      // Update current user's sent requests
      users[currentUserIndex].sentFriendRequests = [...(users[currentUserIndex].sentFriendRequests || []), userId];

      await saveUsers(users);

      // Update current user state
      setUser({ ...user, sentFriendRequests: [...(user.sentFriendRequests || []), userId] });
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...user, sentFriendRequests: [...(user.sentFriendRequests || []), userId] }));

      return true;
    } catch (error) {
      console.error('Send friend request error:', error);
      return false;
    }
  };

  const acceptFriendRequest = async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const users = await getUsers();
      const currentUserIndex = users.findIndex(u => u.id === user.id);
      const requesterIndex = users.findIndex(u => u.id === userId);

      if (currentUserIndex === -1 || requesterIndex === -1) return false;

      // Add to friends lists
      users[currentUserIndex].friends = [...(users[currentUserIndex].friends || []), userId];
      users[requesterIndex].friends = [...(users[requesterIndex].friends || []), user.id];

      // Remove from friend requests and sent requests
      users[currentUserIndex].friendRequests = (users[currentUserIndex].friendRequests || []).filter(id => id !== userId);
      users[requesterIndex].sentFriendRequests = (users[requesterIndex].sentFriendRequests || []).filter(id => id !== user.id);

      await saveUsers(users);

      // Update current user state
      const updatedUser = {
        ...user,
        friends: [...(user.friends || []), userId],
        friendRequests: (user.friendRequests || []).filter(id => id !== userId)
      };
      setUser(updatedUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      console.error('Accept friend request error:', error);
      return false;
    }
  };

  const rejectFriendRequest = async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const users = await getUsers();
      const currentUserIndex = users.findIndex(u => u.id === user.id);
      const requesterIndex = users.findIndex(u => u.id === userId);

      if (currentUserIndex === -1 || requesterIndex === -1) return false;

      // Remove from friend requests and sent requests
      users[currentUserIndex].friendRequests = (users[currentUserIndex].friendRequests || []).filter(id => id !== userId);
      users[requesterIndex].sentFriendRequests = (users[requesterIndex].sentFriendRequests || []).filter(id => id !== user.id);

      await saveUsers(users);

      // Update current user state
      const updatedUser = {
        ...user,
        friendRequests: (user.friendRequests || []).filter(id => id !== userId)
      };
      setUser(updatedUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      console.error('Reject friend request error:', error);
      return false;
    }
  };

  const removeFriend = async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const users = await getUsers();
      const currentUserIndex = users.findIndex(u => u.id === user.id);
      const friendIndex = users.findIndex(u => u.id === userId);

      if (currentUserIndex === -1 || friendIndex === -1) return false;

      // Remove from both friends lists
      users[currentUserIndex].friends = (users[currentUserIndex].friends || []).filter(id => id !== userId);
      users[friendIndex].friends = (users[friendIndex].friends || []).filter(id => id !== user.id);

      await saveUsers(users);

      // Update current user state
      const updatedUser = {
        ...user,
        friends: (user.friends || []).filter(id => id !== userId)
      };
      setUser(updatedUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      console.error('Remove friend error:', error);
      return false;
    }
  };

  const toPublicUser = (u: any): User => {
    const { password, ...userWithoutPassword } = u;
    // Do not expose email to other users in search / friend lists.
    return {
      ...userWithoutPassword,
      email: '',
    } as User;
  };

  const searchUsers = async (query: string): Promise<User[]> => {
    try {
      const users = await getUsers();
      const lowercaseQuery = query.toLowerCase();
      const hiddenIds = user
        ? await SafetyService.getHiddenUserIds(user.id)
        : [];
      const disabledIds = await SafetyService.getDisabledUserIds();

      return users
        .filter(
          (u) =>
            u.id !== user?.id &&
            !hiddenIds.includes(u.id) &&
            !disabledIds.includes(u.id) &&
            (u.username.toLowerCase().includes(lowercaseQuery) ||
              u.firstName.toLowerCase().includes(lowercaseQuery) ||
              u.lastName.toLowerCase().includes(lowercaseQuery))
        )
        .map(toPublicUser);
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const users = await getUsers();
      const hiddenIds = user
        ? await SafetyService.getHiddenUserIds(user.id)
        : [];
      const disabledIds = await SafetyService.getDisabledUserIds();

      return users
        .filter(
          (u) =>
            u.id !== user?.id &&
            !hiddenIds.includes(u.id) &&
            !disabledIds.includes(u.id)
        )
        .map(toPublicUser);
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      deleteAccount,
      updateProfile,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      searchUsers,
      getAllUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
