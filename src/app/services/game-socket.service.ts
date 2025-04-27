import { Injectable } from '@angular/core';
import { environment } from '../../environment';
import { Socket, io } from 'socket.io-client';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameSocketService {
  private socket: Socket | null = null;
  private roomId: string = '';
  private playerId: string = '';
  private playerPosition: 'left' | 'right' = 'left';

  // Observables to expose events to components
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private playerJoinedSubject = new Subject<any>();
  private playerLeftSubject = new Subject<any>();
  private gameStartedSubject = new Subject<any>();
  private gameStateUpdateSubject = new Subject<any>();
  private keyPressResultSubject = new Subject<any>();
  private vultureClickResultSubject = new Subject<any>();

  // Public observables
  public connected$ = this.connectedSubject.asObservable();
  public playerJoined$ = this.playerJoinedSubject.asObservable();
  public playerLeft$ = this.playerLeftSubject.asObservable();
  public gameStarted$ = this.gameStartedSubject.asObservable();
  public gameStateUpdate$ = this.gameStateUpdateSubject.asObservable();
  public keyPressResult$ = this.keyPressResultSubject.asObservable();
  public vultureClickResult$ = this.vultureClickResultSubject.asObservable();

  constructor() {}

  // Connect to the socket server
  connect(): void {
    if (this.socket) return; // Already connected

    this.socket = io(environment.apiUrl);

    this.setupSocketListeners();
  }

  // Disconnect from the socket server
  disconnect(): void {
    if (!this.socket) return;

    this.socket.disconnect();
    this.socket = null;
    this.connectedSubject.next(false);
  }

  // Set up event listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.playerId = this.socket!.id;
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.connectedSubject.next(false);
    });

    this.socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      this.playerJoinedSubject.next(data);
    });

    this.socket.on('playerLeft', (data) => {
      console.log('Player left:', data);
      this.playerLeftSubject.next(data);
    });

    this.socket.on('gameStarted', (data) => {
      console.log('Game started:', data);
      this.gameStartedSubject.next(data);
    });

    this.socket.on('gameStateUpdate', (data) => {
      this.gameStateUpdateSubject.next(data);
    });

    this.socket.on('keyPressResult', (data) => {
      this.keyPressResultSubject.next(data);
    });

    this.socket.on('vultureClickResult', (data) => {
      this.vultureClickResultSubject.next(data);
    });
  }

  // Create a new game room
  createGame(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject('Not connected to server');
        return;
      }

      this.socket.emit('createGame', {}, (response: { roomId: string }) => {
        if (response && response.roomId) {
          this.roomId = response.roomId;
          this.playerPosition = 'left'; // Creator is always left player
          resolve(response.roomId);
        } else {
          reject('Failed to create game room');
        }
      });
    });
  }

  // Join an existing game room
  joinGame(roomId: string): Promise<{ success: boolean, position?: string, error?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject('Not connected to server');
        return;
      }

      this.socket.emit('joinGame', { roomId }, (response: any) => {
        if (response.success) {
          this.roomId = roomId;
          this.playerPosition = response.position;
          resolve({ success: true, position: response.position });
        } else {
          reject(response.error || 'Failed to join game room');
        }
      });
    });
  }

  // Mark player as ready
  markReady(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected || !this.roomId) {
        reject('Not in a game room');
        return;
      }

      this.socket.emit('playerReady', { roomId: this.roomId }, (response: { success: boolean }) => {
        if (response && response.success) {
          resolve(true);
        } else {
          reject('Failed to mark as ready');
        }
      });
    });
  }

  // Send key press to server
  sendKeyPress(key: string): void {
    if (!this.socket || !this.socket.connected || !this.roomId) {
      return;
    }

    this.socket.emit('keyPress', { roomId: this.roomId, key });
  }

  // Send vulture click to server
  sendVultureClick(vultureId: number): void {
    if (!this.socket || !this.socket.connected || !this.roomId) {
      return;
    }

    this.socket.emit('clickVulture', { roomId: this.roomId, vultureId });
  }

  // Getters for service state
  get isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  get currentRoomId(): string {
    return this.roomId;
  }

  get currentPlayerId(): string {
    return this.playerId;
  }

  get currentPlayerPosition(): 'left' | 'right' {
    return this.playerPosition;
  }
}
