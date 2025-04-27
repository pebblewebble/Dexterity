export interface AntEntity {
  id: number;
  x: number;
  y: number;
  word: string;
  remainingWord: string;
  isActive: boolean;
  typeDirection: 'left' | 'right'; // Which player can type this ant
  direction: number; // 1 = moving right, -1 = moving left
}
