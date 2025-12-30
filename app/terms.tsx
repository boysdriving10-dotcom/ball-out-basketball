
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function Terms() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Terms of Service - Run it Basketball</Text>
      <Text style={styles.content}>
        Last updated: {new Date().toDateString()}
        
        {'\n\n'}Welcome to Run it Basketball. By using our app, you agree to these terms.
        
        {'\n\n'}Acceptable Use:
        - Use the app to find and organize basketball games
        - Be respectful to other users
        - Provide accurate information
        
        {'\n\n'}Prohibited Activities:
        - Harassment or inappropriate behavior
        - Spam or promotional content
        - Misuse of location features
        
        {'\n\n'}Contact Us:
        Questions about these terms? Contact: support@runitbasketball.com
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
