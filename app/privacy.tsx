import { ScrollView, StyleSheet, Text } from 'react-native';
import SafetyService from '@/services/SafetyService';

export default function Privacy() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.content}>
        Last updated: August 1, 2026
        {'\n\n'}
        Your privacy matters to us. This policy explains how BallOut collects, uses, and protects your information.
        {'\n\n'}
        Information We Collect:
        {'\n'}- Account details you provide (such as name, username, and email)
        {'\n'}- Profile content you upload (bio, photos, highlights)
        {'\n'}- Location data to help you find nearby courts and games (with your permission)
        {'\n'}- Messages and game posts you create in the app
        {'\n'}- Safety reports you submit
        {'\n\n'}
        How We Use Information:
        {'\n'}- To create and manage your account
        {'\n'}- To connect you with nearby courts, games, and players
        {'\n'}- To enable messaging, friends, and reviews
        {'\n'}- To review reports and keep the community safe
        {'\n'}- To improve the app experience
        {'\n\n'}
        Sharing:
        {'\n'}
        We do not sell your personal information. Other players may see profile details you choose to share (such as username and bio). Your email address is kept private from other players in search and friend lists.
        {'\n\n'}
        Your Choices:
        {'\n'}- You can edit or delete profile content
        {'\n'}- You can block or report other users
        {'\n'}- You can delete your account from Profile → Delete Account
        {'\n'}- You can revoke location, camera, or photo permissions in device settings
        {'\n\n'}
        Contact:
        {'\n'}
        Questions about this privacy policy? Contact us at {SafetyService.getSupportEmail()}.
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
