export interface VultureEntity {
  id: number;
  x: number;
  y: number;
  number: number;
  clicked: boolean;
  group: number;
  side: 'left' | 'right'; // Which player can click this vulture
}
