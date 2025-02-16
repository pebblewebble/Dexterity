import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-counterstrafe',
  standalone:true,
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
  private readonly SV_ACCELERATE = 5.6;
  private readonly TICK_RATE = 64;
  private readonly TICK_INTERVAL = 1 / this.TICK_RATE;
  private readonly MAX_SPEED = 215; // AK-47 max speed
  private readonly SURFACE_FRICTION = 5.2; // Updated friction value
  private readonly ACCELERATION_PER_TICK = this.SV_ACCELERATE * this.TICK_INTERVAL * this.MAX_SPEED;
  private tickCounter: number = 0;
  private startTick: number | null = null;

  constructor() {
    // Start the tick simulation
    setInterval(() => this.simulateTick(), this.TICK_INTERVAL * 1000);
  }


  simulateTick() {
  this.tickCounter++; // Increment tick count
  console.log(`Tick ${this.tickCounter} - Velocity: ${this.currentVelocity}`);

  // Simplified acceleration calculation that more closely matches game physics
  const baseAcceleration = 9.24; // Initial base acceleration

  // Detect counter-strafe start
  if (this.pressedKeys['a'] && this.currentVelocity > 0) {
    if (this.startTick === null) {
      this.startTick = this.tickCounter; // Store tick when counter-strafe begins
    }
  }
  if (this.pressedKeys['d'] && this.currentVelocity < 0) {
    if (this.startTick === null) {
      this.startTick = this.tickCounter;
    }
  }

  // Acceleration calculation
  if (this.pressedKeys['a'] && this.pressedKeys['d']) {
    // Both keys pressed - decelerate
    if (this.currentVelocity > 0) {
      this.currentVelocity = Math.max(0, this.currentVelocity - baseAcceleration * 2);
    } else if (this.currentVelocity < 0) {
      this.currentVelocity = Math.min(0, this.currentVelocity + baseAcceleration * 2);
    }
  } else if (this.pressedKeys['a']) {
    // Accelerate left
    this.currentVelocity = Math.max(
      this.currentVelocity - baseAcceleration,
      -this.MAX_SPEED
    );
  } else if (this.pressedKeys['d']) {
    // Accelerate right
    this.currentVelocity = Math.min(
      this.currentVelocity + baseAcceleration,
      this.MAX_SPEED
    );
  } else {
    // Decelerate when no keys pressed
    if (this.currentVelocity > 0) {
      this.currentVelocity = Math.max(0, this.currentVelocity - baseAcceleration);
    } else if (this.currentVelocity < 0) {
      this.currentVelocity = Math.min(0, this.currentVelocity + baseAcceleration);
    }
  }

  // Log how many ticks it took to stop
  if (this.startTick !== null && Math.abs(this.currentVelocity) < 0.1) {
      const ticksToStop = this.tickCounter - this.startTick;
      console.log(`Counter-strafe complete! Took ${ticksToStop} ticks to reach 0 velocity.`);
      this.startTick = null; // Reset for next attempt
    }
  }

  @HostListener('document:mousedown', ['$event'])
  handleMouseClick(event: MouseEvent) {
    if (event.button === 0) { // left click
      // Check if we're slowed down enough to shoot accurately (threshold is ±73)
      if (-73 <= this.currentVelocity && this.currentVelocity <= 73) {
        this.success = `Hit! (Velocity: ${this.currentVelocity.toFixed(2)})`;
      } else {
        this.success = `Miss! (Velocity: ${this.currentVelocity.toFixed(2)})`;
      }
      console.log(`Shot fired at velocity ${this.currentVelocity}: ${this.success}`);
    }
  } 

  /**
   * Restarts the given animation class on the element. If the class is already present,
   * it removes it and forces a reflow before adding it back, ensuring the animation is restarted.
   */
  restartAnimation(element: Element, animationClass: string) {
    // Remove the class if it's already applied to restart the animation
    element.classList.remove('hit');
    element.classList.remove('miss');

    // Force a reflow (this resets the CSS animation)
    const htmlElement=element as HTMLElement;

    void htmlElement.offsetWidth;
    // Add the animation class
    element.classList.add(animationClass);

    // Add an event listener to remove the class when the animation finishes
    const onAnimationEnd = () => {
      element.classList.remove(animationClass);
      element.removeEventListener('animationend', onAnimationEnd);
    };
    element.addEventListener('animationend', onAnimationEnd);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    if (key === 'a' || key === 'd') {
      this.pressedKeys[key] = true;

      // Set initial velocity to 9.24 when starting to move
      if (Math.abs(this.currentVelocity) < 0.1) {
        this.currentVelocity = key === 'a' ? -9.24 : 9.24;
      }
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
