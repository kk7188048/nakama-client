export interface Player {
    userId: string;
    username: string;
    symbol: 'X' | 'O';
    sessionId: string;
  }
  
  export interface GameState {
    board: (string | null)[];
    players: Player[];
    currentTurn: number;
    winner: string | null;
    gameStatus: 'waiting' | 'active' | 'completed';
    startTime: number;
    moveHistory: any[];
  }
  
  export interface LeaderboardEntry {
    userId: string;
    username: string;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }
  