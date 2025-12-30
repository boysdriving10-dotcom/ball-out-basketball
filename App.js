import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from "react-native";

export default function App() {
  const [messages, setMessages] = useState([
    { id: "1", text: "Hey!" },
    { id: "2", text: "What's up?" },
  ]);
  const [text, setText] = useState("");
  const flatListRef = useRef(null);

  const sendMessage = () => {
    if (text.trim() === "") return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), text }]);
    setText("");
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.messageBubble}>
              <Text>{item.text}</Text>
            </View>
          )}
          style={styles.messages}
          contentContainerStyle={{ padding: 10 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messageBubble: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginVertical: 4,
    alignSelf: "flex-start",
  },
  inputContainer: {
    borderTopWidth: 1,
    borderColor: "#ccc",
    padding: 8,
  },
  input: {
    padding: 12,
    fontSize: 16,
  },
});