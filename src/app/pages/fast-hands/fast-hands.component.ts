import { Component, HostListener } from '@angular/core';
import { Assets, Application, AnimatedSprite, Sprite, Spritesheet, TexturePool, Texture, Container } from 'pixi.js';
@Component({
  selector: 'app-fast-hands',
  imports: [],
  templateUrl: './fast-hands.component.html',
  styleUrl: './fast-hands.component.css'
})
export class FastHandsComponent {
  private app: any;
  private gameContainer!: Container;
  private floorContainer!: Container;
  private playerIdleAnimation!: AnimatedSprite;
  private antSpriteSheet!: Spritesheet;
  private ants: AnimatedSprite[] = [];
  private antsMovementSpeed: number = 1;
  private tickCounter: number = 0;

  constructor() {
    setInterval(() => this.simulateTick(), 100);
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

    // Center the game container initially
    this.centerGameContainer();
    this.spawnAnt();
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
    for (let ant of this.ants) {
      ant.y = bottomPosition - ant.height - 16; // Same height as player
    }
  }

  spawnAnt() {
    const newAnt = new AnimatedSprite(this.antSpriteSheet.animations['walk'])
    this.gameContainer.addChild(newAnt);
    newAnt.play();
    newAnt.animationSpeed = .1;


    const bottomPosition = (this.app.screen.height / 3);
    newAnt.y = bottomPosition - newAnt.height - 16;
    if (this.ants.length % 2 == 0) {
      newAnt.x = 0;
      newAnt.scale.x = -1;
    } else {
      newAnt.x = this.app.screen.width / 3 + newAnt.width;
      newAnt.scale.x = 1;
    }

    this.ants.push(newAnt);
  }

  simulateTick() {
    for (let i = 0; i < this.ants.length; i++) {
      if (this.ants[i].scale.x == -1) {
        this.ants[i].x = this.ants[i].x + this.antsMovementSpeed;
      } else {
        this.ants[i].x = this.ants[i].x - this.antsMovementSpeed;
      }
    }
    if (this.tickCounter % 100 == 0) {
      this.spawnAnt();
    }
    console.dir(this.tickCounter)
    this.tickCounter++;
  }
}
