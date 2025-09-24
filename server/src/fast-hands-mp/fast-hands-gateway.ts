import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './fast-hands-mp.service';
import { Injectable, Logger } from '@nestjs/common';
import { Player } from '../interfaces/player.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateWay implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger();

  // Keep track of all active games by room ID
  private activeGames: Map<string, { players: Map<string, Player>, gameStarted: boolean }> = new Map();

  private updateLoops: Map<string, NodeJS.Timeout> = new Map();
  private readonly UPDATE_RATE = 50;

  constructor(private readonly gameService: GameService) { }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Find all rooms this player is in and remove them
    for (const [roomId, game] of this.activeGames.entries()) {
      if (game.players.has(client.id)) {
        game.players.delete(client.id);

        // Notify other players that this player has left
        client.to(roomId).emit('playerLeft', { playerId: client.id });

        // If no players left, remove the game
        if (game.players.size === 0) {
          const updateLoop = this.updateLoops.get(roomId);
          if (updateLoop) {
            clearInterval(updateLoop);
            this.updateLoops.delete(roomId);
            this.logger.log(`Stopped game state update loop for room: ${roomId}`);
          }
          
          this.activeGames.delete(roomId);
          this.gameService.stopGame(roomId);
        }

        // Leave the room
        client.leave(roomId);
      }
    }
  }

  @SubscribeMessage('createGame')
  handleCreateGame(@ConnectedSocket() client: Socket): { roomId: string } {
    const roomId = this.generateRoomId();

    // Create a new game room
    this.activeGames.set(roomId, {
      players: new Map([[client.id, { id: client.id, position: 'left', health: 15, score: 0, ready: false }]]),
      gameStarted: false
    });

    client.join(roomId);

    return { roomId };
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ): { success: boolean, error?: string, position?: string, players?: any[] } {
    const game = this.activeGames.get(data.roomId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.gameStarted) {
      return { success: false, error: 'Game already started' };
    }

    if (game.players.size >= 2) {
      return { success: false, error: 'Game is full' };
    }

    // Determine player position (left or right)
    const position = game.players.size === 0 ? 'left' :
      !Array.from(game.players.values()).some(p => p.position === 'left') ? 'left' : 'right';

    // Add player to game
    game.players.set(client.id, {
      id: client.id,
      position,
      health: 15,
      score: 0,
      ready: false
    });

    client.join(data.roomId);

    // Notify other players that a new player has joined
    client.to(data.roomId).emit('playerJoined', {
      playerId: client.id,
      position
    });

    if (game.players.size === 2) {
      return {
        success: true,
        position,
        players: Array.from(game.players.values())
      };
    }

    return { success: true, position };
  }

  @SubscribeMessage('playerReady')
  handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ): { success: boolean } {
    const game = this.activeGames.get(data.roomId);

    if (!game || !game.players.has(client.id)) {
      this.logger.warn(`PlayerReady attempt failed: Player ${client.id} or Room ${data.roomId} not found.`);
      return { success: false };
    }

    // Mark player as ready
    const player = game.players.get(client.id);
    player.ready = player.ready ? false : true;
    if (player.ready) {
      this.logger.log('Player marked ready.', `Room: ${data.roomId}`, `PlayerID: ${client.id}`);
    }else{
      this.logger.log('Player marked unready.', `Room: ${data.roomId}`, `PlayerID: ${client.id}`);
    }
    game.players.set(client.id, player);


    // Check if all players are ready
    const allReady = Array.from(game.players.values()).every(p => p.ready);
    if (allReady && game.players.size === 2) {
      // Start the game
      game.gameStarted = true;

      // Initialize the game state
      this.gameService.initializeGame(data.roomId, Array.from(game.players.values()));

      // Notify all players that the game has started
      this.server.to(data.roomId).emit('gameStarted', {
        players: Array.from(game.players.values())
      });

      const updateLoop = setInterval(() => {
        const gameState = this.gameService.getGameState(data.roomId);
        if (gameState) {
          // Broadcast the current game state to all clients in the room
          this.server.to(data.roomId).emit('gameStateUpdate', gameState);
        }
      }, this.UPDATE_RATE);
      
      this.updateLoops.set(data.roomId, updateLoop);
      this.logger.log(`Started game state update loop for room: ${data.roomId}`);
    }

    this.server.to(data.roomId).emit('playerReadyUpdate', {
      playerId: client.id,
      ready: player.ready
    });

    return { success: true };
  }

  @SubscribeMessage('keyPress')
  handleKeyPress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string, key: string }
  ): void {
    const game = this.activeGames.get(data.roomId);

    if (!game || !game.gameStarted || !game.players.has(client.id)) {
      return;
    }

    const player = game.players.get(client.id);
    const result = this.gameService.handleKeyPress(data.roomId, player, data.key);

    // If there's a result, broadcast it to all players in the room
    Logger.log(result);
    if (result) {
      this.server.to(data.roomId).emit('keyPressResult', {
        playerId: client.id,
        ...result
      });
    }
  }

  @SubscribeMessage('clickVulture')
  handleClickVulture(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string, vultureId: number }
  ): void {
    const game = this.activeGames.get(data.roomId);

    if (!game || !game.gameStarted || !game.players.has(client.id)) {
      return;
    }

    const player = game.players.get(client.id);
    const result = this.gameService.handleVultureClick(data.roomId, player, data.vultureId);

    if (result) {
      this.server.to(data.roomId).emit('vultureClickResult', {
        playerId: client.id,
        ...result
      });
    }
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
