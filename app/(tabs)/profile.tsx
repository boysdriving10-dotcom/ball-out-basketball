
import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import ProfileScreen from '@/components/ProfileScreen';

export default function Profile() {
  return (
    <ThemedView style={styles.container}>
      <ProfileScreen />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
