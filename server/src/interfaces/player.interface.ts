export interface Player {
  id: string;
  position: 'left' | 'right';
  health: number;
  score: number;
  ready?: boolean;
  typing?: {
    currentWord: string;
    activeAntId: number | null;
  };
  accuracy?: {
    correct: number;
    total: number;
  };
}
