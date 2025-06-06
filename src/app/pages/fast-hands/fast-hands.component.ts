import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, importProvidersFrom, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Assets, Application, AnimatedSprite, Sprite, Spritesheet, TexturePool, Texture, Container, Text, Graphics, TextStyle } from 'pixi.js';
import { environment } from '../../../environment'
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

//to fix the different group vulture click, just give another attribute to it and check honestly, like group id
interface AntWithText {
  ant: AnimatedSprite;
  text: Text;
  word: string;
}

interface VultureWithText {
  vulture: AnimatedSprite;
  text: Text;
  number: number;
  clicked: boolean;
  group: number;
}

@Component({
  selector: 'app-fast-hands',
  imports: [CommonModule, FormsModule,],
  templateUrl: './fast-hands.component.html',
  styleUrl: './fast-hands.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class FastHandsComponent implements OnInit {
  @ViewChild('popupElement') popupElement!: ElementRef;
  private app: any;
  private gameContainer!: Container;
  private floorContainer!: Container;
  private playerIdleAnimation!: AnimatedSprite;
  private antSpriteSheet!: Spritesheet;
  private ants: AntWithText[] = [];
  private antsMovementSpeed: number = .8;
  private tickCounter: number = 0;
  private antCounter: number = 0;

  // Keyboard state tracking
  private keysPressed: { [key: string]: boolean } = {};

  // Typing related properties
  private currentTypingWord: string = '';
  private activeAntIndex: number = -1;

  // Focused word view properties
  private focusedWordContainer!: Container;
  private focusedWordText!: Text;
  private typingProgressBar!: Graphics;

  // Text visibility management
  private maxVisibleTexts: number = 5; // Maximum number of visible texts at once

  // Typing feedback properties
  private typingFeedback!: Text;
  private feedbackTimeout: any;

  //Red Sphere
  private targetIndicator!: Graphics;
  private targetPosition = { x: 0, y: 0 };
  private targetTime = 0.3; // Time to reach target in seconds (customizable)
  private lastActiveAntIndex = -1; // Track the last highlighted ant

  private difficultyLevel = 1;
  private maxDifficultyLevel = 5;
  private timeBetweenLevels: number[] = [20000, 50000, 100000, 290000, 80000]; // Time in ms before level increases
  private levelStartTime = 0; // Track when the current level started
  private levelAnnouncement!: Text; // Text for level announcements
  private isShowingAnnouncement = false;
  private announcementTimer = 0;

  private playerHealth = 15; // Starting health
  private healthText!: Text; // Text display for health
  private isGameOver = false; // Track game over state

  playerPoints = 0;
  private correctKeyPresses = 0;
  private totalKeyPresses = 0;
  private gameStartTime = 0;
  private gameTimer!: Text;
  private pointsText!: Text;
  private accuracyText!: Text;

  private vultureSpriteSheet!: Spritesheet;
  private vultures: VultureWithText[] = [];
  private vultureMovementSpeed: number = 0.03;
  private vultureSpawnCounter: number = 0;
  private vultureTickCounter: number = 0;
  private nextVultureSpawnTime: number = 700; // Time in ticks before first vulture group
  private currentVultureSequence: number = -1; // Track which number in the sequence (1-3) is next to click
  private vultureGroupsDefeated: number = 0;
  private vultureGroups: number = 0;
  private currentVultureGroup: number = 0;

  isScorePopupVisible: boolean = false;
  playerName: string = '';

  // Word categories for different themes
  private wordCategories = {
    // Short words (3-4 letters) - Quick typing practice
    shortWords: [
      'ant', 'egg', 'dig', 'run', 'red', 'big', 'hot', 'wet', 'fast', 'tiny',
      'hill', 'nest', 'bit', 'bug', 'ram', 'cpu', 'net', 'key', 'tap', 'cut',
      'pin', 'log', 'sum', 'map', 'bat', 'bin', 'tag', 'car', 'cat', 'dog',
      'dot', 'ear', 'fan', 'gap', 'hen', 'ink', 'jar', 'kit', 'lip', 'mix',
      'nap', 'oak', 'pop', 'quit', 'raw', 'sad', 'tan', 'use', 'van', 'win'
    ],

    // Medium words (5-7 letters) - Balanced difficulty
    mediumWords: [
      'colony', 'worker', 'tunnel', 'scent', 'swarm', 'brave', 'clever',
      'search', 'signal', 'forage', 'defend', 'focused', 'binary', 'server',
      'method', 'buffer', 'thread', 'script', 'hacker', 'module', 'python',
      'syntax', 'packet', 'memory', 'branch', 'syntax', 'object', 'pointer',
      'vector', 'entity', 'sprite', 'object', 'backup', 'socket', 'global',
      'static', 'random', 'kernel', 'output', 'system', 'program', 'source',
      'token', 'nested', 'linked', 'assign', 'toggle', 'branch', 'export'
    ],

    // Long words (8+ letters) - Advanced typing challenge
    longWords: [
      'organized', 'determined', 'courageous', 'resourceful', 'perseverance',
      'communication', 'coordination', 'navigation', 'pheromone', 'competition',
      'camouflage', 'algorithm', 'recursion', 'framework', 'interface',
      'encryption', 'debugging', 'networking', 'cybersecurity', 'compilation',
      'multithreading', 'optimization', 'parallelism', 'virtualization',
      'serialization', 'decomposition', 'inheritance', 'polymorphism',
      'asynchronous', 'synchronization', 'abstraction', 'serialization',
      'deserialization', 'normalization', 'computerized', 'computational',
      'subroutine', 'artificial', 'concurrency', 'transmission', 'hyperlinked',
      'cryptography', 'binarytree', 'hashfunction', 'backtracking', 'simulating',
      'mathematical', 'blockchains', 'cryptosystem'
    ],

    // Common words - Everyday words that are familiar
    commonWords: [
      'team', 'move', 'carry', 'build', 'find', 'rest', 'fast', 'work', 'help',
      'search', 'path', 'open', 'close', 'name', 'value', 'input', 'error',
      'save', 'load', 'create', 'edit', 'delete', 'view', 'access', 'login',
      'logout', 'click', 'scroll', 'type', 'paste', 'copy', 'file', 'folder',
      'home', 'start', 'stop', 'pause', 'resume', 'share', 'send', 'email',
      'read', 'write', 'print', 'scan', 'play', 'pause', 'repeat', 'upload',
      'download', 'connect'
    ],

    // Uncommon words - Words that might be tricky to spell or less familiar
    uncommonWords: [
      'meticulous', 'instinct', 'strategy', 'predator', 'pheromone',
      'industrious', 'camouflage', 'agility', 'tireless', 'diligent',
      'efficiency', 'heuristic', 'synchronous', 'asynchronous', 'optimization',
      'modularity', 'scalability', 'latency', 'anomaly', 'deduplication',
      'hashing', 'serialization', 'quantization', 'probability', 'efficacy',
      'pseudo', 'sandboxing', 'entropy', 'checksum', 'diagnostics',
      'middleware', 'provisioning', 'deployment', 'redundancy', 'compression',
      'dedicated', 'iteration', 'lambda', 'multiplexer', 'decryption',
      'vectorization', 'convolution', 'broadcasting', 'deadlock', 'mutex',
      'parallelism', 'concatenation', 'canonicalization'
    ],

    // Verbs - Action-based words for dynamic typing
    actionWords: [
      'move', 'carry', 'lift', 'search', 'find', 'gather', 'store', 'climb',
      'dig', 'defend', 'attack', 'follow', 'lead', 'signal', 'grow', 'work',
      'rest', 'analyze', 'compute', 'debug', 'execute', 'iterate', 'encrypt',
      'decrypt', 'compile', 'render', 'transmit', 'encode', 'decode', 'generate',
      'configure', 'simulate', 'emulate', 'resolve', 'initialize', 'terminate',
      'trigger', 'download', 'upload', 'backup', 'restore', 'compress',
      'decompress', 'parse', 'crawl', 'scrape', 'register', 'authorize'
    ],

    // Adjectives - Words that describe ants and their behavior
    descriptiveWords: [
      'tiny', 'quick', 'busy', 'strong', 'smart', 'brave', 'clever', 'mighty',
      'agile', 'social', 'organized', 'diligent', 'patient', 'determined',
      'focused', 'tireless', 'hungry', 'efficient', 'adaptive', 'persistent',
      'industrious', 'logical', 'robust', 'resilient', 'calculative', 'verbose',
      'methodical', 'structured', 'versatile', 'innovative', 'consistent',
      'proactive', 'strategic', 'autonomous', 'progressive', 'scalable',
      'systematic', 'cautious', 'tactical', 'persistent', 'iterative',
      'intuitive', 'fault-tolerant', 'analytical', 'heuristic', 'streamlined'
    ],

    // Scientific terms - More challenging words for advanced players
    scientificTerms: [
      'pheromone', 'entomology', 'exoskeleton', 'mandible', 'antenna',
      'metamorphosis', 'hemolymph', 'colony', 'queen', 'larva', 'pupa',
      'instinct', 'navigation', 'symbiosis', 'ecosystem', 'biomimicry',
      'genetics', 'mutation', 'hormones', 'neurology', 'cognition',
      'mechanoreceptors', 'photosynthesis', 'respiration', 'hormonal',
      'subspecies', 'anatomy', 'morphology', 'taxonomy', 'kinetics',
      'catalyst', 'enzymes', 'osmosis', 'diffusion', 'epigenetics',
      'homeostasis', 'bioinformatics', 'nanotechnology', 'quantum',
      'bioluminescence', 'electromagnetism', 'geophysics', 'astrophysics',
      'cryogenics', 'radioactivity', 'spectroscopy', 'cytogenetics'
    ],

    // Computer Science terms - Essential CS vocabulary
    computerScienceTerms: [
      'algorithm', 'recursion', 'framework', 'interface', 'encryption',
      'debugging', 'compiler', 'interpreter', 'syntax', 'variable', 'function',
      'pointer', 'database', 'iteration', 'bitwise', 'protocol', 'runtime',
      'metadata', 'dependency', 'inheritance', 'abstraction', 'polymorphism',
      'concatenation', 'serialization', 'decomposition', 'parallelism',
      'deadlock', 'mutex', 'hashmap', 'bigO', 'caching', 'virtualization',
      'blockchain', 'containerization', 'cryptography', 'loadbalancer',
      'datawarehouse', 'microservices', 'fullstack', 'singleton', 'backpropagation'
    ]
  };

  constructor(private http: HttpClient) {
    setInterval(() => this.simulateTick(), 10);
    this.levelStartTime = Date.now();
  }

  private setupStatsDisplay() {
    // Create health text display in the top left
    this.healthText = new Text('Health: ❤️❤️❤️', {
      fontFamily: 'Arial',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0xFFFFFF, // White text
      stroke: 0x000000,
      align: 'left'
    });

    // Position in top left with some padding
    this.healthText.x = 10;
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
    this.pointsText.x = 10;
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
    this.accuracyText.x = 10;
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
    this.gameTimer.x = 10;
    this.gameTimer.y = 55;

    // Add to game container
    this.gameContainer.addChild(this.healthText);
    this.gameContainer.addChild(this.pointsText);
    this.gameContainer.addChild(this.accuracyText);
    this.gameContainer.addChild(this.gameTimer);

    this.updateHealthDisplay();

    // Initialize game start time
    this.gameStartTime = Date.now();
  }

  private updatePoints(points: number) {
    if (!this.pointsText) return;

    this.playerPoints += points;
    this.pointsText.text = `Points: ${this.playerPoints}`;
  }

  // Add this method to update accuracy
  private updateAccuracy(correct: boolean) {
    if (!this.accuracyText) return;

    this.totalKeyPresses++;

    if (correct) {
      this.correctKeyPresses++;
    }

    const accuracy = this.totalKeyPresses > 0
      ? Math.round((this.correctKeyPresses / this.totalKeyPresses) * 100)
      : 100;

    this.accuracyText.text = `Accuracy: ${accuracy}%`;

    // Change color based on accuracy
    if (accuracy >= 90) {
      this.accuracyText.style.fill = 0x00FF00; // Green for high accuracy
    } else if (accuracy >= 70) {
      this.accuracyText.style.fill = 0xFFFF00; // Yellow for medium accuracy
    } else {
      this.accuracyText.style.fill = 0xFF6600; // Orange for low accuracy
    }
  }

  // Add this method to update the timer
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

  private takeDamage() {
    // Only process damage if the game isn't over
    if (this.isGameOver) return;

    // Reduce health
    this.playerHealth--;

    // Update the health display
    this.updateHealthDisplay();

    // Add visual feedback for damage
    this.playerIdleAnimation.tint = 0xFF0000; // Tint player red

    // Reset tint after a short delay
    setTimeout(() => {
      this.playerIdleAnimation.tint = 0xFFFFFF; // Reset to normal color
    }, 300);

    // Check for game over
    if (this.playerHealth <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.isGameOver = true;

    setTimeout(() => {
      this.showScorePopup();
    }, 1500);

  }

  private setupLevelAnnouncement() {
    // Create level announcement text
    this.levelAnnouncement = new Text('', {
      fontFamily: 'Arial',
      fontSize: 100,
      fontWeight: 'bold',
      fill: 0x00FF00, // Yellow text
      stroke: 0x000000,
      align: 'center'
    });

    // Center the text
    this.levelAnnouncement.anchor.set(0.5);
    this.levelAnnouncement.x = (this.app.screen.width / 3) / 2;
    this.levelAnnouncement.y = (this.app.screen.height / 3) / 2;

    // Make it initially invisible
    this.levelAnnouncement.visible = false;

    // Add to game container with high z-index
    this.levelAnnouncement.zIndex = 3000; // Above everything else
    this.gameContainer.addChild(this.levelAnnouncement);
  }

  private showLevelAnnouncement(level: number) {
    this.levelAnnouncement.text = `Level ${level}!`;
    this.levelAnnouncement.visible = true;
    this.isShowingAnnouncement = true;
    this.announcementTimer = 0;

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
      }
    };

    animateIn();
  }


  private updateDifficulty() {
    // Check if it's time to increase difficulty
    const currentTime = Date.now();
    const timeInCurrentLevel = currentTime - this.levelStartTime;

    // Only increase level if we haven't reached max difficulty
    if (this.difficultyLevel < this.maxDifficultyLevel) {
      if (timeInCurrentLevel >= this.timeBetweenLevels[this.difficultyLevel - 1]) {
        // Increase difficulty level
        this.difficultyLevel++;

        // Record the start time of this new level
        this.levelStartTime = currentTime;

        // Show level announcement
        this.showLevelAnnouncement(this.difficultyLevel);

        console.log(`Difficulty increased to Level ${this.difficultyLevel}`);
      }
    }

    // Update announcement visibility
    if (this.isShowingAnnouncement) {
      this.announcementTimer += 10; // Add 10ms (tick interval)

      // Show announcement for 2 seconds
      if (this.announcementTimer >= 4000) {
        // Fade out the announcement
        this.levelAnnouncement.alpha -= 0.05;

        if (this.levelAnnouncement.alpha <= 0) {
          this.levelAnnouncement.visible = false;
          this.isShowingAnnouncement = false;
          this.levelAnnouncement.alpha = 1; // Reset alpha for next time
        }
      }
    }
  }

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
      // this.restartGame();
    }
  }

  // Add a method to restart the game
  private restartGame() {
    // Reset game state
    this.playerHealth = 15;
    this.isGameOver = false;
    this.difficultyLevel = 1;
    this.levelStartTime = Date.now();
    this.tickCounter = 0;

    // Reset stats
    this.playerPoints = 0;
    this.correctKeyPresses = 0;
    this.totalKeyPresses = 0;
    this.gameStartTime = Date.now();
    this.updatePoints(0);
    this.updateAccuracy(true); // Reset to 100%

    // Remove all ants
    for (let i = this.ants.length - 1; i >= 0; i--) {
      this.removeAnt(i);
    }

    for (let i = this.vultures.length - 1; i >= 0; i--) {
      this.removeVulture(i);
    }

    this.vultureTickCounter = 0;
    this.vultureSpawnCounter = 0;
    this.nextVultureSpawnTime = 1500;
    this.currentVultureSequence = -1;
    this.vultureGroupsDefeated = 0;

    // Reset typing state
    this.currentTypingWord = '';
    this.activeAntIndex = -1;
    this.focusedWordContainer.visible = false;

    // Reset health display
    this.updateHealthDisplay();

    // Remove any game over text
    // Find and remove game over and restart texts
    for (let i = this.gameContainer.children.length - 1; i >= 0; i--) {
      const child = this.gameContainer.children[i];
      if (child instanceof Text &&
        (child.text === 'GAME OVER' || child.text === 'Press R to restart')) {
        this.gameContainer.removeChild(child);
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    // Update the key state
    this.keysPressed[event.key] = false;
  }

  private handleTyping(event: KeyboardEvent) {
    // Ignore special keys like arrows, shift, etc.
    if ((event.key.length !== 1 && event.key !== 'Backspace') || this.isScorePopupVisible) {
      return;
    }

    // Check if we're starting a new word
    if (this.activeAntIndex === -1) {
      // Get player position to calculate ant distances
      const playerCenterX = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;

      // Create array of ants with their distances from player
      const antsWithDistance = this.ants.map((ant, index) => {
        const antCenterX = ant.ant.x + ant.ant.width / 2;
        return {
          index,
          distance: Math.abs(antCenterX - playerCenterX),
          word: ant.word
        };
      });

      // Sort by distance (closest first)
      antsWithDistance.sort((a, b) => a.distance - b.distance);

      // Limit to only visible ants (based on maxVisibleTexts)
      const visibleAnts = antsWithDistance.slice(0, this.maxVisibleTexts);

      // Find an ant whose word starts with the current typing (only search visible ants)
      const matchingAntInfo = visibleAnts.find(ant =>
        ant.word.toLowerCase().startsWith(event.key.toLowerCase())
      );

      // If no visible ant matches, show error feedback and track incorrect keystroke
      if (!matchingAntInfo) {
        this.showTypingFeedback(event.key, 0xFF0000); // Red for incorrect
        this.updateAccuracy(false);
        return;
      }

      // We found a matching ant, set it as active
      this.activeAntIndex = matchingAntInfo.index;

      // Start typing the word
      const activeAnt = this.ants[this.activeAntIndex];
      activeAnt.word = activeAnt.word.slice(1);
      this.currentTypingWord = event.key;

      // Update the last active ant index and make the target visible
      this.lastActiveAntIndex = this.activeAntIndex;
      this.targetIndicator.visible = true;

      // Show feedback for correct key and track correct keystroke
      this.showTypingFeedback(event.key, 0x00FF00); // Green for correct
      this.updateAccuracy(true);

      // Add points for starting a new word
      this.updatePoints(5);
    } else {
      // We're continuing to type an already active word
      const activeAnt = this.ants[this.activeAntIndex];

      if (activeAnt.word.toLowerCase().startsWith(event.key.toLowerCase())) {
        // Correct key pressed
        activeAnt.word = activeAnt.word.slice(1);
        this.currentTypingWord += event.key;
        this.showTypingFeedback(event.key, 0x00FF00); // Green for correct
        this.updateAccuracy(true);

        // Add points for each correct keystroke
        this.updatePoints(1);

        // Check if the word is complete
        if (activeAnt.word.length === 0) {
          this.showTypingFeedback('✓', 0x00FF00, 800); // Green checkmark, longer display
          this.focusedWordContainer.visible = false; // Hide the container explicitly

          // Bonus points for completing a word
          // More points for longer words (length of current typing)
          const wordCompletionBonus = Math.max(10, this.currentTypingWord.length * 2);
          this.updatePoints(wordCompletionBonus);

          // Remove the ant
          this.removeAnt(this.activeAntIndex);
          this.currentTypingWord = '';
          this.activeAntIndex = -1;
        }
      } else {
        // Incorrect key pressed
        this.showTypingFeedback(event.key, 0xFF0000); // Red for incorrect
        this.updateAccuracy(false);
      }
    }

    // Update the highlight
    this.highlightActiveAnt();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.app) {
      // Resize the app to match the window size
      this.app.renderer.resize(window.innerWidth, window.innerHeight);

      // Update positions based on new screen dimensions
      this.centerGameContainer();
    }
  }

  // Clean up event listeners when component is destroyed
  ngOnDestroy() {
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

  async ngOnInit() {
    // Initialize the application
    this.app = new Application();
    TexturePool.textureOptions.scaleMode = 'nearest';
    await this.app.init({
      resizeTo: window,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    });
    document.body.appendChild(this.app.canvas);

    this.app.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

    // Create main game container - all game elements will be children of this
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    // Load background
    const backgroundTexture = await Assets.load('back.png');
    const background = new Sprite(backgroundTexture);
    background.width = this.app.screen.width / 3;
    background.height = this.app.screen.height / 3;
    this.gameContainer.addChild(background);

    // Set the game container scale
    this.gameContainer.scale.set(3);

    // Create floor container
    this.floorContainer = new Container();
    this.gameContainer.addChild(this.floorContainer);

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
    }

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
    }

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

    // Create floor tiles
    for (let i = 0; i < 45; i++) {
      let floorTile;
      if (i % 2 == 0) {
        floorTile = new Sprite(spritesheet.textures.floorTile1);
      } else {
        floorTile = new Sprite(spritesheet.textures.floorTile2);
      }
      floorTile.x = i * 14;
      floorTile.y = 0; // Set to 0 since we'll position the entire container
      this.floorContainer.addChild(floorTile);
    }

    // Create player animation
    this.playerIdleAnimation = new AnimatedSprite(playerIdleSpriteSheet.animations.idle);
    this.gameContainer.addChild(this.playerIdleAnimation);
    this.playerIdleAnimation.play();
    this.playerIdleAnimation.animationSpeed = .13;

    // Position player at center of screen (in the unscaled coordinates)
    this.playerIdleAnimation.x = (this.app.screen.width / 3) / 2 - this.playerIdleAnimation.width / 2;
    this.playerIdleAnimation.y = (this.app.screen.height / 3) / 1.6;

    // Set up the focused word view
    this.setupFocusedWordView();

    // Set up the typing feedback
    this.setupTypingFeedback();

    this.setupTargetIndicator();

    // Center the game container initially
    this.centerGameContainer();

    this.setupLevelAnnouncement();

    this.setupStatsDisplay();

    // Set up keyboard listeners
    this.setupKeyboardListeners();

    this.spawnAnt();
  }

  ngAfterViewInit() {
    // We can initialize any popup-specific DOM manipulations here
    if (this.popupElement) {
      this.createSparkles();
    }
  }

  // Create sparkle effects for the popup
  private createSparkles() {
    const popup = this.popupElement.nativeElement;
    for (let i = 0; i < 15; i++) {
      const sparkle = document.createElement('div');
      sparkle.classList.add('sparkles');

      // Random position around the popup
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;

      sparkle.style.left = posX + '%';
      sparkle.style.top = posY + '%';

      // Random delay
      sparkle.style.animationDelay = Math.random() * 2 + 's';

      popup.appendChild(sparkle);
    }
  }

  // Show the high score popup
  showScorePopup() {
    this.isScorePopupVisible = true;
    this.playerName = ''; // Reset player name
  }

  // Hide the high score popup
  hideScorePopup() {
    const popup = this.popupElement.nativeElement;
    popup.style.animation = 'slideUp 0.5s ease reverse forwards';

    setTimeout(() => {
      const container = popup.parentElement;
      container.style.animation = 'fadeIn 0.5s ease reverse forwards';

      setTimeout(() => {
        this.isScorePopupVisible = false;
      }, 500);
    }, 400);

    this.restartGame();
  }

  // Handle form submission
  async submitScore() {
    if (this.playerName.trim() === '') {
      return; // Don't submit if name is empty
    }

    console.log('Player name:', this.playerName);
    console.log('Score:', this.playerPoints);

    // Here you would implement your leaderboard saving logic
    // For example, you might call a service to save to a database

    try {
      const accuracyValue = parseFloat(
        this.accuracyText.text.replace("Accuracy: ", "").replace("%", "")
      );
      const timeValue = this.gameTimer.text.replace("Time: ","")
      const scoreData = {
        player_name: this.playerName,
        points: this.playerPoints,
        accuracy: accuracyValue,
        time: timeValue
      }

      const response = await firstValueFrom(this.http.post(`${environment.apiUrl}/fast-hands/save-score`, scoreData));

      console.log(response);

    } catch (error) {
      console.error('Error submitting score:' + error);
    }

    // Hide the popup after submission
    this.hideScorePopup();

    // Reset game or return to menu as needed
    this.restartGame();
  }

  // Format score with commas
  formatScore(score: number): string {
    return new Intl.NumberFormat().format(score);
  }

  private setupFocusedWordView() {
    // Create a container for the focused word display at the bottom of the screen
    this.focusedWordContainer = new Container();
    this.gameContainer.addChild(this.focusedWordContainer);

    // Create a background for the container
    const focusedWordBackground = new Graphics();
    focusedWordBackground.beginFill(0x000000, 0.7);
    focusedWordBackground.drawRect(0, 0, this.app.screen.width / 3, 20);
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
    this.focusedWordText.x = (this.app.screen.width / 3) / 2;
    this.focusedWordText.y = 10;
    this.focusedWordContainer.addChild(this.focusedWordText);

    // Create a progress bar that shows typing progress
    this.typingProgressBar = new Graphics();
    this.focusedWordContainer.addChild(this.typingProgressBar);

    // Position the container at the bottom of the screen with some margin
    this.focusedWordContainer.y = (this.app.screen.height / 3) - 30;

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
    this.typingFeedback.anchor.set(0.5, 1);
    this.typingFeedback.x = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;
    this.typingFeedback.y = this.playerIdleAnimation.y - 10;

    // Add to the game container
    this.gameContainer.addChild(this.typingFeedback);

    // Initially hidden
    this.typingFeedback.visible = false;
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
    this.typingFeedback.x = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;
    this.typingFeedback.y = this.playerIdleAnimation.y - 10;

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

  centerGameContainer() {
    // Update background size
    const background = this.gameContainer.getChildAt(0) as Sprite;
    background.width = this.app.screen.width / 3;
    background.height = this.app.screen.height / 3;

    // Position floor at the bottom of the screen
    // Leave a small margin from the bottom (10 pixels in unscaled coordinates)
    const bottomPosition = (this.app.screen.height / 3);
    this.floorContainer.y = bottomPosition - 16; // 16 is the height of floor tiles

    // Center the player
    this.playerIdleAnimation.x = (this.app.screen.width / 3) / 2 - this.playerIdleAnimation.width / 2;
    this.playerIdleAnimation.y = bottomPosition - this.playerIdleAnimation.height - 16; // Position player just above the floor

    // Update ant vertical positions to be on the floor
    // But preserve their horizontal positions (don't reset movement)
    for (let antObj of this.ants) {
      antObj.ant.y = bottomPosition - antObj.ant.height - 16; // Same height as player
      // Update text position to match ant position
      this.updateTextPosition(antObj);
    }

    // Update focused word container position
    if (this.focusedWordContainer) {
      this.focusedWordContainer.y = (this.app.screen.height / 3) - 30;
    }

    if (this.typingFeedback) {
      this.typingFeedback.x = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;
      this.typingFeedback.y = this.playerIdleAnimation.y - 10;
    }

    // Update target indicator position after resize
    if (this.targetIndicator && this.targetIndicator.visible) {
      const antToTrack = this.activeAntIndex !== -1 ? this.activeAntIndex : this.lastActiveAntIndex;
      if (antToTrack !== -1 && antToTrack < this.ants.length) {
        const ant = this.ants[antToTrack];
        const antCenterX = ant.ant.x + (ant.ant.width / 2) * (ant.ant.scale.x < 0 ? -1 : 1);
        const antCenterY = ant.ant.y - 15;

        // Immediately update position without animation on resize
        this.targetPosition = { x: antCenterX, y: antCenterY };
        this.targetIndicator.x = antCenterX;
        this.targetIndicator.y = antCenterY;
      }
    }

    if (this.levelAnnouncement) {
      this.levelAnnouncement.x = (this.app.screen.width / 3) / 2;
      this.levelAnnouncement.y = (this.app.screen.height / 3) / 2;
    }

    if (this.healthText) {
      this.healthText.x = 10;
      this.healthText.y = 10;
    }

    if (this.pointsText) {
      this.pointsText.x = 10;
      this.pointsText.y = 25;
    }

    if (this.accuracyText) {
      this.accuracyText.x = 10;
      this.accuracyText.y = 40;
    }

    if (this.gameTimer) {
      this.gameTimer.x = 10;
      this.gameTimer.y = 55;
    }
  }

  // Get a random word based on spawn side (left or right)
  getRandomWord(spawnFromLeft: boolean): string {
    // First, select a random category
    const categories = Object.keys(this.wordCategories);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // Get all words from that category
    const words = this.wordCategories[randomCategory as keyof typeof this.wordCategories];

    // Filter words based on which side the ant is spawning from
    // Left side ants get words starting with a-m
    // Right side ants get words starting with n-z
    const filteredWords = words.filter(word => {
      const firstLetter = word.charAt(0).toLowerCase();
      if (spawnFromLeft) {
        return firstLetter <= 'm'; // First half of alphabet (a-m)
      } else {
        return firstLetter > 'm';  // Second half of alphabet (n-z)
      }
    });

    // If we don't have any words that match our criteria in this category, try again with another category
    if (filteredWords.length === 0) {
      return this.getRandomWord(spawnFromLeft); // Recursively try another category
    }

    // Return a random word from the filtered list
    return filteredWords[Math.floor(Math.random() * filteredWords.length)];
  }

  private spawnVultureGroup() {
    // Determine starting number (either 1, 4, or 7)
    const startNumber = Math.floor(Math.random() * 3) * 3 + 1; // Will be 1, 4, or 7

    // Create three vultures with sequential numbers
    const positions = this.getRandomVulturePositions(3);

    for (let i = 0; i < 3; i++) {
      this.spawnVulture(positions[i].x, startNumber + i);
    }

    this.vultureGroups++;

  }

  private getRandomVulturePositions(count: number): { x: number }[] {
    const positions: { x: number }[] = [];
    const screenWidth = this.app.screen.width / 3;

    // Account for vulture width (using the largest frame width from vulture atlas)
    const vultureWidth = 30; // Maximum width from your vulture frames

    // Calculate usable screen width (accounting for vulture width)
    const usableWidth = screenWidth - vultureWidth;

    // Divide screen into sections with margins
    const sectionWidth = usableWidth / count;
    const margin = 20; // Extra margin to keep vultures more centered

    for (let i = 0; i < count; i++) {
      // Random position within each section, with margin
      const minX = i * sectionWidth + margin;
      const maxX = (i + 1) * sectionWidth - margin;

      // Ensure we never go out of bounds
      const safeMinX = Math.max(0, minX);
      const safeMaxX = Math.min(screenWidth - vultureWidth, maxX);

      // If min > max (possible with very small screens), use the middle of the range
      const x = safeMinX < safeMaxX
        ? safeMinX + Math.random() * (safeMaxX - safeMinX)
        : (screenWidth - vultureWidth) / (count + 1) * (i + 1);

      positions.push({ x });
    }

    // Shuffle the positions so they don't appear in sequence left to right
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    return positions;
  }

  private spawnVulture(xPosition: number, number: number) {
    // Create vulture sprite
    const vulture = new AnimatedSprite(this.vultureSpriteSheet.animations['fly']);
    this.gameContainer.addChild(vulture);
    vulture.play();
    vulture.animationSpeed = 0.1;

    // Position at the top of the screen
    vulture.x = xPosition;
    vulture.y = -30; // Start above the screen

    // Randomly flip some vultures for variety
    if (Math.random() > 0.5) {
      vulture.scale.x = -1;
    }

    // Create text with the number
    const text = new Text(number.toString(), {
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
      vulture,
      text,
      number,
      clicked: false,
      group: this.vultureGroups
    });
  }

  // Update vulture positions and check if they're off screen
  private updateVultures() {
    // Move vultures down
    for (let i = this.vultures.length - 1; i >= 0; i--) {
      const vulture = this.vultures[i];

      // Move down
      vulture.vulture.y += this.vultureMovementSpeed * (1 + (this.difficultyLevel - 1) * 0.1);

      // Update text position
      if (vulture.vulture.scale.x == -1) {
        vulture.text.x = vulture.vulture.x - vulture.vulture.width / 2;
      } else {
        vulture.text.x = vulture.vulture.x + vulture.vulture.width / 2;
      }
      vulture.text.y = vulture.vulture.y - 10;

      // If vulture reaches the player's position, deal damage and remove
      if (vulture.vulture.y > this.playerIdleAnimation.y - 20) {
        this.takeDamage();
        this.removeVulture(i);
      }
    }
  }

  // Remove a vulture from the screen and array
  private removeVulture(index: number) {
    if (index >= 0 && index < this.vultures.length) {
      // Remove from display
      this.gameContainer.removeChild(this.vultures[index].vulture);
      this.gameContainer.removeChild(this.vultures[index].text);

      // Remove from array
      this.vultures.splice(index, 1);
    }
  }

  // Remove all clicked vultures (call after processing a group)
  private removeClickedVultures() {
    for (let i = this.vultures.length - 1; i >= 0; i--) {
      if (this.vultures[i].clicked) {
        this.removeVulture(i);
      }
    }
  }

  spawnAnt() {
    // Create ant sprite
    const newAnt = new AnimatedSprite(this.antSpriteSheet.animations['walk']);
    this.gameContainer.addChild(newAnt);
    newAnt.play();
    newAnt.animationSpeed = .1;

    const bottomPosition = (this.app.screen.height / 3);
    newAnt.y = bottomPosition - newAnt.height - 16;

    // Determine spawn side - even indices from left, odd indices from right
    const spawnFromLeft = this.ants.length % 2 === 0;

    // Set position and direction based on spawn side
    if (spawnFromLeft) {
      newAnt.x = 0;
      newAnt.scale.x = -1; // Moving right (spawned on left)
    } else {
      newAnt.x = this.app.screen.width / 3 + newAnt.width;
      newAnt.scale.x = 1; // Moving left (spawned on right)
    }

    // Get a random word for this ant based on which side it spawns from
    const word = this.getRandomWord(spawnFromLeft);

    // Create text with improved style for better visibility
    const text = new Text(word, {
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

    text.zIndex = 1000 - this.antCounter;

    this.gameContainer.addChild(text);

    const antWithText: AntWithText = {
      ant: newAnt,
      text: text,
      word: word
    };
    antWithText.text.anchor.set(0.5, Math.random() * 1);

    this.updateTextPosition(antWithText);
    this.ants.push(antWithText);
    this.antCounter++;
  }

  updateTextPosition(antObj: AntWithText) {
    // Calculate the center of the ant
    const antCenterX = antObj.ant.x + (antObj.ant.width / 2) * (antObj.ant.scale.x < 0 ? -1 : 1);

    // Set text anchor point
    antObj.text.x = antCenterX;
    antObj.text.y = antObj.ant.y - 10; // Position slightly higher than before

    // Add a slight bounce animation
    const bounceAmount = Math.sin(this.tickCounter * 0.1) * 1.5;
    antObj.text.y += bounceAmount;
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

  private updateTargetIndicatorPosition() {
    if (!this.targetIndicator.visible) return;

    // Calculate vector to target
    const dx = this.targetPosition.x - this.targetIndicator.x;
    const dy = this.targetPosition.y - this.targetIndicator.y;

    // Calculate distance
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we're very close, just snap to position
    if (distance < 0.5) {
      this.targetIndicator.x = this.targetPosition.x;
      this.targetIndicator.y = this.targetPosition.y;
      return;
    }

    // Calculate physics parameters based on targetTime
    // For a 0.3 second target time with 50ms ticks, we need to reach the target in ~6 ticks
    const ticksToTarget = this.targetTime * 1000 / 50; // Convert time to game ticks

    // Simple interpolation approach for more predictable timing
    const step = 1 / ticksToTarget;

    // Move a percentage of the remaining distance each tick
    this.targetIndicator.x += dx * step;
    this.targetIndicator.y += dy * step;

    // Add a slight pulsing effect
    const pulseScale = 1 + Math.sin(this.tickCounter * 0.2) * 0.15;
    this.targetIndicator.scale.set(pulseScale);
  }


  private highlightActiveAnt() {
    if (this.activeAntIndex !== -1 && this.activeAntIndex < this.ants.length) {
      const activeAnt = this.ants[this.activeAntIndex];

      // Update last active ant index
      this.lastActiveAntIndex = this.activeAntIndex;

      // Show the focused word container
      this.focusedWordContainer.visible = true;

      // Update the focused word text
      this.focusedWordText.text = activeAnt.word;

      // Highlight the typed part in the progress bar
      this.typingProgressBar.clear();
      this.typingProgressBar.beginFill(0x00FF00, 0.5);

      // Calculate progress width based on how much of the word is typed
      const totalWordLength = this.currentTypingWord.length + activeAnt.word.length;
      const progressWidth = (this.currentTypingWord.length / totalWordLength) * (this.app.screen.width / 3);
      this.typingProgressBar.drawRect(0, 0, progressWidth, 20);
      this.typingProgressBar.endFill();

      // Update target position for the indicator (will happen also in simulateTick)
      this.updateTargetPositionForAnt(this.activeAntIndex);

      // Make sure the target indicator is visible
      this.targetIndicator.visible = true;

      // Reset styles for all ants
      this.ants.forEach((antObj, index) => {
        if (index === this.activeAntIndex) {
          // Highlight the active ant's text
          antObj.text.style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 9.5, // Slightly larger
            fill: 0xFFFF00, // Yellow text
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
        } else {
          // Regular style for other ants
          antObj.text.style = new TextStyle({
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
        }
      });
    } else {
      // Hide the focused word container if no ant is active
      this.focusedWordContainer.visible = false;

      // Don't hide the target indicator - we'll keep tracking the last highlighted ant
      // Only reset active ant index
      this.activeAntIndex = -1;
    }
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
  private removeAnt(index: number) {
    if (index >= 0 && index < this.ants.length) {
      // Remove the ant and text from the container
      this.gameContainer.removeChild(this.ants[index].ant);
      this.gameContainer.removeChild(this.ants[index].text);

      // Remove from the array
      this.ants.splice(index, 1);
    }
  }


  private getSpawnRate(): number {
    // Base spawn rates for each difficulty level (in ticks)
    // Remember that higher number = slower spawn rate
    const baseRates = [
      350,  // Level 1: Every 50 ticks (500ms)
      200,  // Level 2: Every 40 ticks (400ms)
      100,  // Level 3: Every 30 ticks (300ms)
      50,  // Level 4: Every 25 ticks (250ms)
      25   // Level 5: Every 20 ticks (200ms)
    ];

    // Get the base rate for current level (array is 0-indexed)
    const baseRate = baseRates[this.difficultyLevel - 1];

    // Calculate a gradual decrease within each level
    // This creates a smooth increase in difficulty within each level
    const ticksInCurrentLevel = (Date.now() - this.levelStartTime) / 10; // Convert ms to ticks
    const scaleFactor = 0.0002; // How quickly difficulty increases within a level

    // Calculate current spawn rate (gradually decreasing from the base rate, but never below certain minimum)
    const minimumRate = Math.max(15, baseRate - 10); // Never go below 15 ticks or baseRate-10
    const currentRate = Math.max(
      minimumRate,
      baseRate - Math.floor(ticksInCurrentLevel * scaleFactor)
    );

    return currentRate;
  }

  simulateTick() {
    // Skip game updates if game is over
    if (this.isGameOver) return;


    this.updateTimer();

    // Update difficulty level based on time
    this.updateDifficulty();

    this.updateVultures();

    this.vultureTickCounter++;
    if (this.vultureTickCounter >= this.nextVultureSpawnTime) {
      this.spawnVultureGroup();
      this.vultureTickCounter = 0;

      // Calculate next spawn time based on difficulty
      const baseSpawnTime = 2000 - (this.difficultyLevel * 200); // Decreases with difficulty
      const randomVariation = Math.floor(Math.random() * 500) - 250; // +/- 250 ticks
      this.nextVultureSpawnTime = Math.max(800, baseSpawnTime + randomVariation);

      this.vultureSpawnCounter++;
    }

    // Add bonus points for previous group if all were clicked in sequence



    // Keep track of ants to remove after the loop
    const antsToRemove: number[] = [];
    // Track if damage should be applied this tick
    let shouldTakeDamage = false;

    // Update ant positions and manage which texts are visible
    for (let i = 0; i < this.ants.length; i++) {
      // Move ants - speed increases with difficulty level
      const antSpeed = this.antsMovementSpeed * (1 + (this.difficultyLevel - 1) * 0.2);

      if (this.ants[i].ant.scale.x == -1) {
        this.ants[i].ant.x = this.ants[i].ant.x + antSpeed;
      } else {
        this.ants[i].ant.x = this.ants[i].ant.x - antSpeed;
      }

      // Check if ant is too close to the player
      if (this.ants[i].ant.x <= this.playerIdleAnimation.x + 35 && this.ants[i].ant.x >= this.playerIdleAnimation.x - 10) {
        // Mark for removal instead of removing immediately
        antsToRemove.push(i);
        // Flag damage should be taken
        shouldTakeDamage = true;
      } else {
        // Update the text position to follow the ant
        this.updateTextPosition(this.ants[i]);

        // Make text visible only for ants close to the player or being typed
        if (i !== this.activeAntIndex) {
          this.ants[i].text.visible = false;
        }
      }
    }

    // Apply damage if any ant reached the player
    if (shouldTakeDamage) {
      this.takeDamage();
    }

    // Update target position if we're tracking an ant
    const antToTrack = this.activeAntIndex !== -1 ? this.activeAntIndex : this.lastActiveAntIndex;
    if (antToTrack !== -1 && antToTrack < this.ants.length) {
      this.updateTargetPositionForAnt(antToTrack);
    } else if (this.lastActiveAntIndex !== -1 && this.lastActiveAntIndex >= this.ants.length) {
      // If the last active ant no longer exists, hide the indicator
      this.targetIndicator.visible = false;
      this.lastActiveAntIndex = -1;
    }

    // Update target indicator position
    this.updateTargetIndicatorPosition();

    // Remove ants in reverse order to avoid index shifting problems
    if (antsToRemove.length > 0) {
      // Sort in descending order to remove from back to front
      antsToRemove.sort((a, b) => b - a);

      for (const index of antsToRemove) {
        // Check if we're removing the active ant
        if (index === this.activeAntIndex) {
          // Reset typing state
          this.currentTypingWord = '';
          this.activeAntIndex = -1;
          this.focusedWordContainer.visible = false; // Hide the container explicitly
        } else if (index < this.activeAntIndex) {
          // If we're removing an ant before the active one,
          // decrement the active index to keep it pointing to the correct ant
          this.activeAntIndex--;
        }

        // If we're removing the last active ant, hide the indicator
        if (index === this.lastActiveAntIndex) {
          this.lastActiveAntIndex = -1;
          this.targetIndicator.visible = false;
        } else if (index < this.lastActiveAntIndex) {
          // If we're removing an ant before the last active one,
          // decrement the index to keep it pointing to the correct ant
          this.lastActiveAntIndex--;
        }

        this.removeAnt(index);
      }
    }

    // Limit the number of visible texts (not including the active one)
    this.limitVisibleTexts();

    // Only spawn ants if the game isn't over
    if (!this.isGameOver) {
      // Get current spawn rate based on difficulty
      const currentSpawnRate = this.getSpawnRate();

      // Spawn ant based on the calculated rate
      if (this.tickCounter % Math.floor(currentSpawnRate) == 0) {
        this.spawnAnt();
      }
    }

    this.tickCounter++;
  }

  private limitVisibleTexts() {
    // Skip if we have few ants

    // Get player position
    const playerCenterX = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;

    // Calculate distances and create a sortable array
    const antsWithDistance = this.ants.map((ant, index) => {
      const antCenterX = ant.ant.x + ant.ant.width / 2;
      return {
        index,
        distance: Math.abs(antCenterX - playerCenterX),
        isActive: index === this.activeAntIndex
      };
    });

    // Sort by distance (closest first)
    antsWithDistance.sort((a, b) => a.distance - b.distance);

    // Always keep the active ant visible
    let visibleCount = 0;
    for (const antInfo of antsWithDistance) {
      // Skip the active ant - we always want it visible
      if (antInfo.isActive) {
        continue;
      }

      // Show closest ants up to the limit
      if (visibleCount < this.maxVisibleTexts) {
        this.ants[antInfo.index].text.visible = true;
        visibleCount++;
      } else {
        this.ants[antInfo.index].text.visible = false;
      }
    }
  }

  public setTargetTime(seconds: number) {
    this.targetTime = seconds;
  }

  private handleCanvasClick(event: MouseEvent) {
    console.log("Canvas clicked!");

    // Skip if game is over
    if (this.isGameOver) return;

    // Get the bounding rectangle of the canvas
    const canvasBounds = this.app.canvas.getBoundingClientRect();

    // Calculate relative position within the canvas
    const relativeX = event.clientX - canvasBounds.left;
    const relativeY = event.clientY - canvasBounds.top;

    // Convert to game coordinates (accounting for scale)
    const clickX = relativeX / this.gameContainer.scale.x;
    const clickY = relativeY / this.gameContainer.scale.y;

    console.log(`Click at game coordinates: (${clickX}, ${clickY})`);

    // Check each vulture to see if it was clicked
    for (let i = 0; i < this.vultures.length; i++) {
      const vulture = this.vultures[i];

      // Skip if already clicked
      if (vulture.clicked) continue;

      var vultureBounds: any = []     // Check if click is on vulture

      if (vulture.vulture.scale.x === -1) {
        vultureBounds = {
          left: vulture.vulture.x - vulture.vulture.width,
          right: vulture.vulture.x,
          top: vulture.vulture.y,
          bottom: vulture.vulture.y + vulture.vulture.height
        }
      } else {
        vultureBounds = {
          left: vulture.vulture.x,
          right: vulture.vulture.x + vulture.vulture.width,
          top: vulture.vulture.y,
          bottom: vulture.vulture.y + vulture.vulture.height
        }
      }

      // Log vulture bounds for debugging
      console.log(`Vulture ${i} bounds:`, vultureBounds);

      if (
        clickX >= vultureBounds.left &&
        clickX <= vultureBounds.right &&
        clickY >= vultureBounds.top &&
        clickY <= vultureBounds.bottom
      ) {
        console.log(`Clicked on vulture ${i} with number ${vulture.number}`);

        if ([1, 4, 7].includes(vulture.number) && this.currentVultureSequence === -1) {
          this.currentVultureSequence = vulture.number;
          this.currentVultureGroup = vulture.group;
          vulture.clicked = true;
          // Update visual to show it was clicked
          vulture.vulture.tint = 0x88FF88; // Green tint
          vulture.text.style.fill = 0x00FF00; // Green text

          // Award points
          this.updatePoints(20);

          // Show feedback
          this.showTypingFeedback(`+20`, 0x00FF00, 500);

          this.updateAccuracy(true);

          // Move to the next number in sequence
          this.currentVultureSequence++;

          break;
        }
        // Check if this is the correct vulture in the sequence
        if (vulture.number === this.currentVultureSequence && vulture.group == this.currentVultureGroup) {
          // Correct vulture clicked!
          vulture.clicked = true;

          // Update visual to show it was clicked
          vulture.vulture.tint = 0x88FF88; // Green tint
          vulture.text.style.fill = 0x00FF00; // Green text

          // Award points
          this.updatePoints(20);

          // Show feedback
          this.showTypingFeedback(`+20`, 0x00FF00, 500);

          this.updateAccuracy(true);

          // Move to the next number in sequence
          this.currentVultureSequence++;

          // Check if we completed a set of vultures
          // We probably don't need another specific function to check since we already follow currentvulturesequence
          // if (this.areAllVulturesInSequenceClicked()) {
          if ([4, 7, 10].includes(this.currentVultureSequence)) {
            // Award bonus for completing in correct order
            this.updatePoints(30);
            this.vultureGroupsDefeated++;
            this.showTypingFeedback('Sequence Complete! +30', 0xFFFF00, 1000);
            this.removeClickedVultures();
            this.currentVultureSequence = -1;
          }
        } else {
          // Wrong vulture clicked!
          this.showTypingFeedback('Wrong order!', 0xFF0000, 500);

          // Small penalty
          this.updatePoints(-10);

          // Update accuracy
          this.updateAccuracy(false);
        }

        // Break as we've handled the click
        break;
      }
    }
  }
}
