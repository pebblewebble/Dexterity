import { Component } from '@angular/core';
import { Assets, Application, AnimatedSprite, Sprite, Spritesheet, TexturePool, Texture } from 'pixi.js';

@Component({
  selector: 'app-fast-hands',
  imports: [],
  templateUrl: './fast-hands.component.html',
  styleUrl: './fast-hands.component.css'
})
export class FastHandsComponent {
  private app: any;
  async ngOnInit() {
    this.app = new Application();
    TexturePool.textureOptions.scaleMode = 'nearest';
    await this.app.init({ resizeTo: window });
    const backgroundTexture = await Assets.load('back.png');
    const background = new Sprite(backgroundTexture);
    background.width = this.app.screen.width / 3;
    background.height = this.app.screen.height / 3;
    this.app.stage.addChildAt(background, 0);
    this.app.stage.scale.set(3);
    document.body.appendChild(this.app.canvas);

    const atlasData = {
      frames: {
        floorTile1: {
          frame: { x: 15, y: 15, w: 16, h: 16},
          sourceSize: { w: 16, h: 16},
          spriteSourceSize: { x: 0, y: 0, w: 16, h: 16},
          rotated: false,
          trimmed: false,
        },
        floorTile2: {
          frame: { x: 48, y: 15, w: 16, h: 16},
          sourceSize: { w: 16, h: 16},
          spriteSourceSize: { x: 0, y: 0, w: 16, h: 16},
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
        size: { w: 400, h: 368 },  // Keep your original size
        scale: "1"
      },
    }

    const texture = await Assets.load(atlasData.meta.image);
    const spritesheet = new Spritesheet(texture, atlasData);
    await spritesheet.parse();


    for (let i = 0; i < 40; i++) {
      var floorTile;
      if (i % 2 == 0) {
        floorTile = new Sprite(spritesheet.textures.floorTile1);
      } else {
        floorTile = new Sprite(spritesheet.textures.floorTile2);
      }
      floorTile.x = i * 14;
      floorTile.y = 200;
      this.app.stage.addChild(floorTile);
    }

  }
}
