
import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, View, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Mock data for demonstration
const initialChats = [
  {
    id: '1',
    name: 'Basketball Warriors',
    type: 'group',
    lastMessage: 'Game tomorrow at 6 PM!',
    lastMessageTime: '2:30 PM',
    members: 8,
    unreadCount: 3
  },
  {
    id: '2',
    name: 'Mike Johnson',
    type: 'direct',
    lastMessage: 'Are you coming to the game?',
    lastMessageTime: '1:45 PM',
    unreadCount: 1
  },
  {
    id: '3',
    name: 'Downtown Ballers',
    type: 'group',
    lastMessage: 'Looking for 2 more players',
    lastMessageTime: '12:20 PM',
    members: 5,
    unreadCount: 0
  },
];

const mockMessages = [
  {
    id: '1',
    senderId: 'other',
    senderName: 'Mike Johnson',
    message: 'Hey, are you coming to the game tonight?',
    timestamp: '6:30 PM'
  },
  {
    id: '2',
    senderId: 'me',
    senderName: 'You',
    message: 'Yeah definitely! What time again?',
    timestamp: '6:32 PM'
  },
  {
    id: '3',
    senderId: 'other',
    senderName: 'Mike Johnson',
    message: '7 PM at Central Park courts',
    timestamp: '6:33 PM'
  },
];

export default function MessagesScreen() {
  const [chats, setChats] = useState(initialChats);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    // Mark as read
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    const message = {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: 'You',
      message: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Update last message in chat list
    setChats(prev => prev.map(c => 
      c.id === selectedChat.id 
        ? { ...c, lastMessage: newMessage.trim(), lastMessageTime: 'now' }
        : c
    ));
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      type: 'group',
      lastMessage: 'Group created',
      lastMessageTime: 'now',
      members: 1,
      unreadCount: 0
    };

    setChats(prev => [newGroup, ...prev]);
    setNewGroupName('');
    setShowNewGroupModal(false);
    Alert.alert('Success', 'Group chat created!');
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatItem, item.unreadCount > 0 && styles.unreadChat]}
      onPress={() => handleChatSelect(item)}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.chatAvatar}>
        <ThemedText style={styles.avatarText}>
          {item.type === 'group' ? '👥' : '👤'}
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.chatInfo}>
        <ThemedView style={styles.chatHeader}>
          <ThemedText style={styles.chatName}>{item.name}</ThemedText>
          <ThemedText style={styles.messageTime}>{item.lastMessageTime}</ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.chatPreview}>
          <ThemedText style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </ThemedText>
          {item.unreadCount > 0 && (
            <ThemedView style={styles.unreadBadge}>
              <ThemedText style={styles.unreadCount}>
                {item.unreadCount}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
        
        {item.type === 'group' && (
          <ThemedText style={styles.memberCount}>
            {item.members} members
          </ThemedText>
        )}
      </ThemedView>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => (
    <ThemedView style={[
      styles.messageContainer,
      item.senderId === 'me' ? styles.myMessage : styles.otherMessage
    ]}>
      {item.senderId !== 'me' && selectedChat?.type === 'group' && (
        <ThemedText style={styles.senderName}>{item.senderName}</ThemedText>
      )}
      <ThemedText style={[
        styles.messageText,
        item.senderId === 'me' ? styles.myMessageText : styles.otherMessageText
      ]}>
        {item.message}
      </ThemedText>
      <ThemedText style={styles.messageTime}>{item.timestamp}</ThemedText>
    </ThemedView>
  );

  if (selectedChat) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <ThemedView style={styles.container}>
          {/* Chat Header */}
          <LinearGradient
            colors={['#1A1A2E', '#16213E', '#0F4C75']}
            style={styles.chatHeader}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedChat(null)}
            >
              <ThemedText style={styles.backText}>← Back</ThemedText>
            </TouchableOpacity>
            
            <ThemedView style={styles.chatHeaderInfo}>
              <ThemedText style={styles.chatHeaderName}>{selectedChat.name}</ThemedText>
              {selectedChat.type === 'group' && (
                <ThemedText style={styles.chatHeaderSubtitle}>
                  {selectedChat.members} members
                </ThemedText>
              )}
            </ThemedView>
          </LinearGradient>

          {/* Messages */}
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          />

          {/* Message Input */}
          <ThemedView style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              multiline
              blurOnSubmit={false}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <LinearGradient
                colors={['#0F4C75', '#3282B8']}
                style={styles.sendButtonGradient}
              >
                <ThemedText style={styles.sendButtonText}>Send</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F4C75']}
        style={styles.header}
      >
        <ThemedText style={styles.headerTitle}>Messages</ThemedText>
        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={() => setShowNewGroupModal(true)}
        >
          <ThemedText style={styles.newGroupButtonText}>+ Group</ThemedText>
        </TouchableOpacity>
      </LinearGradient>

      {/* Chat List */}
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
      />

      {/* New Group Modal */}
      {showNewGroupModal && (
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={styles.modal}>
            <ThemedText style={styles.modalTitle}>Create Group Chat</ThemedText>
            
            <TextInput
              style={styles.groupNameInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Enter group name"
              placeholderTextColor="#666"
            />
            
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowNewGroupModal(false)}
              >
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateGroup}
              >
                <LinearGradient
                  colors={['#0F4C75', '#3282B8']}
                  style={styles.createButtonGradient}
                >
                  <ThemedText style={styles.createButtonText}>Create</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  newGroupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newGroupButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  unreadChat: {
    backgroundColor: '#1A1A2E',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chatHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: 'white',
    fontSize: 16,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F4C75',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  senderName: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: 'white',
  },
  messageInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    color: 'white',
    backgroundColor: '#2A2A2A',
    maxHeight: 100,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  sendButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    backgroundColor: '#2A2A2A',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  createButton: {
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
