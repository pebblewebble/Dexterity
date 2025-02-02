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

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    
    // Update UI feedback for key press
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

