
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useReputation } from '@/contexts/ReputationContext';
import { useAuth } from '@/contexts/AuthContext';
import ReportModal from '@/components/ReportModal';

const { width } = Dimensions.get('window');

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  reviewedUserId: string;
  reviewedUserName: string;
  gameId: string;
  onSubmit: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  reviewedUserId,
  reviewedUserName,
  gameId,
  onSubmit,
}) => {
  const { submitReview } = useReputation();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    skillLevel: 0,
    teamwork: 0,
    sportsmanship: 0,
    punctuality: 0,
  });
  const [isAnonymous, setIsAnonymous] = useState(true);

  const resetForm = () => {
    setRating(0);
    setComment('');
    setCategories({
      skillLevel: 0,
      teamwork: 0,
      sportsmanship: 0,
      punctuality: 0,
    });
    setIsAnonymous(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (rating === 0 || Object.values(categories).some(val => val === 0)) {
      Alert.alert('Error', 'Please provide ratings for all categories');
      return;
    }

    const success = await submitReview({
      gameId,
      reviewerId: user.id,
      reviewedUserId,
      rating,
      comment: comment.trim() || undefined,
      categories,
      isAnonymous,
    });

    if (success) {
      Alert.alert('Success', 'Review submitted successfully!');
      resetForm();
      onSubmit();
      onClose();
    } else {
      Alert.alert('Error', 'Failed to submit review. You may have already reviewed this player.');
    }
  };

  const renderStarRating = (value: number, onPress: (rating: number) => void) => (
    <ThemedView style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onPress(star)}>
          <ThemedText style={[styles.star, star <= value && styles.starFilled]}>
            ★
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ThemedView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.modalContainer}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E', '#0F4C75']}
          style={styles.modalHeader}
        >
          <ThemedText style={styles.modalTitle}>Rate {reviewedUserName}</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Overall Rating */}
          <ThemedView style={styles.ratingSection}>
            <ThemedText style={styles.ratingLabel}>Overall Rating</ThemedText>
            {renderStarRating(rating, setRating)}
          </ThemedView>

          {/* Category Ratings */}
          <ThemedView style={styles.categorySection}>
            <ThemedText style={styles.sectionTitle}>Category Ratings</ThemedText>
            
            <ThemedView style={styles.categoryItem}>
              <ThemedText style={styles.categoryLabel}>Skill Level</ThemedText>
              {renderStarRating(categories.skillLevel, (val) => 
                setCategories(prev => ({ ...prev, skillLevel: val }))
              )}
            </ThemedView>

            <ThemedView style={styles.categoryItem}>
              <ThemedText style={styles.categoryLabel}>Teamwork</ThemedText>
              {renderStarRating(categories.teamwork, (val) => 
                setCategories(prev => ({ ...prev, teamwork: val }))
              )}
            </ThemedView>

            <ThemedView style={styles.categoryItem}>
              <ThemedText style={styles.categoryLabel}>Sportsmanship</ThemedText>
              {renderStarRating(categories.sportsmanship, (val) => 
                setCategories(prev => ({ ...prev, sportsmanship: val }))
              )}
            </ThemedView>

            <ThemedView style={styles.categoryItem}>
              <ThemedText style={styles.categoryLabel}>Punctuality</ThemedText>
              {renderStarRating(categories.punctuality, (val) => 
                setCategories(prev => ({ ...prev, punctuality: val }))
              )}
            </ThemedView>
          </ThemedView>

          {/* Comment */}
          <ThemedView style={styles.commentSection}>
            <ThemedText style={styles.sectionTitle}>Comment (Optional)</ThemedText>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
          </ThemedView>

          {/* Anonymous Toggle */}
          <ThemedView style={styles.anonymousSection}>
            <TouchableOpacity 
              style={styles.anonymousToggle}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <ThemedView style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                {isAnonymous && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </ThemedView>
              <ThemedText style={styles.anonymousText}>Submit as anonymous</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <LinearGradient
              colors={['#0F4C75', '#3282B8']}
              style={styles.submitButtonGradient}
            >
              <ThemedText style={styles.submitButtonText}>Submit Review</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
};

export default function ReputationScreen() {
  const { getAllReputations } = useReputation();
  const [reputations, setReputations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'user' | 'review';
    id: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    loadReputations();
  }, []);

  const loadReputations = async () => {
    setLoading(true);
    try {
      const data = await getAllReputations();
      setReputations(data.sort((a, b) => b.averageRating - a.averageRating));
    } catch (error) {
      console.error('Error loading reputations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <ThemedText key={i} style={[styles.star, i <= rating && styles.starFilled]}>
          ★
        </ThemedText>
      );
    }
    return stars;
  };

  const renderReputationCard = (reputation: any) => (
    <TouchableOpacity
      key={reputation.userId}
      style={styles.reputationCard}
      onPress={() => setSelectedUser(reputation)}
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedText style={styles.userName}>Player #{reputation.userId.slice(-6)}</ThemedText>
        <ThemedView style={styles.ratingContainer}>
          <ThemedView style={styles.starsRow}>
            {renderStars(Math.round(reputation.averageRating))}
          </ThemedView>
          <ThemedText style={styles.ratingText}>
            {reputation.averageRating.toFixed(1)} ({reputation.totalReviews} reviews)
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.categoriesRow}>
        <ThemedView style={styles.categoryChip}>
          <ThemedText style={styles.categoryChipText}>
            Skill: {reputation.categoryAverages.skillLevel.toFixed(1)}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.categoryChip}>
          <ThemedText style={styles.categoryChipText}>
            Team: {reputation.categoryAverages.teamwork.toFixed(1)}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.categoryChip}>
          <ThemedText style={styles.categoryChipText}>
            Sport: {reputation.categoryAverages.sportsmanship.toFixed(1)}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <TouchableOpacity
        style={styles.reportLink}
        onPress={(e) => {
          e.stopPropagation?.();
          setReportTarget({
            type: 'user',
            id: reputation.userId,
            label: `Player #${reputation.userId.slice(-6)}`,
          });
        }}
      >
        <ThemedText style={styles.reportLinkText}>Report Player</ThemedText>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F4C75']}
        style={styles.header}
      >
        <ThemedText style={styles.headerEmoji}>⭐</ThemedText>
        <ThemedText style={styles.headerTitle}>Player Reputation</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Anonymous player reviews and ratings</ThemedText>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>Loading reputations...</ThemedText>
          </ThemedView>
        ) : reputations.length > 0 ? (
          reputations.map(renderReputationCard)
        ) : (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>📊</ThemedText>
            <ThemedText style={styles.emptyTitle}>No Reviews Yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Play some games and start reviewing other players to build the reputation system!
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>

      {/* User Detail Modal */}
      {selectedUser && (
        <Modal visible={!!selectedUser} animationType="slide" presentationStyle="pageSheet">
          <ThemedView style={styles.modalContainer}>
            <LinearGradient
              colors={['#1A1A2E', '#16213E', '#0F4C75']}
              style={styles.modalHeader}
            >
              <ThemedText style={styles.modalTitle}>
                Player #{selectedUser.userId.slice(-6)} Reviews
              </ThemedText>
              <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.closeButton}>
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalContent}>
              {selectedUser.reviews.map((review: any) => (
                <ThemedView key={review.id} style={styles.reviewCard}>
                  <ThemedView style={styles.reviewHeader}>
                    <ThemedView style={styles.starsRow}>
                      {renderStars(review.rating)}
                    </ThemedView>
                    <ThemedText style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </ThemedView>
                  
                  {review.comment && (
                    <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>
                  )}

                  <ThemedView style={styles.reviewCategories}>
                    <ThemedView style={styles.categoryChip}>
                      <ThemedText style={styles.categoryChipText}>
                        Skill: {review.categories.skillLevel}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.categoryChip}>
                      <ThemedText style={styles.categoryChipText}>
                        Team: {review.categories.teamwork}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.categoryChip}>
                      <ThemedText style={styles.categoryChipText}>
                        Sport: {review.categories.sportsmanship}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.categoryChip}>
                      <ThemedText style={styles.categoryChipText}>
                        Time: {review.categories.punctuality}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>
              ))}
            </ScrollView>
          </ThemedView>
        </Modal>
      )}

      {/* Report modal for users/reviews */}
      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type || 'user'}
        targetId={reportTarget?.id || ''}
        targetLabel={reportTarget?.label || ''}
      />
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  reputationCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 1,
  },
  starFilled: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
  },
  reportLink: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  reportLinkText: {
    color: '#FF8A65',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  starContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  anonymousSection: {
    marginBottom: 24,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkmark: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  anonymousText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  reviewCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  reviewComment: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
