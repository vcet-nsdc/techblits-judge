import type { Evaluation, Team } from "@/db/schema";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private static instance: CacheService;
  private store = new Map<string, CacheEntry<unknown>>();

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
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

  private del(key: string): void {
    this.store.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async getTeams(): Promise<Team[] | null> {
    return this.get<Team[]>("teams:all");
  }

  async setTeams(teamsData: Team[]): Promise<void> {
    this.set("teams:all", teamsData, 300);
  }

  async getTeam(id: number): Promise<Team | null> {
    return this.get<Team>(`team:${id}`);
  }

  async setTeam(id: number, teamData: Team): Promise<void> {
    this.set(`team:${id}`, teamData, 600);
  }

  async getEvaluations(): Promise<Evaluation[] | null> {
    return this.get<Evaluation[]>("evaluations:all");
  }

  async setEvaluations(evaluationsData: Evaluation[]): Promise<void> {
    this.set("evaluations:all", evaluationsData, 300);
  }

  async invalidateTeamCache(teamId?: number): Promise<void> {
    if (teamId) {
      this.del(`team:${teamId}`);
    }
    this.del("teams:all");
  }

  async invalidateEvaluationCache(): Promise<void> {
    this.del("evaluations:all");
  }

  async invalidateAll(): Promise<void> {
    this.store.clear();
  }
}

export const cacheService = CacheService.getInstance();
