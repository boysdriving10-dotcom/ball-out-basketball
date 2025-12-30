
import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function CreateGameScreen() {
  const [gameData, setGameData] = useState({
    title: '',
    location: '',
    date: '',
    time: '',
    playersNeeded: '',
    skillLevel: 'Intermediate',
    organizer: '',
    description: ''
  });

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

  const createGame = () => {
    if (!gameData.title || !gameData.location || !gameData.date || !gameData.time || !gameData.playersNeeded || !gameData.organizer) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    Alert.alert(
      'Game Created!', 
      `Your "${gameData.title}" game has been created successfully!`,
      [
        {
          text: 'OK',
          onPress: () => {
            setGameData({
              title: '',
              location: '',
              date: '',
              time: '',
              playersNeeded: '',
              skillLevel: 'Intermediate',
              organizer: '',
              description: ''
            });
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Create New Game</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Organize a pickup basketball game</ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Game Title *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3v3 Evening Game"
              value={gameData.title}
              onChangeText={(text) => setGameData({...gameData, title: text})}
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Your Name *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Your name as organizer"
              value={gameData.organizer}
              onChangeText={(text) => setGameData({...gameData, organizer: text})}
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Location *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Basketball court address or name"
              value={gameData.location}
              onChangeText={(text) => setGameData({...gameData, location: text})}
            />
          </ThemedView>

          <ThemedView style={styles.row}>
            <ThemedView style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <ThemedText style={styles.label}>Date *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="MM/DD/YYYY"
                value={gameData.date}
                onChangeText={(text) => setGameData({...gameData, date: text})}
              />
            </ThemedView>

            <ThemedView style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <ThemedText style={styles.label}>Time *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="6:00 PM"
                value={gameData.time}
                onChangeText={(text) => setGameData({...gameData, time: text})}
              />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Players Needed *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10 (for 5v5)"
              value={gameData.playersNeeded}
              onChangeText={(text) => setGameData({...gameData, playersNeeded: text})}
              keyboardType="numeric"
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Skill Level</ThemedText>
            <ThemedView style={styles.skillLevelContainer}>
              {skillLevels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.skillButton,
                    gameData.skillLevel === level && styles.skillButtonActive
                  ]}
                  onPress={() => setGameData({...gameData, skillLevel: level})}
                >
                  <ThemedText style={[
                    styles.skillButtonText,
                    gameData.skillLevel === level && styles.skillButtonTextActive
                  ]}>
                    {level}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Description (Optional)</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional details about the game..."
              value={gameData.description}
              onChangeText={(text) => setGameData({...gameData, description: text})}
              multiline
              numberOfLines={4}
            />
          </ThemedView>

          <TouchableOpacity style={styles.createButton} onPress={createGame}>
            <ThemedText style={styles.createButtonText}>CREATE GAME</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  skillLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  skillButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  skillButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skillButtonTextActive: {
    color: 'white',
  },
  createButton: {
    backgroundColor: '#FF6B35',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
