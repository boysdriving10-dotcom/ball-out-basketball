import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import ReportModal from '@/components/ReportModal';
import SafetyService from '@/services/SafetyService';

type Chat = {
  id: string;
  name: string;
  type: 'direct' | 'group';
  lastMessage: string;
  lastMessageTime: string;
  memberCount?: number;
  unreadCount: number;
  participantId?: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
};

const CHATS_KEY = 'ballout_user_chats';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [reportTarget, setReportTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    loadChats();
  }, [user?.id]);

  const loadChats = async () => {
    try {
      const raw = await AsyncStorage.getItem(CHATS_KEY);
      const stored: Chat[] = raw ? JSON.parse(raw) : [];
      if (!user) {
        setChats(stored);
        return;
      }
      const hidden = await SafetyService.getHiddenUserIds(user.id);
      setChats(
        stored.filter((c) => !c.participantId || !hidden.includes(c.participantId))
      );
    } catch {
      setChats([]);
    }
  };

  const persistChats = async (next: Chat[]) => {
    setChats(next);
    await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(next));
  };

  const openChat = (chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: 'You',
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, message]);
    const text = newMessage.trim();
    setNewMessage('');

    await persistChats(
      chats.map((c) =>
        c.id === selectedChat.id
          ? { ...c, lastMessage: text, lastMessageTime: 'now' }
          : c
      )
    );
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const group: Chat = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      type: 'group',
      lastMessage: 'Group created',
      lastMessageTime: 'now',
      memberCount: 1,
      unreadCount: 0,
    };

    await persistChats([group, ...chats]);
    setNewGroupName('');
    setShowNewGroupModal(false);
  };

  const blockFromChat = () => {
    if (!user || !selectedChat?.participantId) {
      Alert.alert(
        'Block unavailable',
        'Blocking is available for direct conversations with other players.'
      );
      return;
    }

    Alert.alert('Block user', `Block ${selectedChat.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await SafetyService.blockUser(
            user.id,
            selectedChat.participantId!,
            selectedChat.name
          );
          setSelectedChat(null);
          await loadChats();
        },
      },
    ]);
  };

  if (selectedChat) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedChat(null)}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.chatTitle}>{selectedChat.name}</ThemedText>
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity
              onPress={() =>
                setReportTarget({
                  id: selectedChat.participantId || selectedChat.id,
                  label: selectedChat.name,
                })
              }
            >
              <ThemedText style={styles.headerAction}>Report</ThemedText>
            </TouchableOpacity>
            {selectedChat.type === 'direct' && (
              <TouchableOpacity onPress={blockFromChat}>
                <ThemedText style={styles.headerAction}>Block</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <ThemedText style={styles.emptyThread}>
              No messages yet. Start the conversation.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.senderId === user?.id ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <ThemedText style={styles.messageText}>{item.text}</ThemedText>
              <ThemedText style={styles.messageTime}>{item.timestamp}</ThemedText>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <ThemedText style={styles.sendText}>Send</ThemedText>
          </TouchableOpacity>
        </View>

        <ReportModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetType={selectedChat.type === 'direct' ? 'user' : 'message'}
          targetId={reportTarget?.id || ''}
          targetLabel={reportTarget?.label || ''}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F4C75']} style={styles.header}>
        <ThemedText style={styles.headerEmoji}>💬</ThemedText>
        <ThemedText style={styles.headerTitle}>Messages</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Chat with players and groups</ThemedText>
        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={() => setShowNewGroupModal(true)}
        >
          <ThemedText style={styles.newGroupButtonText}>+ New Group</ThemedText>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>🏀</ThemedText>
            <ThemedText style={styles.emptyTitle}>No conversations yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Create a group or message friends to get started. Demo chats were removed so App
              Reviewers only see real user content.
            </ThemedText>
          </View>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatRow}
              onPress={() => openChat(chat)}
            >
              <View style={styles.chatInfo}>
                <ThemedText style={styles.chatName}>{chat.name}</ThemedText>
                <ThemedText style={styles.chatPreview} numberOfLines={1}>
                  {chat.lastMessage}
                </ThemedText>
              </View>
              <ThemedText style={styles.chatTime}>{chat.lastMessageTime}</ThemedText>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {showNewGroupModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Create Group Chat</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Group name"
              placeholderTextColor="#888"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowNewGroupModal(false);
                  setNewGroupName('');
                }}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreate} onPress={createGroup}>
                <ThemedText style={styles.modalCreateText}>Create</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 36, marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  newGroupButton: {
    marginTop: 16,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newGroupButtonText: { color: '#fff', fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: '#aaa', textAlign: 'center', lineHeight: 20 },
  chatRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chatPreview: { color: '#999', marginTop: 4 },
  chatTime: { color: '#777', fontSize: 12 },
  chatHeader: {
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backText: { color: '#FF6B35', marginBottom: 8 },
  chatTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  chatHeaderActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  headerAction: { color: '#FF8A65', fontWeight: '600' },
  messagesList: { padding: 16, flexGrow: 1 },
  emptyThread: { color: '#888', textAlign: 'center', marginTop: 40 },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B35',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
  },
  messageText: { color: '#fff' },
  messageTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
  },
  sendButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: { color: '#fff' },
  modalCreate: {
    flex: 1,
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCreateText: { color: '#fff', fontWeight: '700' },
});
