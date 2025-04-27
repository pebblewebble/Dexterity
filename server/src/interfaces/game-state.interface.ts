import { Player } from './player.interface';
import { AntEntity } from '../entities/ant.entity';
import { VultureEntity } from '../entities/vulture.entity';

export interface GameState {
  roomId: string;
  players: { [id: string]: Player };
  ants: AntEntity[];
  vultures: VultureEntity[];
  gameTime: number;
  antIdCounter: number;
  vultureIdCounter: number;
  vultureGroups: number;
  currentVultureSequences: { [playerId: string]: number };
  currentVultureGroups: { [playerId: string]: number };
  difficulty: {
    level: number;
    maxLevel: number;
    levelStartTime: number;
    timeBetweenLevels: number[];
  };
  isGameOver: boolean;
  startTime: number;
  tickCounter: number;
  antSpawnCounter: number;
  vultureSpawnCounter: number;
  nextVultureSpawnTime: number;
}
