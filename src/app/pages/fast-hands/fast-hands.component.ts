import { Component, HostListener, OnInit } from '@angular/core';
import { Assets, Application, AnimatedSprite, Sprite, Spritesheet, TexturePool, Texture, Container, Text, Graphics, TextStyle } from 'pixi.js';

interface AntWithText {
  ant: AnimatedSprite;
  text: Text;
  word: string;
}

@Component({
  selector: 'app-fast-hands',
  imports: [],
  templateUrl: './fast-hands.component.html',
  styleUrl: './fast-hands.component.css'
})
export class FastHandsComponent implements OnInit {
  private app: any;
  private gameContainer!: Container;
  private floorContainer!: Container;
  private playerIdleAnimation!: AnimatedSprite;
  private antSpriteSheet!: Spritesheet;
  private ants: AntWithText[] = [];
  private antsMovementSpeed: number = 1;
  private tickCounter: number = 0;

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
  private textVisibilityDistance: number = 100; // Distance threshold to show text

  // Typing feedback properties
  private typingFeedback!: Text;
  private feedbackTimeout: any;

  // Word categories for different themes
  private wordCategories = {
    // Ant and insect related words
    insects: [
      'ant', 'crawl', 'colony', 'queen', 'worker', 'soldier', 'tunnel',
      'scout', 'forage', 'larva', 'pupa', 'swarm', 'march', 'hill',
      'nest', 'eggs', 'trail', 'raid', 'team', 'build'
    ],
    // Action words
    actions: [
      'move', 'carry', 'lift', 'search', 'find', 'gather', 'collect',
      'store', 'climb', 'dig', 'defend', 'attack', 'follow', 'lead',
      'scent', 'signal', 'feed', 'grow', 'work', 'rest'
    ],
    // Descriptive words
    descriptors: [
      'tiny', 'small', 'quick', 'busy', 'strong', 'smart', 'brave',
      'tireless', 'hungry', 'clever', 'mighty', 'agile', 'social',
      'organized', 'diligent', 'patient', 'determined', 'focused'
    ]
  };

  constructor() {
    setInterval(() => this.simulateTick(), 50);
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
    console.log(`Key pressed: ${event.key}`);

    // Example of how to respond to a specific key
    // if (event.key === ' ' || event.key === 'Spacebar') {
    //   this.onSpacePressed();
    // }
  }

  private handleKeyUp(event: KeyboardEvent) {
    // Update the key state
    this.keysPressed[event.key] = false;
  }

  private handleTyping(event: KeyboardEvent) {
    // Ignore special keys like arrows, shift, etc.
    if (event.key.length !== 1 && event.key !== 'Backspace') {
      return;
    }

    // Check if we're starting a new word
    if (this.activeAntIndex === -1) {
      // Find an ant whose word starts with the current typing
      this.activeAntIndex = this.ants.findIndex(ant =>
        ant.word.toLowerCase().startsWith(event.key.toLowerCase())
      );
      const activeAnt = this.ants[this.activeAntIndex];
      activeAnt.word = activeAnt.word.slice(1, activeAnt.word.length);
    } else {
      // Show feedback based on whether we found a matching ant
      this.showTypingFeedback(event.key, 0x00FF00); // Green for correct
      const activeAnt = this.ants[this.activeAntIndex];
      console.dir(activeAnt.word);
      if (activeAnt.word.toLowerCase().startsWith(event.key.toLowerCase())) {
        activeAnt.word = activeAnt.word.slice(1, activeAnt.word.length);
        this.currentTypingWord += event.key;
        this.showTypingFeedback(event.key, 0x00FF00); // Green for correct

        // Check if the word is complete
        if (activeAnt.word.length == 0) {
          this.showTypingFeedback('✓', 0x00FF00, 800); // Green checkmark, longer display

          // Remove the ant
          setTimeout(() => {
            this.removeAnt(this.activeAntIndex);
            this.currentTypingWord = '';
            this.activeAntIndex = -1;
          }, 100);
        }
      } else {
        // No longer matches
        this.showTypingFeedback(event.key, 0xFF0000); // Red for incorrect
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

    // Load and parse textures
    const texture = await Assets.load(atlasData.meta.image);
    const playerIdleTexture = await Assets.load(playerIdleAtlas.meta.image);
    const antTexture = await Assets.load(antAtlas.meta.image);
    const spritesheet = new Spritesheet(texture, atlasData);
    const playerIdleSpriteSheet = new Spritesheet(playerIdleTexture, playerIdleAtlas);
    this.antSpriteSheet = new Spritesheet(antTexture, antAtlas);
    await spritesheet.parse();
    await playerIdleSpriteSheet.parse();
    await this.antSpriteSheet.parse();

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

    // Center the game container initially
    this.centerGameContainer();

    // Set up keyboard listeners
    this.setupKeyboardListeners();

    this.spawnAnt();
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
      // strokeThickness: 4,
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

    // Update typing feedback position
    if (this.typingFeedback) {
      this.typingFeedback.x = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;
      this.typingFeedback.y = this.playerIdleAnimation.y - 10;
    }
  }

  // Get a random word from our predefined categories
  getRandomWord(): string {
    // First, select a random category
    const categories = Object.keys(this.wordCategories);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // Then select a random word from that category
    const words = this.wordCategories[randomCategory as keyof typeof this.wordCategories];
    return words[Math.floor(Math.random() * words.length)];
  }

  spawnAnt() {
    // Create ant sprite
    const newAnt = new AnimatedSprite(this.antSpriteSheet.animations['walk']);
    this.gameContainer.addChild(newAnt);
    newAnt.play();
    newAnt.animationSpeed = .1;

    const bottomPosition = (this.app.screen.height / 3);
    newAnt.y = bottomPosition - newAnt.height - 16;

    // Set position and direction based on spawn side
    if (this.ants.length % 2 == 0) {
      newAnt.x = 0;
      newAnt.scale.x = -1; // Moving right (spawned on left)
    } else {
      newAnt.x = this.app.screen.width / 3 + newAnt.width;
      newAnt.scale.x = 1; // Moving left (spawned on right)
    }

    // Get a random word for this ant
    const word = this.getRandomWord();

    // Create text with improved style for better visibility
    const text = new Text(word, {
      fontFamily: 'Arial',
      fontSize: 8.5,
      fill: 0xFFFFFF,
      stroke: 0x000000,
      // strokeThickness: 2,
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

    this.gameContainer.addChild(text);

    const antWithText: AntWithText = {
      ant: newAnt,
      text: text,
      word: word
    };

    this.updateTextPosition(antWithText);
    this.ants.push(antWithText);
  }

  updateTextPosition(antObj: AntWithText) {
    // Calculate the center of the ant
    const antCenterX = antObj.ant.x + (antObj.ant.width / 2) * (antObj.ant.scale.x < 0 ? -1 : 1);

    // Set text anchor point
    antObj.text.anchor.set(0.5, 1);
    antObj.text.x = antCenterX;
    antObj.text.y = antObj.ant.y - 10; // Position slightly higher than before

    // Add a slight bounce animation
    const bounceAmount = Math.sin(this.tickCounter * 0.1) * 1.5;
    antObj.text.y += bounceAmount;
  }

  private highlightActiveAnt() {
    if (this.activeAntIndex !== -1) {
      const activeAnt = this.ants[this.activeAntIndex];

      // Show the focused word container
      this.focusedWordContainer.visible = true;

      // Update the focused word text
      this.focusedWordText.text = activeAnt.word;

      // Highlight the typed part in the progress bar
      this.typingProgressBar.clear();
      this.typingProgressBar.beginFill(0x00FF00, 0.5); // Green for progress

      // Calculate progress width based on how much of the word is typed
      const progressWidth = (this.currentTypingWord.length / activeAnt.word.length) * (this.app.screen.width / 3);
      this.typingProgressBar.drawRect(0, 0, progressWidth, 20);
      this.typingProgressBar.endFill();

      // Reset styles for all ants
      this.ants.forEach((antObj, index) => {
        if (index === this.activeAntIndex) {
          // Highlight the active ant's text
          antObj.text.style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 9.5, // Slightly larger
            fill: 0xFFFF00, // Yellow text
            stroke: 0x000000,
            // strokeThickness: 3,
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
            // strokeThickness: 2,
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
    }
  }

  private removeAnt(index: number) {
    if (index >= 0 && index < this.ants.length) {
      // Remove the ant and text from the container
      this.gameContainer.removeChild(this.ants[index].ant);
      this.gameContainer.removeChild(this.ants[index].text);

      // Remove from the array
      this.ants.splice(index, 1);

      // Hide the focused word container
      this.focusedWordContainer.visible = false;
    }
  }

  simulateTick() {

    // Get player position
    const playerCenterX = this.playerIdleAnimation.x + this.playerIdleAnimation.width / 2;

    // Update ant positions and manage which texts are visible
    for (let i = 0; i < this.ants.length; i++) {
      // Move ants
      if (this.ants[i].ant.scale.x == -1) {
        this.ants[i].ant.x = this.ants[i].ant.x + this.antsMovementSpeed;
      } else {
        this.ants[i].ant.x = this.ants[i].ant.x - this.antsMovementSpeed;
      }

      // Update the text position to follow the ant
      this.updateTextPosition(this.ants[i]);

      // Calculate distance from ant to player
      const antCenterX = this.ants[i].ant.x + this.ants[i].ant.width / 2;

      // Make text visible only for ants close to the player or being typed
      if (i !== this.activeAntIndex) {
        this.ants[i].text.visible = false;
      }
    }

    // Limit the number of visible texts (not including the active one)
    this.limitVisibleTexts();

    // Spawn new ant every 100 ticks
    if (this.tickCounter % 10 == 0) {
      this.spawnAnt();
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

  public adjustTextVisibility(maxVisible: number, visibilityDistance: number) {
    this.maxVisibleTexts = maxVisible;
    this.textVisibilityDistance = visibilityDistance;
  }

}
