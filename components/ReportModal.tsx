import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import SafetyService, {
  REPORT_REASONS,
  ReportReason,
  ReportTargetType,
} from '@/services/SafetyService';

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  onSubmitted?: () => void;
};

export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
  onSubmitted,
}: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit a report.');
      return;
    }
    if (!reason) {
      Alert.alert('Select a reason', 'Please choose why you are reporting this.');
      return;
    }

    setSubmitting(true);
    try {
      await SafetyService.submitReport({
        reporterId: user.id,
        reporterUsername: user.username,
        targetType,
        targetId,
        targetLabel,
        reason,
        details,
      });
      Alert.alert(
        'Report submitted',
        'Thanks for letting us know. Our team will review this. You can also block users from Profile → Blocked Users.'
      );
      reset();
      onSubmitted?.();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not submit the report. Please try again.');
      setSubmitting(false);
    }
  };

  const typeLabel =
    targetType === 'user'
      ? 'user'
      : targetType === 'game'
        ? 'game'
        : targetType === 'message'
          ? 'conversation'
          : 'review';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <ThemedView style={styles.sheet}>
          <ThemedText style={styles.title}>Report {typeLabel}</ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {targetLabel}
          </ThemedText>
          <ThemedText style={styles.helper}>
            Reports help keep BallOut safe. Choose the reason that best matches the issue.
          </ThemedText>

          <ScrollView style={styles.reasonList} showsVerticalScrollIndicator={false}>
            {REPORT_REASONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.reasonRow, reason === item && styles.reasonRowActive]}
                onPress={() => setReason(item)}
              >
                <ThemedText
                  style={[styles.reasonText, reason === item && styles.reasonTextActive]}
                >
                  {item}
                </ThemedText>
              </TouchableOpacity>
            ))}

            <ThemedText style={styles.detailsLabel}>Additional details (optional)</ThemedText>
            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              placeholder="Add context that helps us review this report"
              placeholderTextColor="#888"
              multiline
              maxLength={500}
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={submitting}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!reason || submitting) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!reason || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitText}>Submit Report</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#FF6B35',
    marginBottom: 8,
  },
  helper: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 16,
    lineHeight: 18,
  },
  reasonList: {
    maxHeight: 360,
  },
  reasonRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonRowActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#3A2A22',
  },
  reasonText: {
    color: '#ddd',
    fontSize: 14,
  },
  reasonTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  detailsLabel: {
    color: '#ccc',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  detailsInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
