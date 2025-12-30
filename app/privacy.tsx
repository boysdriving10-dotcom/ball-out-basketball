
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function Privacy() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy Policy - Run it Basketball</Text>
      <Text style={styles.content}>
        Last updated: {new Date().toDateString()}
        
        {'\n\n'}Your privacy is important to us. This privacy policy explains how Run it Basketball collects, uses, and protects your information.
        
        {'\n\n'}Information We Collect:
        - Location data to help you find nearby basketball games
        - Profile information you provide
        - Messages sent through the app
        
        {'\n\n'}How We Use Information:
        - To connect you with other basketball players
        - To show nearby games and courts
        - To improve our services
        
        {'\n\n'}Contact Us:
        If you have questions about this privacy policy, contact us at: support@runitbasketball.com
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
