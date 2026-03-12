export enum CompetitionRound {
  LAB_ROUND = 'lab_round',
  FINALS = 'finals'
}

export enum JudgeRole {
  LAB_ROUND = 'lab_round',
  SEMINAR_HALL = 'seminar_hall',
  ADMIN = 'admin'
}

export enum VenueType {
  LAB = 'lab',
  SEMINAR_HALL = 'seminar_hall'
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  labId: string;
  domainId: string;
  totalScore: number;
  rank: number;
  lastUpdated: Date;
  judgeCount?: number;
}

export interface ScoreSubmission {
  teamId: string;
  marks: number;
  feedback?: string;
  round: CompetitionRound;
  criteria?: Array<{ name: string; marks: number }>;
}

export interface CompetitionState {
  currentRound: CompetitionRound;
  roundStartTime: Date;
  roundEndTime: Date;
  isRoundActive: boolean;
  canSubmitScores: boolean;
}

export interface JWTPayload {
  userId: string;
  role: 'judge' | 'admin';
  labId?: string;
  assignedDomains?: string[];
  judgeRole?: string;
  isSeminarHallJudge?: boolean;
  exp?: number;
  iat?: number;
}
