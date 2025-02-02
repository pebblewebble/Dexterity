import { Component, HostListener } from '@angular/core';

@Component({
  // selector: 'app-counterstrafe',
  selector: 'app-root',
  imports: [],
  templateUrl: './counterstrafe.component.html',
  styleUrl: './counterstrafe.component.css'
})
export class CounterstrafeComponent {
 public success: string = '';
  public timeDiff: number = 0;
  public pressedKeys: { [key: string]: boolean } = { 'a': false, 'd': false };
  private keyPressTimestamps: { [key: string]: number } = {};
  private timingWindow: number = 200;
  public currentVelocity: number = 0;

  // CSGO movement constants
  private readonly SV_ACCELERATE = 5.5;
  private readonly TICK_RATE = 64;
  private readonly TICK_INTERVAL = 1 / this.TICK_RATE;
  private readonly MAX_SPEED = 215; // AK-47 max speed
  private readonly SURFACE_FRICTION = 1;
  private readonly ACCELERATION_PER_TICK = this.SV_ACCELERATE * this.TICK_INTERVAL * this.MAX_SPEED * this.SURFACE_FRICTION;

  constructor() {
    // Start the tick simulation
    setInterval(() => this.simulateTick(), this.TICK_INTERVAL * 1000);
  }

  simulateTick() {
    // Check for counter-strafing (pressing opposite direction)
    if (this.pressedKeys['a'] && this.pressedKeys['d']) {
      // If both keys are pressed, apply counter movement based on current direction
      if (this.currentVelocity > 0) {
        // Moving right, A will counter it with double acceleration
        this.currentVelocity = Math.max(
          this.currentVelocity - (this.ACCELERATION_PER_TICK * 2),
          -this.MAX_SPEED
        );
      } else {
        // Moving left, D will counter it with double acceleration
        this.currentVelocity = Math.min(
          this.currentVelocity + (this.ACCELERATION_PER_TICK * 2),
          this.MAX_SPEED
        );
      }
    } else if (this.pressedKeys['a']) {
      this.currentVelocity = Math.max(
        this.currentVelocity - this.ACCELERATION_PER_TICK,
        -this.MAX_SPEED
      );
    } else if (this.pressedKeys['d']) {
      this.currentVelocity = Math.min(
        this.currentVelocity + this.ACCELERATION_PER_TICK,
        this.MAX_SPEED
      );
    } else {
      // Normal friction when no keys are pressed
      if (this.currentVelocity > 0) {
        this.currentVelocity = Math.max(0, this.currentVelocity - this.ACCELERATION_PER_TICK);
      } else if (this.currentVelocity < 0) {
        this.currentVelocity = Math.min(0, this.currentVelocity + this.ACCELERATION_PER_TICK);
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    
    if (key === 'a' || key === 'd') {
      this.pressedKeys[key] = true;
    }

    const currentTime = Date.now();
    if (key !== 'a' && key !== 'd') return;

    const oppositeKey = key === 'a' ? 'd' : 'a';
    const lastOppositeKeyTime = this.keyPressTimestamps[oppositeKey] || 0;

    if (lastOppositeKeyTime > 0) {
      this.timeDiff = currentTime - lastOppositeKeyTime;

      if (this.timeDiff <= this.timingWindow) {
        this.success = 'Success!';
      } else {
        this.success = 'Too slow!';
      }
      this.keyPressTimestamps = {};
    } else {
      this.keyPressTimestamps[key] = currentTime;
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'd') {
      this.pressedKeys[key] = false;
    }
  }
} 
