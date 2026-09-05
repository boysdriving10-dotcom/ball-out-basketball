import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import SafetyService, { BlockRecord } from '@/services/SafetyService';

export default function BlockedUsersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadBlocked = useCallback(async () => {
    if (!user) return;
    const list = await SafetyService.getBlockedUsers(user.id);
    setBlocked(list);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBlocked();
    }, [loadBlocked])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBlocked();
    setRefreshing(false);
  };

  const handleUnblock = (record: BlockRecord) => {
    if (!user) return;
    Alert.alert(
      'Unblock user',
      `Unblock @${record.blockedUsername}? They will be able to interact with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            await SafetyService.unblockUser(user.id, record.blockedUserId);
            await loadBlocked();
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Blocked Users', headerShown: true }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText style={styles.helper}>
          Blocked users cannot send you friend requests or appear in your search results.
        </ThemedText>

        {blocked.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyTitle}>No blocked users</ThemedText>
            <ThemedText style={styles.emptyText}>
              When you block someone, they will show up here.
            </ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={styles.backButtonText}>Back to Profile</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          blocked.map((record) => (
            <View key={`${record.blockerId}-${record.blockedUserId}`} style={styles.card}>
              <View style={styles.cardInfo}>
                <ThemedText style={styles.username}>@{record.blockedUsername}</ThemedText>
                <ThemedText style={styles.date}>
                  Blocked {new Date(record.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.unblockButton} onPress={() => handleUnblock(record)}>
                <ThemedText style={styles.unblockText}>Unblock</ThemedText>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 20, paddingBottom: 40 },
  helper: { color: '#aaa', marginBottom: 20, lineHeight: 20 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: '#888', textAlign: 'center', marginBottom: 20 },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: { flex: 1, marginRight: 12 },
  username: { color: '#fff', fontSize: 16, fontWeight: '600' },
  date: { color: '#888', marginTop: 4, fontSize: 12 },
  unblockButton: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  unblockText: { color: '#fff', fontWeight: '600' },
});
