
import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    skillLevel: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    bio: '',
    positions: [] as string[],
  });

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const success = await login(loginData.email, loginData.password);
    setIsLoading(false);

    if (!success) {
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  const handleRegister = async () => {
    if (!registerData.username || !registerData.email || !registerData.password || 
        !registerData.firstName || !registerData.lastName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (registerData.positions.length === 0) {
      Alert.alert('Error', 'Please select at least one position');
      return;
    }

    setIsLoading(true);
    const success = await register({
      username: registerData.username,
      email: registerData.email,
      password: registerData.password,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      skillLevel: registerData.skillLevel,
      bio: registerData.bio,
      positions: registerData.positions,
    });
    setIsLoading(false);

    if (!success) {
      Alert.alert('Registration Failed', 'User with this email or username already exists');
    }
  };

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced'] as const;
  const basketballPositions = [
    'Point Guard (PG)',
    'Shooting Guard (SG)', 
    'Small Forward (SF)',
    'Power Forward (PF)',
    'Center (C)',
    'Sixth Man',
    'Versatile'
  ];

  const togglePosition = (position: string) => {
    const currentPositions = registerData.positions;
    const newPositions = currentPositions.includes(position)
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position];
    
    setRegisterData({...registerData, positions: newPositions});
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F4C75']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ThemedView style={styles.header}>
            <ThemedText style={styles.headerEmoji}>🏀</ThemedText>
            <ThemedText style={styles.headerTitle}>
              {isLogin ? 'Welcome Back!' : 'Join the Game!'}
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {isLogin ? 'Sign in to find your next pickup game' : 'Create your account to start playing'}
            </ThemedText>
          </ThemedView>

          {/* Form Card */}
          <ThemedView style={styles.formCard}>
            {isLogin ? (
              /* Login Form */
              <>
                <ThemedText style={styles.formTitle}>Sign In</ThemedText>
                
                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Email</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={loginData.email}
                    onChangeText={(text) => setLoginData({...loginData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Password</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={loginData.password}
                    onChangeText={(text) => setLoginData({...loginData, password: text})}
                    secureTextEntry
                  />
                </ThemedView>

                <TouchableOpacity 
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#0F4C75', '#3282B8']}
                    style={styles.submitButtonGradient}
                  >
                    <ThemedText style={styles.submitButtonText}>
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* Register Form */
              <>
                <ThemedText style={styles.formTitle}>Create Account</ThemedText>
                
                <ThemedView style={styles.inputRow}>
                  <ThemedView style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                    <ThemedText style={styles.label}>First Name</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="First name"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={registerData.firstName}
                      onChangeText={(text) => setRegisterData({...registerData, firstName: text})}
                    />
                  </ThemedView>
                  
                  <ThemedView style={[styles.inputGroup, {flex: 1, marginLeft: 8}]}>
                    <ThemedText style={styles.label}>Last Name</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="Last name"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={registerData.lastName}
                      onChangeText={(text) => setRegisterData({...registerData, lastName: text})}
                    />
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Username</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a username"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={registerData.username}
                    onChangeText={(text) => setRegisterData({...registerData, username: text})}
                    autoCapitalize="none"
                  />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Email</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={registerData.email}
                    onChangeText={(text) => setRegisterData({...registerData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                          registerData.skillLevel === level && styles.skillButtonActive
                        ]}
                        onPress={() => setRegisterData({...registerData, skillLevel: level})}
                      >
                        <ThemedText style={[
                          styles.skillButtonText,
                          registerData.skillLevel === level && styles.skillButtonTextActive
                        ]}>
                          {level}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Password</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password (min 6 chars)"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={registerData.password}
                    onChangeText={(text) => setRegisterData({...registerData, password: text})}
                    secureTextEntry
                  />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Confirm Password</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={registerData.confirmPassword}
                    onChangeText={(text) => setRegisterData({...registerData, confirmPassword: text})}
                    secureTextEntry
                  />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Basketball Positions *</ThemedText>
                  <ThemedText style={styles.subLabel}>Select at least one position you play</ThemedText>
                  <ThemedView style={styles.positionsContainer}>
                    {basketballPositions.map((position) => (
                      <TouchableOpacity
                        key={position}
                        style={[
                          styles.positionButton,
                          registerData.positions.includes(position) && styles.positionButtonActive
                        ]}
                        onPress={() => togglePosition(position)}
                      >
                        <ThemedText style={[
                          styles.positionButtonText,
                          registerData.positions.includes(position) && styles.positionButtonTextActive
                        ]}>
                          {position}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Bio (Optional)</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Tell other players about yourself..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={registerData.bio}
                    onChangeText={(text) => setRegisterData({...registerData, bio: text})}
                    multiline={true}
                    numberOfLines={3}
                  />
                </ThemedView>

                <TouchableOpacity 
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#0F4C75', '#3282B8']}
                    style={styles.submitButtonGradient}
                  >
                    <ThemedText style={styles.submitButtonText}>
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* Toggle between login/register */}
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <ThemedText style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <ThemedText style={styles.toggleTextBold}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: 'rgba(31, 31, 31, 0.9)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skillLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  skillButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skillButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  skillButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  skillButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  toggleTextBold: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  subLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
  },
  positionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  positionButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  positionButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  positionButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
