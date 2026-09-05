import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SafetyService, { SafetyReport } from '@/services/SafetyService';
import GameService from '@/services/GameService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple on-device moderation queue for App Store UGC safety.
 * Reports are stored locally and also emailed to support@.
 */
export default function ModerationScreen() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    setReports(await SafetyService.getReports());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleDismiss = (report: SafetyReport) => {
    Alert.alert('Dismiss report', 'Mark this report as reviewed with no action?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        onPress: async () => {
          await SafetyService.updateReportStatus(report.id, 'dismissed');
          await loadReports();
        },
      },
    ]);
  };

  const handleRemoveContent = (report: SafetyReport) => {
    Alert.alert(
      'Remove content',
      `Remove or disable the reported ${report.targetType} "${report.targetLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            if (report.targetType === 'game') {
              await GameService.removeGame(report.targetId);
            } else if (report.targetType === 'user') {
              await SafetyService.disableUser(report.targetId);
            } else if (report.targetType === 'review') {
              try {
                const raw = await AsyncStorage.getItem('basketball_app_reviews');
                if (raw) {
                  const reviews = JSON.parse(raw).filter(
                    (r: { id: string }) => r.id !== report.targetId
                  );
                  await AsyncStorage.setItem(
                    'basketball_app_reviews',
                    JSON.stringify(reviews)
                  );
                }
              } catch {
                // ignore storage failures
              }
            }

            await SafetyService.updateReportStatus(
              report.id,
              report.targetType === 'user' ? 'resolved_disabled' : 'resolved_removed'
            );
            await loadReports();
            Alert.alert('Done', 'Moderation action applied.');
          },
        },
      ]
    );
  };

  const openReports = reports.filter((r) => r.status === 'open');
  const closedReports = reports.filter((r) => r.status !== 'open');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Safety & Moderation', headerShown: true }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText style={styles.helper}>
          Review reports submitted on this device. Reports are also sent to{' '}
          {SafetyService.getSupportEmail()} when a mail app is available.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>Open reports ({openReports.length})</ThemedText>
        {openReports.length === 0 ? (
          <ThemedText style={styles.empty}>No open reports.</ThemedText>
        ) : (
          openReports.map((report) => (
            <View key={report.id} style={styles.card}>
              <ThemedText style={styles.badge}>{report.targetType.toUpperCase()}</ThemedText>
              <ThemedText style={styles.label}>{report.targetLabel}</ThemedText>
              <ThemedText style={styles.meta}>Reason: {report.reason}</ThemedText>
              <ThemedText style={styles.meta}>
                By @{report.reporterUsername} · {new Date(report.createdAt).toLocaleString()}
              </ThemedText>
              {!!report.details && (
                <ThemedText style={styles.details}>{report.details}</ThemedText>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveContent(report)}
                >
                  <ThemedText style={styles.actionText}>
                    {report.targetType === 'user' ? 'Disable User' : 'Remove Content'}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => handleDismiss(report)}
                >
                  <ThemedText style={styles.actionText}>Dismiss</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>
          Resolved ({closedReports.length})
        </ThemedText>
        {closedReports.slice(0, 20).map((report) => (
          <View key={report.id} style={[styles.card, styles.cardMuted]}>
            <ThemedText style={styles.label}>{report.targetLabel}</ThemedText>
            <ThemedText style={styles.meta}>
              {report.status.replace(/_/g, ' ')} · {report.reason}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 20, paddingBottom: 40 },
  helper: { color: '#aaa', marginBottom: 20, lineHeight: 20 },
  sectionTitle: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: { color: '#888', marginBottom: 12 },
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardMuted: { opacity: 0.7 },
  badge: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  meta: { color: '#999', fontSize: 12, marginBottom: 2 },
  details: { color: '#ccc', marginTop: 8, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  removeButton: {
    flex: 1,
    backgroundColor: '#B00020',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
