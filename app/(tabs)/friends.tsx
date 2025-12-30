import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  profilePicture?: string;
  friends: string[];
  friendRequests: string[];
  sentFriendRequests: string[];
}

export default function FriendsScreen() {
  const { 
    user, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest, 
    removeFriend, 
    searchUsers, 
    getAllUsers 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const users = await getAllUsers();
      setAllUsers(users);

      if (user) {
        // Load friends
        const userFriends = users.filter(u => user.friends.includes(u.id));
        setFriends(userFriends);

        // Load friend requests
        const requests = users.filter(u => user.friendRequests.includes(u.id));
        setFriendRequests(requests);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      const results = await searchUsers(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      Alert.alert('Success', 'Friend request sent!');
      loadData(); // Refresh data
    } else {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    const success = await acceptFriendRequest(userId);
    if (success) {
      Alert.alert('Success', 'Friend request accepted!');
      loadData(); // Refresh data
    } else {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    const success = await rejectFriendRequest(userId);
    if (success) {
      loadData(); // Refresh data
    } else {
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  const handleRemoveFriend = (userId: string, userName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${userName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          onPress: async () => {
            const success = await removeFriend(userId);
            if (success) {
              loadData(); // Refresh data
            } else {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
          style: 'destructive' 
        },
      ]
    );
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return ['#4A90E2', '#5BA0F2'];
      case 'Intermediate': return ['#FF8C00', '#FFA500'];
      case 'Advanced': return ['#DC143C', '#FF4500'];
      default: return ['#6C7B7F', '#8B9DC3'];
    }
  };

  const renderUserCard = (userData: User, showActions: 'request' | 'add' | 'friend' | 'pending') => (
    <ThemedView key={userData.id} style={styles.userCard}>
      <ThemedView style={styles.userInfo}>
        {userData.profilePicture ? (
          <Image source={{ uri: userData.profilePicture }} style={styles.userAvatar} />
        ) : (
          <LinearGradient
            colors={getSkillLevelColor(userData.skillLevel)}
            style={styles.userAvatar}
          >
            <ThemedText style={styles.userAvatarText}>
              {userData.firstName[0]}{userData.lastName[0]}
            </ThemedText>
          </LinearGradient>
        )}

        <ThemedView style={styles.userDetails}>
          <ThemedText style={styles.userName}>
            {userData.firstName} {userData.lastName}
          </ThemedText>
          <ThemedText style={styles.userHandle}>@{userData.username}</ThemedText>
          <ThemedText style={styles.userSkill}>{userData.skillLevel}</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.userActions}>
        {showActions === 'request' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptRequest(userData.id)}
            >
              <ThemedText style={styles.acceptButtonIcon}>✓</ThemedText>
              <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectRequest(userData.id)}
            >
              <ThemedText style={styles.rejectButtonIcon}>✕</ThemedText>
              <ThemedText style={styles.rejectButtonText}>Decline</ThemedText>
            </TouchableOpacity>
          </>
        )}

        {showActions === 'add' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={() => handleSendFriendRequest(userData.id)}
          >
            <ThemedText style={styles.addButtonIcon}>+</ThemedText>
            <ThemedText style={styles.addButtonText}>Add Friend</ThemedText>
          </TouchableOpacity>
        )}

        {showActions === 'friend' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleRemoveFriend(userData.id, `${userData.firstName} ${userData.lastName}`)}
          >
            <ThemedText style={styles.removeButtonIcon}>−</ThemedText>
            <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
          </TouchableOpacity>
        )}

        {showActions === 'pending' && (
          <ThemedView style={[styles.actionButton, styles.pendingButton]}>
            <ThemedText style={styles.pendingButtonIcon}>⏳</ThemedText>
            <ThemedText style={styles.pendingButtonText}>Pending</ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );

  const getActionType = (userData: User): 'request' | 'add' | 'friend' | 'pending' => {
    if (!user) return 'add';

    if (user.friendRequests.includes(userData.id)) return 'request';
    if (user.friends.includes(userData.id)) return 'friend';
    if (user.sentFriendRequests.includes(userData.id)) return 'pending';
    return 'add';
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F4C75']}
        style={styles.header}
      >
        <ThemedText style={styles.headerEmoji}>👥</ThemedText>
        <ThemedText style={styles.headerTitle}>Friends</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Connect with basketball players</ThemedText>
      </LinearGradient>

      {/* Tab Navigation */}
      <ThemedView style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({friendRequests.length})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <ThemedView style={styles.tabContent}>
            {friends.length > 0 ? (
              friends.map(friend => renderUserCard(friend, 'friend'))
            ) : (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>🏀</ThemedText>
                <ThemedText style={styles.emptyTitle}>No Friends Yet</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Start by searching for basketball players to connect with!
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <ThemedView style={styles.tabContent}>
            {friendRequests.length > 0 ? (
              friendRequests.map(request => renderUserCard(request, 'request'))
            ) : (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>📬</ThemedText>
                <ThemedText style={styles.emptyTitle}>No Friend Requests</ThemedText>
                <ThemedText style={styles.emptyText}>
                  When someone sends you a friend request, it will appear here.
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <ThemedView style={styles.tabContent}>
            <ThemedView style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for players..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </ThemedView>

            {searchQuery.length > 0 ? (
              searchResults.length > 0 ? (
                searchResults.map(userData => renderUserCard(userData, getActionType(userData)))
              ) : (
                <ThemedView style={styles.emptyState}>
                  <ThemedText style={styles.emptyEmoji}>🔍</ThemedText>
                  <ThemedText style={styles.emptyTitle}>No Results Found</ThemedText>
                  <ThemedText style={styles.emptyText}>
                    Try searching with a different username or name.
                  </ThemedText>
                </ThemedView>
              )
            ) : (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>🔎</ThemedText>
                <ThemedText style={styles.emptyTitle}>Search for Players</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Enter a username, name, or email to find basketball players.
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tabContent: {
    paddingBottom: 100,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  userSkill: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,
    minHeight: 44,
    justifyContent: 'center',
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  acceptButtonIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: 'rgba(220, 20, 60, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 20, 60, 0.6)',
  },
  rejectButtonIcon: {
    color: '#DC143C',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rejectButtonText: {
    color: '#DC143C',
    fontSize: 13,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: 'rgba(220, 20, 60, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 20, 60, 0.6)',
  },
  removeButtonIcon: {
    color: '#DC143C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeButtonText: {
    color: '#DC143C',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pendingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pendingButtonIcon: {
    fontSize: 14,
  },
  pendingButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});