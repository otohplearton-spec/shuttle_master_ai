
export enum Gender {
  MALE = '男',
  FEMALE = '女',
  OTHER = '其他'
}

export type SortAlgorithm = 'normal' | 'mixed' | 'avoid_repeat';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  level: number; // 1-15
  gamesPlayed: number;
  targetGames?: number; // Default 6
  isPaused?: boolean;
}

export interface Match {
  team1: string[]; // Player IDs
  team2: string[]; // Player IDs
}

export interface Court {
  id: string;
  name: string;
  players: string[]; // Currently active players (team1 + team2)
  isActive: boolean;
  startTime?: number;
}

export interface MatchHistory {
  timestamp: number;
  players: string[]; // All 4 participants
  teams: [string[], string[]];
  duration?: number; // Match duration in seconds
  score?: [number, number]; // [team1Score, team2Score]
}

export interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string; // Optional URL for profile picture
  isPro: boolean;
  expiryDate?: string;
}


export interface Promotion {
  planId: string;
  salePrice: number;
  label: string;
  startDate?: string;
  endDate?: string;
}
