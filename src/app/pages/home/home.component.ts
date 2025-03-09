import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  // Two images for the two halves of the wheel
  leftImage = 'cs2.jpeg';
  rightImage = 'shrek.jpg';

  // We'll keep two "sections":
  //   currentSection = 0 → wheelRotation = 0   (show right half as "active")
  //   currentSection = 1 → wheelRotation = 180 (show left half as "active")
  wheelRotation = 0;
  currentSection = 0; // Start with 0 or 1 as you prefer

  // Variables to track dragging
  private isDragging = false;
  private dragStartY = 0;

  ngOnInit(): void {}

  // Start dragging
  startDrag(event: MouseEvent | TouchEvent): void {
    this.isDragging = true;
    this.dragStartY = this.getClientPoint(event).y;
  }

  // Optional real-time feedback in onDrag (omitted here)
  onDrag(event: MouseEvent | TouchEvent): void {}

  // Stop dragging: determine if user swiped up/down
  stopDrag(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const dragEndY = this.getClientPoint(event).y;
    const deltaY = dragEndY - this.dragStartY;
    const threshold = 50; // pixels needed to count as a swipe

    if (deltaY < -threshold) {
      // Swiped up: move to next "section"
      this.currentSection = (this.currentSection + 1) % 2;
    } else if (deltaY > threshold) {
      // Swiped down: move to previous "section"
      this.currentSection = (this.currentSection - 1 + 2) % 2;
    }

    // Snap the wheel to either 0° or 180° depending on the currentSection
    this.wheelRotation = (this.currentSection === 1) ? 180 : 0;
  }

  // Helper to extract (x, y) from mouse or touch events
  private getClientPoint(event: MouseEvent | TouchEvent): { x: number, y: number } {
    if (event instanceof TouchEvent) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else {
      return {
        x: event.clientX,
        y: event.clientY
      };
    }
  }
}
