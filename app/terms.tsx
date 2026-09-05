import { ScrollView, StyleSheet, Text } from 'react-native';
import SafetyService from '@/services/SafetyService';

export default function Terms() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.content}>
        Last updated: August 1, 2026
        {'\n\n'}
        Welcome to BallOut. By using the app, you agree to these terms.
        {'\n\n'}
        Acceptable Use:
        {'\n'}- Use BallOut to find courts, organize games, and connect with players
        {'\n'}- Be respectful in messages, profiles, reviews, and game posts
        {'\n'}- Provide accurate account information
        {'\n\n'}
        Prohibited Activities:
        {'\n'}- Harassment, hate speech, threats, or bullying
        {'\n'}- Spam, scams, or impersonation
        {'\n'}- Posting illegal, sexual, or violent content
        {'\n'}- Misusing location features or attempting to disrupt the service
        {'\n\n'}
        User Content:
        {'\n'}
        You are responsible for content you create. BallOut may remove content or disable accounts that violate these terms. Other users may report and block abusive behavior.
        {'\n\n'}
        Accounts:
        {'\n'}
        You can delete your account at any time from Profile → Delete Account.
        {'\n\n'}
        Contact:
        {'\n'}
        Questions about these terms? Contact {SafetyService.getSupportEmail()}.
      </Text>
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
});
