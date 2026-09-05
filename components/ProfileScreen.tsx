
import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import SafetyService from '@/services/SafetyService';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

const BASKETBALL_POSITIONS = [
  'Point Guard (PG)',
  'Shooting Guard (SG)', 
  'Small Forward (SF)',
  'Power Forward (PF)',
  'Center (C)',
  'Sixth Man',
  'Versatile'
];

export default function ProfileScreen() {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [highlightModalVisible, setHighlightModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    skillLevel: user?.skillLevel || 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    bio: user?.bio || '',
    positions: user?.positions || [],
  });

  const handleSave = async () => {
    try {
      await updateProfile(editData);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your BallOut account, profile, friend connections, and games you created on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm deletion',
              'Are you absolutely sure you want to delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAccount();
                    if (success) {
                      Alert.alert('Account deleted', 'Your account has been deleted.');
                    } else {
                      Alert.alert('Error', 'Could not delete your account. Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openSupport = async () => {
    try {
      await SafetyService.openSupportEmail(
        'BallOut Support Request',
        'Please describe your issue:\n\n'
      );
    } catch {
      Alert.alert(
        'Contact Support',
        `Email us at ${SafetyService.getSupportEmail()}`,
        [
          { text: 'OK' },
          {
            text: 'Copy Email',
            onPress: () => Linking.openURL(`mailto:${SafetyService.getSupportEmail()}`),
          },
        ]
      );
    }
  };

  const pickProfilePicture = async () => {
    // Request both permissions upfront
    const [mediaLibraryStatus, cameraStatus] = await Promise.all([
      ImagePicker.requestMediaLibraryPermissionsAsync(),
      ImagePicker.requestCameraPermissionsAsync()
    ]);

    Alert.alert(
      'Select Image',
      'Choose how you want to select your profile picture',
      [
        { 
          text: 'Camera', 
          onPress: () => takePicture(),
          disabled: cameraStatus.status !== 'granted'
        },
        { 
          text: 'Gallery', 
          onPress: () => selectFromGallery(),
          disabled: mediaLibraryStatus.status !== 'granted'
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await processProfilePicture(result.assets[0].uri);
    }
  };

  const selectFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await processProfilePicture(result.assets[0].uri);
    }
  };

  const processProfilePicture = async (uri: string) => {
    try {
      await updateProfile({
        profilePicture: uri
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to process image');
    }
  };

  const pickImage = async (type: 'photo' | 'highlight') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to add photos');
      return;
    }

    Alert.alert(
      `Add ${type === 'photo' ? 'Photo' : 'Highlight'}`,
      'Choose how you want to add this item',
      [
        { 
          text: 'Camera', 
          onPress: () => takeImageWithCamera(type)
        },
        { 
          text: 'Gallery', 
          onPress: () => selectImageFromGallery(type)
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takeImageWithCamera = async (type: 'photo' | 'highlight') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'photo' ? ['images'] : ['videos'],
      allowsEditing: true,
      aspect: type === 'photo' ? [1, 1] : [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const newItem = result.assets[0].uri;
      const field = type === 'photo' ? 'photos' : 'highlights';
      const currentItems = user?.[field] || [];
      
      await updateProfile({
        [field]: [...currentItems, newItem]
      });
    }
  };

  const selectImageFromGallery = async (type: 'photo' | 'highlight') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'photo' ? ['images'] : ['videos'],
      allowsEditing: true,
      aspect: type === 'photo' ? [1, 1] : [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const newItem = result.assets[0].uri;
      const field = type === 'photo' ? 'photos' : 'highlights';
      const currentItems = user?.[field] || [];
      
      await updateProfile({
        [field]: [...currentItems, newItem]
      });
    }
  };

  const removeItem = async (index: number, type: 'photo' | 'highlight') => {
    const field = type === 'photo' ? 'photos' : 'highlights';
    const currentItems = user?.[field] || [];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    
    await updateProfile({
      [field]: updatedItems
    });
  };

  const togglePosition = (position: string) => {
    const currentPositions = editData.positions;
    const newPositions = currentPositions.includes(position)
      ? currentPositions.filter(p => p !== position)
      : [...currentPositions, position];
    
    setEditData({...editData, positions: newPositions});
  };

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced'] as const;

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return ['#4A90E2', '#5BA0F2'];
      case 'Intermediate': return ['#FF8C00', '#FFA500'];
      case 'Advanced': return ['#DC143C', '#FF4500'];
      default: return ['#6C7B7F', '#8B9DC3'];
    }
  };

  const renderImageGrid = (images: string[], type: 'photo' | 'highlight') => (
    <ThemedView style={styles.imageGrid}>
      {images.map((uri, index) => (
        <TouchableOpacity 
          key={index}
          style={styles.imageContainer}
          onPress={() => {
            setSelectedImageIndex(index);
            if (type === 'photo') {
              setPhotoModalVisible(true);
            } else {
              setHighlightModalVisible(true);
            }
          }}
          onLongPress={() => {
            Alert.alert(
              'Remove Item',
              `Remove this ${type}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', onPress: () => removeItem(index, type), style: 'destructive' },
              ]
            );
          }}
        >
          <Image source={{ uri }} style={styles.gridImage} />
          {type === 'highlight' && (
            <ThemedView style={styles.playButton}>
              <ThemedText style={styles.playIcon}>▶️</ThemedText>
            </ThemedView>
          )}
        </TouchableOpacity>
      ))}
      <TouchableOpacity 
        style={styles.addImageButton}
        onPress={() => pickImage(type)}
      >
        <ThemedText style={styles.addImageText}>+</ThemedText>
        <ThemedText style={styles.addImageLabel}>Add {type}</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F4C75']}
        style={styles.header}
      >
        <ThemedText style={styles.headerEmoji}>👤</ThemedText>
        <ThemedText style={styles.headerTitle}>My Profile</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Manage your basketball profile</ThemedText>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <ThemedView style={styles.profileCard}>
          <ThemedView style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickProfilePicture}>
              {user.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
              ) : (
                <LinearGradient
                  colors={getSkillLevelColor(user.skillLevel)}
                  style={styles.avatar}
                >
                  <ThemedText style={styles.avatarText}>
                    {user.firstName[0]}{user.lastName[0]}
                  </ThemedText>
                </LinearGradient>
              )}
              <ThemedView style={styles.cameraIcon}>
                <ThemedText style={styles.cameraEmoji}>📷</ThemedText>
              </ThemedView>
            </TouchableOpacity>
          </ThemedView>

          {!isEditing ? (
            <>
              <ThemedText style={styles.userName}>
                {user.firstName} {user.lastName}
              </ThemedText>
              <ThemedText style={styles.userHandle}>@{user.username}</ThemedText>
              
              {user.bio && (
                <ThemedText style={styles.bio}>{user.bio}</ThemedText>
              )}
              
              <LinearGradient
                colors={getSkillLevelColor(user.skillLevel)}
                style={styles.skillBadge}
              >
                <ThemedText style={styles.skillText}>{user.skillLevel}</ThemedText>
              </LinearGradient>

              {/* Positions */}
              {user.positions && user.positions.length > 0 && (
                <ThemedView style={styles.positionsContainer}>
                  <ThemedText style={styles.positionsTitle}>🏀 Positions</ThemedText>
                  <ThemedView style={styles.positionsList}>
                    {user.positions.map((position, index) => (
                      <ThemedView key={index} style={styles.positionBadge}>
                        <ThemedText style={styles.positionText}>{position}</ThemedText>
                      </ThemedView>
                    ))}
                  </ThemedView>
                </ThemedView>
              )}

              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ThemedView style={styles.editForm}>
                <ThemedView style={styles.inputRow}>
                  <ThemedView style={[styles.inputGroup, {flex: 1, marginRight: 8}]}>
                    <ThemedText style={styles.label}>First Name</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={editData.firstName}
                      onChangeText={(text) => setEditData({...editData, firstName: text})}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </ThemedView>
                  
                  <ThemedView style={[styles.inputGroup, {flex: 1, marginLeft: 8}]}>
                    <ThemedText style={styles.label}>Last Name</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={editData.lastName}
                      onChangeText={(text) => setEditData({...editData, lastName: text})}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Username</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={editData.username}
                    onChangeText={(text) => setEditData({...editData, username: text})}
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Bio</ThemedText>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    value={editData.bio}
                    onChangeText={(text) => setEditData({...editData, bio: text})}
                    placeholder="Tell us about your basketball journey..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    multiline
                    numberOfLines={3}
                  />
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Positions</ThemedText>
                  <ThemedView style={styles.positionsGrid}>
                    {BASKETBALL_POSITIONS.map((position) => (
                      <TouchableOpacity
                        key={position}
                        style={[
                          styles.positionButton,
                          editData.positions.includes(position) && styles.positionButtonActive
                        ]}
                        onPress={() => togglePosition(position)}
                      >
                        <ThemedText style={[
                          styles.positionButtonText,
                          editData.positions.includes(position) && styles.positionButtonTextActive
                        ]}>
                          {position}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Skill Level</ThemedText>
                  <ThemedView style={styles.skillLevelContainer}>
                    {skillLevels.map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.skillButton,
                          editData.skillLevel === level && styles.skillButtonActive
                        ]}
                        onPress={() => setEditData({...editData, skillLevel: level})}
                      >
                        <ThemedText style={[
                          styles.skillButtonText,
                          editData.skillLevel === level && styles.skillButtonTextActive
                        ]}>
                          {level}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.editActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setIsEditing(false)}
                  >
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSave}
                  >
                    <LinearGradient
                      colors={['#0F4C75', '#3282B8']}
                      style={styles.saveButtonGradient}
                    >
                      <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            </>
          )}
        </ThemedView>

        {/* Photos Section */}
        <ThemedView style={styles.mediaCard}>
          <ThemedText style={styles.sectionTitle}>📸 Photos</ThemedText>
          {renderImageGrid(user.photos || [], 'photo')}
        </ThemedView>

        {/* Highlights Section */}
        <ThemedView style={styles.mediaCard}>
          <ThemedText style={styles.sectionTitle}>🎥 Highlights</ThemedText>
          {renderImageGrid(user.highlights || [], 'highlight')}
        </ThemedView>

        {/* Stats Card */}
        <ThemedView style={styles.statsCard}>
          <ThemedText style={styles.sectionTitle}>🏀 Basketball Stats</ThemedText>
          
          <ThemedView style={styles.statsContainer}>
            <ThemedView style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{user.gamesPlayed}</ThemedText>
              <ThemedText style={styles.statLabel}>Games Played</ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Member Since</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Account Info */}
        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.sectionTitle}>📧 Account Information</ThemedText>
          
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Email</ThemedText>
            <ThemedText style={styles.infoValue}>{user.email}</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>User ID</ThemedText>
            <ThemedText style={styles.infoValue}>{user.id.substring(0, 8)}...</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Settings & Safety */}
        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.sectionTitle}>⚙️ Settings & Safety</ThemedText>

          <TouchableOpacity style={styles.settingsRow} onPress={openSupport}>
            <ThemedText style={styles.settingsRowText}>Contact Support</ThemedText>
            <ThemedText style={styles.settingsChevron}>›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/support')}>
            <ThemedText style={styles.settingsRowText}>Help Center</ThemedText>
            <ThemedText style={styles.settingsChevron}>›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/blocked-users')}>
            <ThemedText style={styles.settingsRowText}>Blocked Users</ThemedText>
            <ThemedText style={styles.settingsChevron}>›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/moderation')}>
            <ThemedText style={styles.settingsRowText}>Safety & Moderation</ThemedText>
            <ThemedText style={styles.settingsChevron}>›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/privacy')}>
            <ThemedText style={styles.settingsRowText}>Privacy Policy</ThemedText>
            <ThemedText style={styles.settingsChevron}>›</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsRow, styles.settingsRowLast]} onPress={() => router.push('/terms')}>
            <ThemedText style={styles.settingsRowText}>Terms of Service</ThemedText>
            <ThemedText style={styles.settingsChevron}>›</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutButtonText}>🚪 Logout</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <ThemedText style={styles.deleteAccountButtonText}>Delete Account</ThemedText>
        </TouchableOpacity>

        <ThemedView style={{ height: 120 }} />
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalClose}
            onPress={() => setPhotoModalVisible(false)}
          >
            <ThemedText style={styles.modalCloseText}>✕</ThemedText>
          </TouchableOpacity>
          {user.photos && user.photos[selectedImageIndex] && (
            <Image 
              source={{ uri: user.photos[selectedImageIndex] }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </ThemedView>
      </Modal>

      {/* Highlight Modal */}
      <Modal
        visible={highlightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHighlightModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalClose}
            onPress={() => setHighlightModalVisible(false)}
          >
            <ThemedText style={styles.modalCloseText}>✕</ThemedText>
          </TouchableOpacity>
          {user.highlights && user.highlights[selectedImageIndex] && (
            <Image 
              source={{ uri: user.highlights[selectedImageIndex] }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1F1F1F',
  },
  cameraEmoji: {
    fontSize: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  skillBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  skillText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  positionsContainer: {
    marginBottom: 20,
    width: '100%',
  },
  positionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  positionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  positionBadge: {
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.5)',
  },
  positionText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  positionButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  positionButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '500',
  },
  positionButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
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
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skillButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  skillButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skillButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mediaCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 12,
  },
  addImageButton: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  addImageLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImage: {
    width: width - 40,
    height: width - 40,
  },
  statsCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(220, 20, 60, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 20, 60, 0.3)',
  },
  logoutButtonText: {
    color: '#DC143C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowText: {
    color: '#fff',
    fontSize: 16,
  },
  settingsChevron: {
    color: '#888',
    fontSize: 22,
    fontWeight: '300',
  },
  deleteAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 20, 60, 0.5)',
  },
  deleteAccountButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
