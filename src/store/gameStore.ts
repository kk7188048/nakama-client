import { create } from 'zustand';
import type { GameState, Player } from '../types/game.types';

interface GameStore {
  gameState: GameState | null;
  matchId: string | null;
  currentPlayer: Player | null;
  setGameState: (state: GameState) => void;
  setMatchId: (id: string) => void;
  setCurrentPlayer: (player: Player) => void;
  updateBoard: (board: (string | null)[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  matchId: null,
  currentPlayer: null,
  setGameState: (state) => set({ gameState: state }),
  setMatchId: (id) => set({ matchId: id }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  updateBoard: (board) =>
    set((state) => ({
      gameState: state.gameState ? { ...state.gameState, board } : null,
    })),
  reset: () => set({ gameState: null, matchId: null, currentPlayer: null }),
}));
