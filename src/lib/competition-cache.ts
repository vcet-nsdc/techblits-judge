import { LeaderboardEntry } from '@/types/competition';

export interface SessionData {
  userId: string;
  role: string;
  labId?: string;
  assignedDomains?: string[];
  lastActivity: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface ScoreUpdate {
  timestamp: number;
  teamId: string;
  judgeId: string;
  scoreData: { marks: number; feedback?: string; submittedAt: string };
  processed: boolean;
}

export class CompetitionCacheService {
  private static instance: CompetitionCacheService;
  private store = new Map<string, CacheEntry<unknown>>();
  private queues = new Map<string, ScoreUpdate[]>();

  static getInstance(): CompetitionCacheService {
    if (!CompetitionCacheService.instance) {
      CompetitionCacheService.instance = new CompetitionCacheService();
    }
    return CompetitionCacheService.instance;
  }

  private get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  // --- Leaderboard ---

  async getLeaderboard(domainId: string, round: string): Promise<LeaderboardEntry[] | null> {
    return this.get<LeaderboardEntry[]>(`leaderboard:${domainId}:${round}`);
  }

  async setLeaderboard(domainId: string, round: string, entries: LeaderboardEntry[]): Promise<void> {
    this.set(`leaderboard:${domainId}:${round}`, entries, 1800); // 30 min
  }

  async invalidateLeaderboard(domainId: string, round: string): Promise<void> {
    this.store.delete(`leaderboard:${domainId}:${round}`);
  }

  // --- Sessions ---

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.get<SessionData>(`session:${sessionId}`);
  }

  async setSession(sessionId: string, data: SessionData): Promise<void> {
    this.set(`session:${sessionId}`, data, 3600); // 1 hour
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.store.delete(`session:${sessionId}`);
  }

  // --- Score update queue ---

  async queueScoreUpdate(domainId: string, round: string, teamId: string, judgeId: string, scoreData: {
    marks: number;
    feedback?: string;
    submittedAt: string;
  }): Promise<void> {
    const key = `score_queue:${domainId}:${round}`;
    const queue = this.queues.get(key) ?? [];
    queue.push({ timestamp: Date.now(), teamId, judgeId, scoreData, processed: false });
    this.queues.set(key, queue);
  }

  async getQueuedUpdates(domainId: string, round: string): Promise<ScoreUpdate[]> {
    const key = `score_queue:${domainId}:${round}`;
    const queue = this.queues.get(key) ?? [];
    return queue.filter(u => !u.processed);
  }

  async markUpdateProcessed(domainId: string, round: string, timestamp: number, teamId: string, judgeId: string): Promise<void> {
    const key = `score_queue:${domainId}:${round}`;
    const queue = this.queues.get(key) ?? [];
    const entry = queue.find(u => u.timestamp === timestamp && u.teamId === teamId && u.judgeId === judgeId);
    if (entry) entry.processed = true;
  }

  async clearProcessedUpdates(domainId: string, round: string): Promise<void> {
    const key = `score_queue:${domainId}:${round}`;
    const queue = this.queues.get(key) ?? [];
    this.queues.set(key, queue.filter(u => !u.processed));
  }

  // --- Bulk invalidation ---

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
    for (const key of this.queues.keys()) {
      if (regex.test(key)) this.queues.delete(key);
    }
  }

  async invalidateAll(): Promise<void> {
    this.store.clear();
    this.queues.clear();
  }

  async clearAllLeaderboards(): Promise<void> {
    await this.invalidatePattern('leaderboard:*');
  }

  async clearAllSessions(): Promise<void> {
    await this.invalidatePattern('session:.*');
  }

  async clearAllQueues(): Promise<void> {
    this.queues.clear();
  }
}

export const competitionCacheService = CompetitionCacheService.getInstance();
