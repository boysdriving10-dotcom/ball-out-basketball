
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function Support() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Support - Run it Basketball</Text>
      <Text style={styles.content}>
        Need help with Run it Basketball?
        
        {'\n\n'}Common Questions:
        
        {'\n\n'}How do I find games near me?
        - Enable location services and check the Map tab
        
        {'\n\n'}How do I message other players?
        - Go to the Messages tab to start conversations
        
        {'\n\n'}How do I build my reputation?
        - Participate in games and get positive reviews from other players
        
        {'\n\n'}Contact Support:
        Email: support@runitbasketball.com
        
        {'\n\n'}We typically respond within 24 hours.
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
