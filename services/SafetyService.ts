import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Linking } from 'react-native';

export type ReportTargetType = 'user' | 'game' | 'message' | 'review';

export type ReportReason =
  | 'Harassment or bullying'
  | 'Hate speech or discrimination'
  | 'Inappropriate or sexual content'
  | 'Spam or scams'
  | 'Fake or misleading content'
  | 'Violence or threats'
  | 'Other';

export type ReportStatus =
  | 'open'
  | 'resolved_removed'
  | 'resolved_disabled'
  | 'dismissed';

export interface SafetyReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  details: string;
  createdAt: string;
  status: ReportStatus;
}

export interface BlockRecord {
  blockerId: string;
  blockedUserId: string;
  blockedUsername: string;
  createdAt: string;
}

export const REPORT_REASONS: ReportReason[] = [
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Inappropriate or sexual content',
  'Spam or scams',
  'Fake or misleading content',
  'Violence or threats',
  'Other',
];

/** Existing support address already used in Privacy / Terms / Support screens. */
export const SUPPORT_EMAIL = 'support@runitbasketball.com';

const REPORTS_KEY = 'ballout_safety_reports';
const BLOCKS_KEY = 'ballout_blocked_users';
const DISABLED_USERS_KEY = 'ballout_disabled_users';

class SafetyService {
  private static instance: SafetyService;

  static getInstance(): SafetyService {
    if (!SafetyService.instance) {
      SafetyService.instance = new SafetyService();
    }
    return SafetyService.instance;
  }

  getSupportEmail(): string {
    return SUPPORT_EMAIL;
  }

  async openSupportEmail(subject?: string, body?: string): Promise<void> {
    const query = [
      subject ? `subject=${encodeURIComponent(subject)}` : null,
      body ? `body=${encodeURIComponent(body)}` : null,
    ]
      .filter(Boolean)
      .join('&');

    const url = query
      ? `mailto:${SUPPORT_EMAIL}?${query}`
      : `mailto:${SUPPORT_EMAIL}`;

    await Linking.openURL(url);
  }

  async getReports(): Promise<SafetyReport[]> {
    try {
      const raw = await AsyncStorage.getItem(REPORTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveReports(reports: SafetyReport[]): Promise<void> {
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  }

  async submitReport(input: {
    reporterId: string;
    reporterUsername: string;
    targetType: ReportTargetType;
    targetId: string;
    targetLabel: string;
    reason: ReportReason;
    details?: string;
  }): Promise<SafetyReport> {
    const report: SafetyReport = {
      id: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${input.reporterId}-${input.targetId}-${Date.now()}`
      ),
      reporterId: input.reporterId,
      reporterUsername: input.reporterUsername,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      reason: input.reason,
      details: input.details?.trim() || '',
      createdAt: new Date().toISOString(),
      status: 'open',
    };

    const reports = await this.getReports();
    reports.unshift(report);
    await this.saveReports(reports);

    try {
      await this.openSupportEmail(
        `BallOut Report: ${input.targetType} — ${input.reason}`,
        [
          `Report ID: ${report.id}`,
          `Type: ${input.targetType}`,
          `Target: ${input.targetLabel} (${input.targetId})`,
          `Reason: ${input.reason}`,
          `Reporter: @${input.reporterUsername} (${input.reporterId})`,
          `Details: ${report.details || '(none)'}`,
          `Submitted: ${report.createdAt}`,
        ].join('\n')
      );
    } catch {
      // Local report is still saved if mail cannot open.
    }

    return report;
  }

  async updateReportStatus(reportId: string, status: ReportStatus): Promise<boolean> {
    const reports = await this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index === -1) return false;
    reports[index] = { ...reports[index], status };
    await this.saveReports(reports);
    return true;
  }

  async getOpenReports(): Promise<SafetyReport[]> {
    return (await this.getReports()).filter((r) => r.status === 'open');
  }

  async getBlocks(): Promise<BlockRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(BLOCKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveBlocks(blocks: BlockRecord[]): Promise<void> {
    await AsyncStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
  }

  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    return (await this.getBlocks())
      .filter((b) => b.blockerId === blockerId)
      .map((b) => b.blockedUserId);
  }

  async getHiddenUserIds(userId: string): Promise<string[]> {
    const hidden = new Set<string>();
    for (const block of await this.getBlocks()) {
      if (block.blockerId === userId) hidden.add(block.blockedUserId);
      if (block.blockedUserId === userId) hidden.add(block.blockerId);
    }
    return Array.from(hidden);
  }

  async getBlockedUsers(blockerId: string): Promise<BlockRecord[]> {
    return (await this.getBlocks()).filter((b) => b.blockerId === blockerId);
  }

  async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    return (await this.getBlocks()).some(
      (b) =>
        (b.blockerId === userA && b.blockedUserId === userB) ||
        (b.blockerId === userB && b.blockedUserId === userA)
    );
  }

  async blockUser(
    blockerId: string,
    blockedUserId: string,
    blockedUsername: string
  ): Promise<boolean> {
    if (blockerId === blockedUserId) return false;
    const blocks = await this.getBlocks();
    if (
      blocks.some(
        (b) => b.blockerId === blockerId && b.blockedUserId === blockedUserId
      )
    ) {
      return true;
    }
    blocks.push({
      blockerId,
      blockedUserId,
      blockedUsername,
      createdAt: new Date().toISOString(),
    });
    await this.saveBlocks(blocks);
    return true;
  }

  async unblockUser(blockerId: string, blockedUserId: string): Promise<boolean> {
    const blocks = await this.getBlocks();
    await this.saveBlocks(
      blocks.filter(
        (b) => !(b.blockerId === blockerId && b.blockedUserId === blockedUserId)
      )
    );
    return true;
  }

  async getDisabledUserIds(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(DISABLED_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async disableUser(userId: string): Promise<void> {
    const ids = await this.getDisabledUserIds();
    if (!ids.includes(userId)) {
      ids.push(userId);
      await AsyncStorage.setItem(DISABLED_USERS_KEY, JSON.stringify(ids));
    }
  }

  async enableUser(userId: string): Promise<void> {
    const ids = await this.getDisabledUserIds();
    await AsyncStorage.setItem(
      DISABLED_USERS_KEY,
      JSON.stringify(ids.filter((id) => id !== userId))
    );
  }

  async isUserDisabled(userId: string): Promise<boolean> {
    return (await this.getDisabledUserIds()).includes(userId);
  }

  async purgeUserData(userId: string): Promise<void> {
    const reports = await this.getReports();
    await this.saveReports(
      reports.filter((r) => r.reporterId !== userId && r.targetId !== userId)
    );
    const blocks = await this.getBlocks();
    await this.saveBlocks(
      blocks.filter((b) => b.blockerId !== userId && b.blockedUserId !== userId)
    );
    await this.enableUser(userId);
  }
}

export default SafetyService.getInstance();
