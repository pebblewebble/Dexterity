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
  private keyPressTimestamps: { [key: string]: number } = {};
  private timingWindow: number = 200; // 200 ms timing window

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const currentTime = Date.now();
    console.log(currentTime);
    // Only process 'a' and 'd' keys
    if (key !== 'a' && key !== 'd') return;

    // Check if the opposite key was pressed recently
    const oppositeKey = key === 'a' ? 'd' : 'a';
    const lastOppositeKeyTime = this.keyPressTimestamps[oppositeKey] || 0;

    if (lastOppositeKeyTime > 0) {
      // Check if the opposite key was pressed within the timing window
      if (currentTime - lastOppositeKeyTime <= this.timingWindow) {
        this.success = 'Success'; // Successful counter-strafe
      } else {
        this.success = 'Fail'; // Too late
      }

      // Reset the timestamps after detection
      this.keyPressTimestamps = {};
    } else {
      // Store the current key's timestamp
      this.keyPressTimestamps[key] = currentTime;
    }
  }
} 

