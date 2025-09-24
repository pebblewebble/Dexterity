import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Assets, Application, AnimatedSprite, Sprite, Spritesheet, TexturePool, Texture, Container, Text, Graphics, TextStyle } from 'pixi.js';
import { environment } from '../../../environment';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { Socket, io } from 'socket.io-client';
import { JoinGameResponse } from './interfaces/fast-hands-mp.interface'

interface AntWithText {
  id: number;
  ant: AnimatedSprite;
  text: Text;
  word: string;
  remainingWord: string;
  typeDirection: 'left' | 'right';
}

interface VultureWithText {
  id: number;
  vulture: AnimatedSprite;
  text: Text;
  number: number;
  clicked: boolean;
  group: number;
  side: 'left' | 'right';
}

interface Player {
  id: string;
  position: 'left' | 'right';
  health: number;
  score: number;
  ready: boolean;
  typing?: {
    currentWord: string;
    activeAntId: number | null;
  };
  accuracy?: {
    correct: number;
    total: number;
  };
}

@Component({
  selector: 'app-fast-hands-mp',
  imports: [CommonModule, FormsModule],
  templateUrl: './fast-hands-mp.component.html',
  styleUrl: './fast-hands-mp.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class FastHandsMpComponent implements OnInit, OnDestroy {
  @ViewChild('popupElement') popupElement!: ElementRef;
  @ViewChild('gameCanvas') gameCanvasRef!: ElementRef;

  // Game setup
  private app: Application | null = null;
  private gameContainer!: Container;
  private floorContainer!: Container;
  private players: { [id: string]: Container } = {};
  private playerIdleAnimations: { [id: string]: AnimatedSprite } = {};
  private antSpriteSheet!: Spritesheet;
  private ants: AntWithText[] = [];
  private vultureSpriteSheet!: Spritesheet;
  private vultures: VultureWithText[] = [];
  private playerIdleSpriteSheet!: Spritesheet;
  private spritesheet!: Spritesheet;

  // Game state
  public roomId: string = '';
  private socket: Socket | null = null;
  private playerId: string = '';
  public playerPosition: 'left' | 'right' = 'left';
  public opponents: Player[] = [];
  public gameStarted: boolean = false;
  private isGameOver: boolean = false;
  public gameOutcome: string = "";
  public opponentFinalScore: number = 0;

  // Keyboard state tracking
  private keysPressed: { [key: string]: boolean } = {};

  // Typing related properties
  private currentTypingWord: string = '';
  private activeAntIndex: number = -1;

  // Focused word view properties
  private focusedWordContainer!: Container;
  private focusedWordText!: Text;
  private typingProgressBar!: Graphics;

  // Typing feedback properties
  private typingFeedback!: Text;
  private feedbackTimeout: any;

  // Red Sphere (target indicator)
  private targetIndicator!: Graphics;
  private targetPosition = { x: 0, y: 0 };
  private targetTime = 0.3; // Time to reach target in seconds
  private lastActiveAntIndex = -1; // Track the last highlighted ant

  // Game stats
  playerHealth = 15;
  playerScore = 0;
  private healthText!: Text;
  private pointsText!: Text;
  private accuracyText!: Text;
  private gameStartTime = 0;
  private gameTimer!: Text;
  private levelAnnouncement!: Text;

  // UI State
  isScorePopupVisible: boolean = false;
  isWaitingRoom: boolean = true;
  isCreatingRoom: boolean = false;
  isJoiningRoom: boolean = false;
  roomInputValue: string = '';
  playerName: string = '';
  errorMessage: string = '';
  playerReady: boolean = false;
  opponentReady: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Check if we're joining a specific room from URL
    this.route.queryParams.subscribe(params => {
      if (params['roomId']) {
        this.roomInputValue = params['roomId'];
        this.joinRoom();
      }
    });

    this.socket?.on('playerReadyUpdate', (data: { playerId: string, ready: boolean }) => {
      if (this.opponents.length > 0) {
        const opponent = this.opponents.find(p => p.id === data.playerId);
        if (opponent) {
          opponent.ready = data.ready;
          this.opponentReady = data.ready;
        }
      }
    });
  }

  ngOnDestroy() {
    this.disconnectFromServer();
    this.cleanupEventListeners();
  }

  // Initial menu methods
  createRoom() {
    this.isCreatingRoom = true;
    this.isWaitingRoom = false;

    this.connectToServer();
    this.socket?.emit('createGame', {}, (response: { roomId: string }) => {
      this.roomId = response.roomId;
      this.playerPosition = 'left'; // Creator is always left player
      this.initializeGame();
    });
  }

  joinRoom() {
    if (!this.roomInputValue) {
      this.errorMessage = 'Please enter a room code';
      return;
    }

    this.isJoiningRoom = true;
    this.isWaitingRoom = false;

    this.connectToServer();
    this.socket?.emit('joinGame', { roomId: this.roomInputValue }, (response: JoinGameResponse) => {
      if (response.success) {
        this.roomId = this.roomInputValue;
        if (this.playerPosition) {
          this.playerPosition = response.position;
        }

        if (response.players) {
          this.opponents = response.players.filter(p => p.id !== this.socket?.id);
        }

        this.initializeGame();
      } else {
        this.errorMessage = response.error || 'Failed to join room';
        this.isJoiningRoom = false;
        this.isWaitingRoom = true;
      }
    });
  }

  markReady() {
    this.playerReady = this.playerReady ? false : true;
    this.socket?.emit('playerReady', { roomId: this.roomId });
  }

  // SocketIO connection management
  private connectToServer() {
    if (this.socket) return; // Already connected

    this.socket = io(environment.apiUrl);

    this.socket?.on('playerReadyUpdate', (data: { playerId: string, ready: boolean }) => {
      if (this.opponents.length > 0) {
        const opponent = this.opponents.find(p => p.id === data.playerId);
        if (opponent) {
          opponent.ready = data.ready;
          this.opponentReady = data.ready;
        }
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      if (this.socket && this.socket.id) {
        this.playerId = this.socket!.id;
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.playerReady = false;
    });

    this.socket.on('playerJoined', (data: { playerId: string, position: 'left' | 'right' }) => {
      console.log('Player joined:', data);
      // Update UI to show opponent has joined
      this.opponents.push({
        id: data.playerId,
        position: data.position,
        health: 15,
        score: 0,
        ready: false
      });
    });

    this.socket.on('playerLeft', (data: { playerId: string }) => {
      console.log('Player left:', data);
      // Update UI to show opponent has left
      this.opponents = this.opponents.filter(p => p.id !== data.playerId);
    });

    this.socket.on('gameStarted', (data: { players: Player[] }) => {
      console.log('Game started:', data);
      this.gameStarted = true;

      // Initialize game rendering once we have both players
      this.initializePixiApp();
    });

    this.socket.on('gameStateUpdate', (gameState: any) => {
      // Update local game state based on server state
      this.updateGameStateFromServer(gameState);
    });

    this.socket.on('keyPressResult', (result: any) => {
      // Handle result of a key press (could be from this player or opponent)
      this.handleKeyPressResult(result);
    });

    this.socket.on('vultureClickResult', (result: any) => {
      // Handle result of a vulture click
      this.handleVultureClickResult(result);
    });
  }

  public disconnectFromServer() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private cleanupEventListeners() {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('keypress', this.handleTyping.bind(this));

    if (this.app && this.app.canvas) {
      this.app.canvas.removeEventListener('click', this.handleCanvasClick.bind(this));
    }

    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
  }

  private initializeGame() {
    // Set up event listeners for keyboard
    this.setupKeyboardListeners();
  }

  private async initializePixiApp() {
    if (this.app) return; // Already initialized

    // Initialize the PIXI application
    this.app = new Application();
    TexturePool.textureOptions.scaleMode = 'nearest';
    await this.app.init({
      resizeTo: window,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    });

    // Add the canvas to the DOM
    if (this.gameCanvasRef && this.gameCanvasRef.nativeElement) {
      this.gameCanvasRef.nativeElement.appendChild(this.app.canvas);
    } else {
      document.body.appendChild(this.app.canvas);
    }

    // Add click listener for vulture clicks
    this.app.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

    // Create main game container - all game elements will be children of this
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    // Load assets
    await this.loadAssets();

    // Create floor container
    this.floorContainer = new Container();
    this.gameContainer.addChild(this.floorContainer);

    // Create floor tiles
    this.createFloor();

    // Create players
    this.createPlayers();

    // Set up the focused word view
    this.setupFocusedWordView();

    // Set up the typing feedback
    this.setupTypingFeedback();

    // Set up target indicator
    this.setupTargetIndicator();

    // Set up level announcement
    this.setupLevelAnnouncement();

    // Set up stats display
    this.setupStatsDisplay();

    // Set the game container scale
    this.gameContainer.scale.set(3);

    // Center the game container initially
    this.centerGameContainer();

    // Start game timer
    this.gameStartTime = Date.now();
  }

  private async loadAssets() {
    // Load background
    const backgroundTexture = await Assets.load('back.png');
    const background = new Sprite(backgroundTexture);
    background.width = this.app!.screen.width / 3;
    background.height = this.app!.screen.height / 3;
    this.gameContainer.addChild(background);

    // Load tileset atlas
    const atlasData = {
      frames: {
        floorTile1: {
          frame: { x: 15, y: 15, w: 16, h: 16 },
          sourceSize: { w: 16, h: 16 },
          spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
          rotated: false,
          trimmed: false,
        },
        floorTile2: {
          frame: { x: 48, y: 15, w: 16, h: 16 },
          sourceSize: { w: 16, h: 16 },
          spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
          rotated: false,
          trimmed: false,
        },
        floorTile3: {
          frame: { x: 288, y: 96, w: 16, h: 16 },
          sourceSize: { w: 16, h: 16 },
          spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
          rotated: false,
          trimmed: false,
        },
      },
      meta: {
        image: 'tileset.png',
        size: { w: 400, h: 368 },
        scale: "1"
      },
    };

    // Load player idle animation atlas
    const playerIdleAtlas = {
      frames: {
        idle1: {
          frame: { x: 13, y: 15, w: 22, h: 30 },
          sourceSize: { w: 22, h: 30 },
          spriteSourceSize: { x: 0, y: 0, w: 22, h: 30 },
        },
        idle2: {
          frame: { x: 64, y: 15, w: 22, h: 30 },
          sourceSize: { w: 22, h: 30 },
          spriteSourceSize: { x: 0, y: 0, w: 22, h: 30 },
        },
        idle3: {
          frame: { x: 115, y: 15, w: 22, h: 30 },
          sourceSize: { w: 22, h: 30 },
          spriteSourceSize: { x: 0, y: 0, w: 22, h: 30 },
        },
        idle4: {
          frame: { x: 166, y: 15, w: 22, h: 30 },
          sourceSize: { w: 22, h: 30 },
          spriteSourceSize: { x: 0, y: 0, w: 22, h: 30 },
        }
      },
      meta: {
        image: 'idle-preview.png',
        size: { w: 205, h: 45 },
        scale: "1"
      },
      animations: {
        idle: ['idle1', 'idle2', 'idle3', 'idle4']
      }
    };

    const antAtlas = {
      frames: {
        frame1: {
          frame: { x: 1, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame2: {
          frame: { x: 38, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame3: {
          frame: { x: 75, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame4: {
          frame: { x: 112, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame5: {
          frame: { x: 150, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame6: {
          frame: { x: 186, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame7: {
          frame: { x: 224, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
        frame8: {
          frame: { x: 263, y: 1, w: 35, h: 31 },
          sourceSize: { w: 35, h: 31 },
          spriteSourceSize: { x: 0, y: 0, w: 35, h: 31 }
        },
      },
      meta: {
        image: 'ant-sheet.png',
        size: { w: 296, h: 31 },
        scale: "1"
      },
      animations: {
        walk: ['frame1', 'frame2', 'frame3', 'frame4', 'frame5', 'frame6', 'frame7']
      }
    };

    const vultureAtlas = {
      frames: {
        frame1: {
          frame: { x: 8, y: 5, w: 21, h: 28 },
          sourceSize: { w: 21, h: 28 },
          spriteSourceSize: { x: 0, y: 0, w: 21, h: 28 }
        },
        frame2: {
          frame: { x: 45, y: 5, w: 27, h: 30 },
          sourceSize: { w: 27, h: 30 },
          spriteSourceSize: { x: 0, y: 0, w: 27, h: 30 }
        },
        frame3: {
          frame: { x: 84, y: 16, w: 30, h: 19 },
          sourceSize: { w: 30, h: 19 },
          spriteSourceSize: { x: 0, y: 0, w: 30, h: 19 }
        },
        frame4: {
          frame: { x: 123, y: 13, w: 24, h: 22 },
          sourceSize: { w: 24, h: 22 },
          spriteSourceSize: { x: 0, y: 0, w: 24, h: 22 }
        }
      },
      meta: {
        image: 'vulture.png',
        size: { w: 156, h: 39 },
        scale: "1"
      },
      animations: {
        fly: ['frame1', 'frame2', 'frame3', 'frame4']
      }
    };

    // Load and parse textures
    const texture = await Assets.load(atlasData.meta.image);
    const playerIdleTexture = await Assets.load(playerIdleAtlas.meta.image);
    const antTexture = await Assets.load(antAtlas.meta.image);
    const vultureTexture = await Assets.load(vultureAtlas.meta.image);

    const spritesheet = new Spritesheet(texture, atlasData);
    const playerIdleSpriteSheet = new Spritesheet(playerIdleTexture, playerIdleAtlas);
    this.antSpriteSheet = new Spritesheet(antTexture, antAtlas);
    this.vultureSpriteSheet = new Spritesheet(vultureTexture, vultureAtlas);

    await spritesheet.parse();
    await playerIdleSpriteSheet.parse();
    await this.antSpriteSheet.parse();
    await this.vultureSpriteSheet.parse();

    // Store these for later use
    this.spritesheet = spritesheet;
    this.playerIdleSpriteSheet = playerIdleSpriteSheet;
  }

  private createFloor() {
    this.floorContainer.removeChildren();
    const screenWidth = this.app!.screen.width / 3;
    const tileWidth = 14;
    const numTiles = Math.ceil(screenWidth / tileWidth);

    for (let i = 0; i < numTiles; i++) {
      let floorTile;
      if (i % 2 == 0) {
        floorTile = new Sprite(this.spritesheet.textures['floorTile1']);
      } else {
        floorTile = new Sprite(this.spritesheet.textures['floorTile2']);
      }
      // Position tiles side-by-side with no gaps
      floorTile.x = i * tileWidth;
      floorTile.y = 0; // Set to 0 since we'll position the entire container
      this.floorContainer.addChild(floorTile);
    }

    // Position floor at the bottom
    const bottomPosition = (this.app!.screen.height / 3);
    this.floorContainer.y = bottomPosition - 16; // 16 is the height of floor tiles
  }

  private createPlayers() {
    // Create a container for each player
    const leftPlayerContainer = new Container();
    const rightPlayerContainer = new Container();

    this.gameContainer.addChild(leftPlayerContainer);
    this.gameContainer.addChild(rightPlayerContainer);

    this.players['left'] = leftPlayerContainer;
    this.players['right'] = rightPlayerContainer;

    // Create player animations using the parsed spritesheet
    const leftPlayerAnimation = new AnimatedSprite(this.playerIdleSpriteSheet.animations['idle']);
    const rightPlayerAnimation = new AnimatedSprite(this.playerIdleSpriteSheet.animations['idle']);

    leftPlayerContainer.addChild(leftPlayerAnimation);
    rightPlayerContainer.addChild(rightPlayerAnimation);

    leftPlayerAnimation.play();
    rightPlayerAnimation.play();
    leftPlayerAnimation.animationSpeed = 0.13;
    rightPlayerAnimation.animationSpeed = 0.13;

    leftPlayerAnimation.scale.x = -1;

    // Position players
    const bottomPosition = (this.app!.screen.height / 3);

    const centerX = (this.app!.screen.width / 3) / 2;
    const spacing = 5;

    // Position left player at 1/4 of the screen width
    leftPlayerAnimation.x = centerX - leftPlayerAnimation.width - (spacing / 2);
    leftPlayerAnimation.y = bottomPosition - leftPlayerAnimation.height - 16;

    // Position right player at 3/4 of the screen width
    rightPlayerAnimation.x = centerX + (spacing / 2);
    rightPlayerAnimation.y = bottomPosition - rightPlayerAnimation.height - 16;

    // Store references to player animations
    this.playerIdleAnimations['left'] = leftPlayerAnimation;
    this.playerIdleAnimations['right'] = rightPlayerAnimation;

    // Add a dividing line down the center
    const divider = new Graphics();
    divider.lineStyle(2, 0xFFFFFF, 0.5);
    divider.moveTo((this.app!.screen.width / 3) / 2, 0);
    divider.lineTo((this.app!.screen.width / 3) / 2, this.app!.screen.height / 3);
    this.gameContainer.addChild(divider);
  }

  private setupStatsDisplay() {
    // Create health text display for the current player
    this.healthText = new Text('Health: ❤️❤️❤️', {
      fontFamily: 'Arial',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      align: 'left'
    });

    // Position based on player side
    if (this.playerPosition === 'left') {
      this.healthText.x = 10;
    } else {
      this.healthText.x = (this.app!.screen.width / 3) / 2 + 10;
    }
    this.healthText.y = 10;

    // Points counter
    this.pointsText = new Text('Points: 0', {
      fontFamily: 'Arial',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      align: 'left'
    });

    if (this.playerPosition === 'left') {
      this.pointsText.x = 10;
    } else {
      this.pointsText.x = (this.app!.screen.width / 3) / 2 + 10;
    }
    this.pointsText.y = 25;

    // Accuracy tracker
    this.accuracyText = new Text('Accuracy: 100%', {
      fontFamily: 'Arial',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      align: 'left'
    });

    if (this.playerPosition === 'left') {
      this.accuracyText.x = 10;
    } else {
      this.accuracyText.x = (this.app!.screen.width / 3) / 2 + 10;
    }
    this.accuracyText.y = 40;

    // Game timer
    this.gameTimer = new Text('Time: 00:00', {
      fontFamily: 'Arial',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      align: 'left'
    });

    if (this.playerPosition === 'left') {
      this.gameTimer.x = 10;
    } else {
      this.gameTimer.x = (this.app!.screen.width / 3) / 2 + 10;
    }
    this.gameTimer.y = 55;

    // Add to game container
    this.gameContainer.addChild(this.healthText);
    this.gameContainer.addChild(this.pointsText);
    this.gameContainer.addChild(this.accuracyText);
    this.gameContainer.addChild(this.gameTimer);

    this.updateHealthDisplay();
  }

  private updateHealthDisplay() {
    // Create heart string based on current health
    let hearts = '';
    for (let i = 0; i < this.playerHealth; i++) {
      hearts += '❤️';
    }

    // Update the text
    this.healthText.text = `Health: ${hearts}`;

    // Make health text red when low
    if (this.playerHealth <= 1) {
      this.healthText.style.fill = 0xFF0000; // Red when low health
    } else {
      this.healthText.style.fill = 0xFFFFFF; // White otherwise
    }
  }

  private setupFocusedWordView() {
    // Create a container for the focused word display at the bottom of the screen
    this.focusedWordContainer = new Container();
    this.gameContainer.addChild(this.focusedWordContainer);

    // Create a background for the container
    const focusedWordBackground = new Graphics();
    focusedWordBackground.beginFill(0x000000, 0.7);
    focusedWordBackground.drawRect(0, 0, (this.app!.screen.width / 3) / 2, 20);
    focusedWordBackground.endFill();
    this.focusedWordContainer.addChild(focusedWordBackground);

    // Create the text that will display the current word
    this.focusedWordText = new Text('', {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xFFFFFF,
      align: 'center'
    });
    this.focusedWordText.anchor.set(0.5, 0.5);
    this.focusedWordText.x = ((this.app!.screen.width / 3) / 2) / 2;
    this.focusedWordText.y = 10;
    this.focusedWordContainer.addChild(this.focusedWordText);

    // Create a progress bar that shows typing progress
    this.typingProgressBar = new Graphics();
    this.focusedWordContainer.addChild(this.typingProgressBar);

    // Position the container at the bottom of the screen with some margin
    this.focusedWordContainer.y = (this.app!.screen.height / 3) - 30;

    // Position based on player side
    if (this.playerPosition === 'left') {
      this.focusedWordContainer.x = 0;
    } else {
      this.focusedWordContainer.x = (this.app!.screen.width / 3) / 2;
    }

    // Initially hide the container
    this.focusedWordContainer.visible = false;
  }

  private setupTypingFeedback() {
    // Create a text object for typing feedback
    this.typingFeedback = new Text('', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0x00FF00,
      stroke: 0x000000,
      align: 'center'
    });

    // Position it near the player
    const playerAnimation = this.playerIdleAnimations[this.playerPosition];
    this.typingFeedback.anchor.set(0.5, 1);
    this.typingFeedback.x = playerAnimation.x + playerAnimation.width / 2;
    this.typingFeedback.y = playerAnimation.y - 10;

    // Add to the game container
    this.gameContainer.addChild(this.typingFeedback);

    // Initially hidden
    this.typingFeedback.visible = false;
  }

  private setupTargetIndicator() {
    // Create a simple red dot instead of a crosshair
    this.targetIndicator = new Graphics();

    // Draw a medium-sized red dot
    this.targetIndicator.beginFill(0xFF0000, 0.7);
    this.targetIndicator.drawCircle(0, 0, 2);
    this.targetIndicator.endFill();

    // Add to the game container with high zIndex to stay above ants
    this.targetIndicator.zIndex = 2000;
    this.gameContainer.addChild(this.targetIndicator);

    // Initially hide the indicator
    this.targetIndicator.visible = false;
  }

  private setupLevelAnnouncement() {
    // Create level announcement text
    this.levelAnnouncement = new Text('', {
      fontFamily: 'Arial',
      fontSize: 100,
      fontWeight: 'bold',
      fill: 0x00FF00,
      stroke: 0x000000,
      align: 'center'
    });

    // Center the text
    this.levelAnnouncement.anchor.set(0.5);

    // Position based on player side
    if (this.playerPosition === 'left') {
      this.levelAnnouncement.x = (this.app!.screen.width / 3) / 4;
    } else {
      this.levelAnnouncement.x = (this.app!.screen.width / 3) / 4 * 3;
    }

    this.levelAnnouncement.y = (this.app!.screen.height / 3) / 2;

    // Make it initially invisible
    this.levelAnnouncement.visible = false;

    // Add to game container with high z-index
    this.levelAnnouncement.zIndex = 3000; // Above everything else
    this.gameContainer.addChild(this.levelAnnouncement);
  }

  // Event listeners
  private setupKeyboardListeners() {
    // Add event listeners for keydown and keyup
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('keypress', this.handleTyping.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Store the key state
    this.keysPressed[event.key] = true;

    // Check for restart when game is over
    if (this.isGameOver && (event.key === 'r' || event.key === 'R') && !this.isScorePopupVisible) {
      // Handle restart
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    // Update the key state
    this.keysPressed[event.key] = false;
  }

  private handleTyping(event: KeyboardEvent) {
    // Ignore special keys or if game is not started or is over
    if ((event.key.length !== 1 && event.key !== 'Backspace') ||
      !this.gameStarted ||
      this.isGameOver ||
      this.isScorePopupVisible) {
      return;
    }

    // Send key press to server
    this.socket?.emit('keyPress', { roomId: this.roomId, key: event.key });
  }

  private handleCanvasClick(event: MouseEvent) {
    if (!this.gameStarted || this.isGameOver) return;

    // Get the bounding rectangle of the canvas
    const canvasBounds = this.app!.canvas.getBoundingClientRect();

    // Calculate relative position within the canvas
    const relativeX = event.clientX - canvasBounds.left;
    const relativeY = event.clientY - canvasBounds.top;

    // Convert to game coordinates (accounting for scale)
    const clickX = relativeX / this.gameContainer.scale.x;
    const clickY = relativeY / this.gameContainer.scale.y;

    // Check if click is on player's side
    const isLeftSide = clickX < (this.app!.screen.width / 3) / 2;
    if ((this.playerPosition === 'left' && !isLeftSide) ||
      (this.playerPosition === 'right' && isLeftSide)) {
      return; // Can't click on opponent's side
    }

    // Check each vulture to see if it was clicked
    for (let i = 0; i < this.vultures.length; i++) {
      const vulture = this.vultures[i];

      // Skip if not on player's side
      if (vulture.side !== this.playerPosition) continue;

      // Skip if already clicked
      if (vulture.clicked) continue;

      // Calculate vulture bounds
      let vultureBounds: any = {};

      if (vulture.vulture.scale.x === -1) {
        vultureBounds = {
          left: vulture.vulture.x - vulture.vulture.width,
          right: vulture.vulture.x,
          top: vulture.vulture.y,
          bottom: vulture.vulture.y + vulture.vulture.height
        };
      } else {
        vultureBounds = {
          left: vulture.vulture.x,
          right: vulture.vulture.x + vulture.vulture.width,
          top: vulture.vulture.y,
          bottom: vulture.vulture.y + vulture.vulture.height
        };
      }

      // Check if click is within vulture bounds
      if (
        clickX >= vultureBounds.left &&
        clickX <= vultureBounds.right &&
        clickY >= vultureBounds.top &&
        clickY <= vultureBounds.bottom
      ) {
        // Send vulture click to server
        this.socket?.emit('clickVulture', { roomId: this.roomId, vultureId: vulture.id });
        break;
      }
    }
  }

  // Server event handlers
  private updateGameStateFromServer(gameState: any) {
    // This will be a complete game state from the server
    // Update local state to match
    console.dir(gameState)

    this.updateTimer();

    // Update player stats
    if (gameState.players[this.playerId]) {
      const player = gameState.players[this.playerId];
      this.playerHealth = player.health;
      this.playerScore = player.score;
      // this.accuracyText = gameState.

      // Update displays
      this.updateHealthDisplay();
      this.updateScore(player.score);

      // Update typing state if needed
      if (player.typing) {
        this.currentTypingWord = player.typing.currentWord || '';
        // Find the ant index by id
        const antIndex = this.ants.findIndex(a => a.id === player.typing.activeAntId);
        this.activeAntIndex = antIndex !== -1 ? antIndex : -1;
      }
    }

    // Update opponent stats
    this.opponents = Object.values(gameState.players).filter(
      (p: any) => p.id !== this.playerId
    ) as Player[];

    // Synchronize ants and vultures (full replacement might be simpler than diffing)
    this.syncAntsWithServer(gameState.ants);
    this.syncVulturesWithServer(gameState.vultures);

    // Check for game over
    this.isGameOver = gameState.isGameOver;
    if (this.isGameOver ) {
      this.showScorePopup();
      // Instead of showing score popup maybe show the winner
      if(this.playerHealth>this.opponents[0].health){
        this.gameOutcome="win";
      }else{
        this.gameOutcome="lose";
      }
      this.opponentFinalScore=this.opponents[0].score;
    }
  }

  private syncAntsWithServer(serverAnts: any[]) {
    // Remove ants that are no longer in the server state
    const serverAntIds = serverAnts.map(a => a.id);
    for (let i = this.ants.length - 1; i >= 0; i--) {
      if (!serverAntIds.includes(this.ants[i].id)) {
        this.removeAnt(i);
      }
    }

    // Update existing ants and add new ones
    for (const serverAnt of serverAnts) {
      const existingAntIndex = this.ants.findIndex(a => a.id === serverAnt.id);

      if (existingAntIndex === -1) {
        // New ant, create it
        this.createAntFromServer(serverAnt);
      } else {
        // Update existing ant
        this.updateAntFromServer(existingAntIndex, serverAnt);
      }
    }
  }

  private syncVulturesWithServer(serverVultures: any[]) {
    // Remove vultures that are no longer in the server state
    const serverVultureIds = serverVultures.map(v => v.id);
    for (let i = this.vultures.length - 1; i >= 0; i--) {
      if (!serverVultureIds.includes(this.vultures[i].id)) {
        this.removeVulture(i);
      }
    }

    // Update existing vultures and add new ones
    for (const serverVulture of serverVultures) {
      const existingVultureIndex = this.vultures.findIndex(v => v.id === serverVulture.id);

      if (existingVultureIndex === -1) {
        // New vulture, create it
        this.createVultureFromServer(serverVulture);
      } else {
        // Update existing vulture
        this.updateVultureFromServer(existingVultureIndex, serverVulture);
      }
    }
  }

  private handleKeyPressResult(result: any) {
    // Handle feedback (could be from this player or opponent)
    const isCurrentPlayer = result.playerId === this.playerId;

    if (isCurrentPlayer) {
      // Update local state based on key press result
      if (result.score !== undefined) {
        this.updateScore(result.score);
      }

      if (result.accuracy !== undefined) {

        this.accuracyText.text = `Accuracy: ${result.accuracy}%`;
      }

      // Show typing feedback
      if (result.feedback && result.feedbackColor) {
        this.showTypingFeedback(result.feedback, result.feedbackColor);
      }

      // Handle ant highlighting
      if (result.antId !== undefined) {
        const antIndex = this.ants.findIndex(a => a.id === result.antId);
        if (antIndex !== -1) {
          this.activeAntIndex = antIndex;
          this.highlightActiveAnt();

          // Update focused word view
          if (result.remainingWord !== undefined) {
            this.updateFocusedWordView(result.remainingWord, result.currentTypingWord || '');
          }
        }
      }

      // Handle completed word
      if (result.completed) {
        this.focusedWordContainer.visible = false;
        this.activeAntIndex = -1;
      }
    } else {
      // Update opponent's ant if needed
      if (result.antId !== undefined) {
        const antIndex = this.ants.findIndex(a => a.id === result.antId);
        if (antIndex !== -1) {
          // Visual update for opponent typing
          this.ants[antIndex].text.style.fill = 0xFFFF00; // Yellow for opponent typing
        }
      }
    }
  }

  private handleVultureClickResult(result: any) {
    // Handle vulture click result
    const isCurrentPlayer = result.playerId === this.playerId;

    if (isCurrentPlayer) {
      // Show feedback
      if (result.feedback && result.feedbackColor) {
        this.showTypingFeedback(result.feedback, result.feedbackColor);
      }

      // Update score
      if (result.score !== undefined) {
        this.updateScore(result.score);
      }
    }

    // Update vulture state
    if (result.vultureId !== undefined) {
      const vultureIndex = this.vultures.findIndex(v => v.id === result.vultureId);
      if (vultureIndex !== -1 && result.correct) {
        // Mark vulture as clicked
        this.vultures[vultureIndex].clicked = true;

        // Visual update
        this.vultures[vultureIndex].vulture.tint = 0x88FF88; // Green tint
        this.vultures[vultureIndex].text.style.fill = 0x00FF00; // Green text
      }
    }
  }

  // Ant and vulture management
  private createAntFromServer(serverAnt: any) {
    // Create ant sprite
    const newAnt = new AnimatedSprite(this.antSpriteSheet.animations['walk']);
    this.gameContainer.addChild(newAnt);
    newAnt.play();
    newAnt.animationSpeed = 0.1;

    // Position ant
    const bottomPosition = (this.app!.screen.height / 3);
    newAnt.y = bottomPosition - newAnt.height - 16;
    newAnt.x = serverAnt.x;

    // Set direction
    newAnt.scale.x = serverAnt.direction > 0 ? -1 : 1;

    // Create text
    const text = new Text(serverAnt.word, {
      fontFamily: 'Arial',
      fontSize: 8.5,
      fill: 0xFFFFFF,
      stroke: 0x000000,
      align: 'center',
      letterSpacing: 2,
      dropShadow: {
        color: '#000000',
        blur: 4,
        distance: 0,
        angle: Math.PI / 6,
        alpha: 1
      },
    });

    text.anchor.set(0.5, Math.random() * 1);
    this.gameContainer.addChild(text);

    // Create ant with text object
    const antWithText: AntWithText = {
      id: serverAnt.id,
      ant: newAnt,
      text: text,
      word: serverAnt.word,
      remainingWord: serverAnt.remainingWord,
      typeDirection: serverAnt.typeDirection
    };

    // Position text above ant
    this.updateTextPosition(antWithText);

    // Add to ants array
    this.ants.push(antWithText);
  }

  private updateAntFromServer(index: number, serverAnt: any) {
    // Update position
    this.ants[index].ant.x = serverAnt.x;

    // Update word state
    this.ants[index].remainingWord = serverAnt.remainingWord;

    // Update text position
    this.updateTextPosition(this.ants[index]);

    // Update active state
    if (serverAnt.isActive !== undefined) {
      // If this ant is active and corresponds to current player, handle it
      if (serverAnt.isActive && serverAnt.typeDirection === this.playerPosition) {
        this.activeAntIndex = index;
        this.highlightActiveAnt();
      }
    }
  }

  private removeAnt(index: number) {
    if (index >= 0 && index < this.ants.length) {
      // Remove from display
      this.gameContainer.removeChild(this.ants[index].ant);
      this.gameContainer.removeChild(this.ants[index].text);

      // If this was the active ant, reset typing state
      if (index === this.activeAntIndex) {
        this.activeAntIndex = -1;
        this.currentTypingWord = '';
        this.focusedWordContainer.visible = false;
      } else if (index < this.activeAntIndex) {
        // Adjust active index if we're removing an ant before it
        this.activeAntIndex--;
      }

      // Remove from array
      this.ants.splice(index, 1);
    }
  }

  private createVultureFromServer(serverVulture: any) {
    // Create vulture sprite
    const vulture = new AnimatedSprite(this.vultureSpriteSheet.animations['fly']);
    this.gameContainer.addChild(vulture);
    vulture.play();
    vulture.animationSpeed = 0.1;

    // Position
    vulture.x = serverVulture.x;
    vulture.y = serverVulture.y;

    // Randomly flip some vultures for variety
    if (Math.random() > 0.5) {
      vulture.scale.x = -1;
    }

    // Create text with the number
    const text = new Text(serverVulture.number.toString(), {
      fontFamily: 'Arial',
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      align: 'center'
    });

    text.anchor.set(0.5, 0.5);
    this.gameContainer.addChild(text);

    // Position text above vulture
    if (vulture.scale.x == -1) {
      text.x = vulture.x - vulture.width / 2;
    } else {
      text.x = vulture.x + vulture.width / 2;
    }
    text.y = vulture.y - 10;

    // Add to vultures array
    this.vultures.push({
      id: serverVulture.id,
      vulture,
      text,
      number: serverVulture.number,
      clicked: serverVulture.clicked,
      group: serverVulture.group,
      side: serverVulture.side
    });

    // If already clicked, update visual
    if (serverVulture.clicked) {
      vulture.tint = 0x88FF88; // Green tint
      text.style.fill = 0x00FF00; // Green text
    }
  }

  private updateVultureFromServer(index: number, serverVulture: any) {
    // Update position
    this.vultures[index].vulture.y = serverVulture.y;

    // Update text position
    if (this.vultures[index].vulture.scale.x == -1) {
      this.vultures[index].text.x = this.vultures[index].vulture.x - this.vultures[index].vulture.width / 2;
    } else {
      this.vultures[index].text.x = this.vultures[index].vulture.x + this.vultures[index].vulture.width / 2;
    }
    this.vultures[index].text.y = this.vultures[index].vulture.y - 10;

    // Update clicked state
    if (serverVulture.clicked !== this.vultures[index].clicked) {
      this.vultures[index].clicked = serverVulture.clicked;

      if (serverVulture.clicked) {
        this.vultures[index].vulture.tint = 0x88FF88; // Green tint
        this.vultures[index].text.style.fill = 0x00FF00; // Green text
      }
    }
  }

  private removeVulture(index: number) {
    if (index >= 0 && index < this.vultures.length) {
      // Remove from display
      this.gameContainer.removeChild(this.vultures[index].vulture);
      this.gameContainer.removeChild(this.vultures[index].text);

      // Remove from array
      this.vultures.splice(index, 1);
    }
  }

  // UI update methods
  private updateTextPosition(antObj: AntWithText) {
    // Calculate the center of the ant
    const antCenterX = antObj.ant.x + (antObj.ant.width / 2) * (antObj.ant.scale.x < 0 ? -1 : 1);

    // Set text anchor point
    antObj.text.x = antCenterX;
    antObj.text.y = antObj.ant.y - 10;

    // Add a slight bounce animation
    const bounceAmount = Math.sin(Date.now() * 0.001) * 1.5;
    antObj.text.y += bounceAmount;
  }

  private highlightActiveAnt() {
    if (this.activeAntIndex !== -1 && this.activeAntIndex < this.ants.length) {
      const activeAnt = this.ants[this.activeAntIndex];

      // Show the focused word container
      this.focusedWordContainer.visible = true;

      // Update the focused word text
      this.focusedWordText.text = activeAnt.remainingWord;

      // Make target indicator visible
      this.updateTargetPositionForAnt(this.activeAntIndex);
      this.targetIndicator.visible = true;

      // Reset styles for all ants
      this.ants.forEach((antObj, index) => {
        if (index === this.activeAntIndex) {
          // Highlight the active ant's text
          antObj.text.style.fill = 0xFFFF00; // Yellow for active
        } else {
          // Regular style for other ants
          antObj.text.style.fill = 0xFFFFFF; // White for inactive
        }
      });
    } else {
      // Hide the focused word container if no ant is active
      this.focusedWordContainer.visible = false;
      this.activeAntIndex = -1;
    }
  }

  private updateFocusedWordView(remainingWord: string, currentTypingWord: string) {
    // Update the focused word text
    this.focusedWordText.text = remainingWord;

    // Show the container
    this.focusedWordContainer.visible = true;

    // Highlight the typed part in the progress bar
    this.typingProgressBar.clear();
    this.typingProgressBar.beginFill(0x00FF00, 0.5);

    // Calculate progress width based on how much of the word is typed
    const totalWordLength = currentTypingWord.length + remainingWord.length;
    const progressWidth = (currentTypingWord.length / totalWordLength) * ((this.app!.screen.width / 3) / 2);
    this.typingProgressBar.drawRect(0, 0, progressWidth, 20);
    this.typingProgressBar.endFill();
  }

  private updateTargetPositionForAnt(antIndex: number) {
    if (antIndex !== -1 && antIndex < this.ants.length) {
      const ant = this.ants[antIndex];
      // Position the target slightly above the ant
      const antCenterX = ant.ant.x + (ant.ant.width / 2) * (ant.ant.scale.x < 0 ? -1 : 1);
      const antCenterY = ant.ant.y - 15;
      this.targetPosition = { x: antCenterX, y: antCenterY };
    }
  }

  private showTypingFeedback(text: string, color: number, duration: number = 500) {
    // Clear any existing timeout
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }

    // Update the feedback text
    this.typingFeedback.text = text;
    this.typingFeedback.style.fill = color;

    // Position it near the player
    const playerAnimation = this.playerIdleAnimations[this.playerPosition];
    this.typingFeedback.x = playerAnimation.x + playerAnimation.width / 2;
    this.typingFeedback.y = playerAnimation.y - 10;

    // Show it
    this.typingFeedback.visible = true;
    this.typingFeedback.alpha = 1;

    // Create a simple animation effect
    const animateOut = () => {
      this.typingFeedback.alpha -= 0.05;
      if (this.typingFeedback.alpha > 0) {
        requestAnimationFrame(animateOut);
      } else {
        this.typingFeedback.visible = false;
      }
    };

    // Start fadeout after the duration
    this.feedbackTimeout = setTimeout(() => {
      animateOut();
    }, duration);
  }

  private updateScore(score: number) {
    if (!this.pointsText) return;

    this.playerScore = score;
    this.pointsText.text = `Points: ${this.playerScore}`;
  }

  private updateTimer() {
    // Skip if gameTimer isn't initialized yet
    if (!this.gameTimer) return;

    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - this.gameStartTime) / 1000);

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    // Format as MM:SS with leading zeros
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.gameTimer.text = `Time: ${formattedTime}`;
  }

  private showLevelAnnouncement(level: number) {
    this.levelAnnouncement.text = `Level ${level}!`;
    this.levelAnnouncement.visible = true;

    // Add a scale animation effect
    this.levelAnnouncement.scale.set(0);

    // Create a pop-in animation
    const animateIn = () => {
      this.levelAnnouncement.scale.x += 0.1;
      this.levelAnnouncement.scale.y += 0.1;

      if (this.levelAnnouncement.scale.x < 1) {
        requestAnimationFrame(animateIn);
      } else {
        this.levelAnnouncement.scale.set(1);

        // Fade out after 2 seconds
        setTimeout(() => {
          const fadeOut = () => {
            this.levelAnnouncement.alpha -= 0.05;
            if (this.levelAnnouncement.alpha > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              this.levelAnnouncement.visible = false;
              this.levelAnnouncement.alpha = 1; // Reset for next time
            }
          };
          fadeOut();
        }, 2000);
      }
    };

    animateIn();
  }

  // Layout and resize handling
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.app) {
      // Resize the app to match the window size
      this.app.renderer.resize(window.innerWidth, window.innerHeight);

      // Update positions based on new screen dimensions
      this.centerGameContainer();
    }
  }

  private centerGameContainer() {
    if (!this.app) return;

    // Update background size
    const background = this.gameContainer.getChildAt(0) as Sprite;
    background.width = this.app.screen.width / 3;
    background.height = this.app.screen.height / 3;

    // Position floor at the bottom of the screen
    const bottomPosition = (this.app.screen.height / 3);
    this.floorContainer.y = bottomPosition - 16; // 16 is the height of floor tiles

    // Position players
    const leftPlayer = this.playerIdleAnimations['left'];
    const rightPlayer = this.playerIdleAnimations['right'];
    const centerX = (this.app.screen.width / 3) / 2;
    const spacing = 50;

    if (leftPlayer) {
      leftPlayer.x = centerX - leftPlayer.width - (spacing / 2);
      leftPlayer.y = bottomPosition - leftPlayer.height - 16;
    }

    if (rightPlayer) {
      rightPlayer.x = centerX + (spacing / 2);
      rightPlayer.y = bottomPosition - rightPlayer.height - 16;
    }

    // Update ant positions
    for (const ant of this.ants) {
      ant.ant.y = bottomPosition - ant.ant.height - 16;
      this.updateTextPosition(ant);
    }

    // Update UI elements
    if (this.focusedWordContainer) {
      this.focusedWordContainer.y = (this.app.screen.height / 3) - 30;

      if (this.playerPosition === 'left') {
        this.focusedWordContainer.x = 0;
      } else {
        this.focusedWordContainer.x = (this.app.screen.width / 3) / 2;
      }
    }

    if (this.typingFeedback) {
      const playerAnimation = this.playerIdleAnimations[this.playerPosition];
      this.typingFeedback.x = playerAnimation.x + playerAnimation.width / 2;
      this.typingFeedback.y = playerAnimation.y - 10;
    }

    // Update game stats positions
    if (this.healthText) {
      if (this.playerPosition === 'left') {
        this.healthText.x = 10;
      } else {
        this.healthText.x = (this.app.screen.width / 3) / 2 + 10;
      }
    }

    if (this.pointsText) {
      if (this.playerPosition === 'left') {
        this.pointsText.x = 10;
      } else {
        this.pointsText.x = (this.app.screen.width / 3) / 2 + 10;
      }
    }

    if (this.accuracyText) {
      if (this.playerPosition === 'left') {
        this.accuracyText.x = 10;
      } else {
        this.accuracyText.x = (this.app.screen.width / 3) / 2 + 10;
      }
    }

    if (this.gameTimer) {
      if (this.playerPosition === 'left') {
        this.gameTimer.x = 10;
      } else {
        this.gameTimer.x = (this.app.screen.width / 3) / 2 + 10;
      }
    }

    if (this.levelAnnouncement) {
      if (this.playerPosition === 'left') {
        this.levelAnnouncement.x = (this.app.screen.width / 3) / 4;
      } else {
        this.levelAnnouncement.x = (this.app.screen.width / 3) / 4 * 3;
      }
      this.levelAnnouncement.y = (this.app.screen.height / 3) / 2;
    }
  }

  // Game end handling
  showScorePopup() {
    this.isScorePopupVisible = true;
    this.playerName = ''; // Reset player name
  }

  hideScorePopup() {
    const popup = this.popupElement.nativeElement;
    popup.style.animation = 'slideUp 0.5s ease reverse forwards';

    setTimeout(() => {
      const container = popup.parentElement;
      container.style.animation = 'fadeIn 0.5s ease reverse forwards';

      setTimeout(() => {
        this.isScorePopupVisible = false;
        // Return to main menu
        this.isWaitingRoom = true;
        this.disconnectFromServer();
      }, 500);
    }, 400);
  }

  async submitScore() {
    if (this.playerName.trim() === '') {
      return; // Don't submit if name is empty
    }

    try {
      // Format the accuracy from the text
      const accuracyValue = parseFloat(
        this.accuracyText.text.replace("Accuracy: ", "").replace("%", "")
      );

      const timeValue = this.gameTimer.text.replace("Time: ", "");

      const scoreData = {
        player_name: this.playerName,
        points: this.playerScore,
        accuracy: accuracyValue,
        time: timeValue,
        is_multiplayer: true
      };

      await this.http.post(`${environment.apiUrl}/fast-hands/save-score`, scoreData).toPromise();
    } catch (error) {
      console.error('Error submitting score:', error);
    }

    this.hideScorePopup();
  }

  // Helper methods
  formatScore(score: number): string {
    return new Intl.NumberFormat().format(score);
  }

  getShareLink(): string {
    return `${window.location.origin}${window.location.pathname}?roomId=${this.roomId}`;
  }

  copyShareLink() {
    const link = this.getShareLink();
    navigator.clipboard.writeText(link)
      .then(() => {
        // Show copied message
        alert('Room link copied to clipboard!');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  }
}
