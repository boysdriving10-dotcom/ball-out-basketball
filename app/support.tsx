import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import SafetyService from '@/services/SafetyService';

export default function Support() {
  const email = SafetyService.getSupportEmail();

  const openMail = async () => {
    try {
      await SafetyService.openSupportEmail(
        'BallOut Support Request',
        'Please describe your question or problem:\n\n'
      );
    } catch {
      Alert.alert('Contact Support', `Email us at ${email}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Support</Text>
      <Text style={styles.content}>
        Need help with BallOut?
        {'\n\n'}
        Common questions:
        {'\n\n'}
        How do I find games near me?{'\n'}
        Enable location services and check the Map and Home tabs.
        {'\n\n'}
        How do I message other players?{'\n'}
        Use the Messages tab to start conversations or create a group chat.
        {'\n\n'}
        How do I report a problem with a user or game?{'\n'}
        Use Report on the Friends, Messages, or Home game cards. You can also block users from Profile → Blocked Users.
        {'\n\n'}
        How do I delete my account?{'\n'}
        Go to Profile → Delete Account. This permanently removes your account data from this device.
        {'\n\n'}
        Contact Support:
      </Text>

      <TouchableOpacity style={styles.button} onPress={openMail}>
        <Text style={styles.buttonText}>Email {email}</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>We typically respond within 24 hours.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});
