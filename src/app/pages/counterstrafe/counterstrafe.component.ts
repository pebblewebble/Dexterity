import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-counterstrafe',
  standalone: true,
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
    //I have no idea how to get it exactly like CS2's movement, when I slow down different clips
    //it's different deceleration speed idk man, huge skill issue
    this.tickCounter++; // Increment tick count
    console.log(`Tick ${this.tickCounter} - Velocity: ${this.currentVelocity}`);

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

    // Base acceleration value
    const baseAcceleration = 9.24;

    // Calculate appropriate deceleration for counter-strafing based on CS2 physics
    // These values attempt to match the observed deceleration pattern
    let deceleration = 0;

    // Counterstrafe calculation (pressing opposite direction)
    if ((this.pressedKeys['a'] && this.currentVelocity > 0) ||
      (this.pressedKeys['d'] && this.currentVelocity < 0)) {

      // Progressive deceleration rates based on velocity ranges
      const absVelocity = Math.abs(this.currentVelocity);

      if (absVelocity > 190) {
        // At top speed: 215 -> 192 (about 23 units)
        deceleration = 23;
      } else if (absVelocity > 170) {
        // From 192 -> 172 (about 20 units)
        deceleration = 20;
      } else if (absVelocity > 135) {
        // From 172 -> 137 (about 35 units)
        deceleration = 35;
      } else if (absVelocity > 80) {
        // From 137 -> 85 (about 52 units)
        deceleration = 52;
      } else if (absVelocity > 55) {
        // From 85 -> 57 (about 28 units)
        deceleration = 28;
      } else if (absVelocity > 15) {
        // From 57 -> 18 (about 39 units)
        deceleration = 39;
      } else {
        // Final deceleration to 0
        deceleration = absVelocity + 9;
      }
    }
    // Both keys pressed - strong deceleration but not as extreme
    else if (this.pressedKeys['a'] && this.pressedKeys['d']) {
      const absVelocity = Math.abs(this.currentVelocity);
      deceleration = Math.min(absVelocity, 25);
    }
    // Single direction acceleration
    else if (this.pressedKeys['a']) {
      // Accelerate left
      this.currentVelocity = Math.max(
        this.currentVelocity - baseAcceleration,
        -this.MAX_SPEED
      );
    }
    else if (this.pressedKeys['d']) {
      // Accelerate right
      this.currentVelocity = Math.min(
        this.currentVelocity + baseAcceleration,
        this.MAX_SPEED
      );
    }
    // No keys - normal friction deceleration (should be gentler)
    else if (Math.abs(this.currentVelocity) > 0) {
      deceleration = baseAcceleration;
    }

    // Apply deceleration
    if (deceleration > 0) {
      if (this.currentVelocity > 0) {
        this.currentVelocity = Math.max(0, this.currentVelocity - deceleration);
      } else if (this.currentVelocity < 0) {
        this.currentVelocity = Math.min(0, this.currentVelocity + deceleration);
      }
    }

    // Add minimum acceleration in the opposite direction after coming to a stop
    if (Math.abs(this.currentVelocity) < 0.1) {
      if (this.pressedKeys['a'] && !this.pressedKeys['d']) {
        this.currentVelocity = -baseAcceleration;
      } else if (this.pressedKeys['d'] && !this.pressedKeys['a']) {
        this.currentVelocity = baseAcceleration;
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
    const htmlElement = element as HTMLElement;

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
