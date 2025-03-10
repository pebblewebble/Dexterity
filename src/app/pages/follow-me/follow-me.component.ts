import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Point {
  x: number,
  y: number
}

@Component({
  selector: 'app-follow-me',
  imports: [CommonModule, FormsModule],
  templateUrl: './follow-me.component.html',
  styleUrl: './follow-me.component.css'
})
export class FollowMeComponent implements OnInit, OnDestroy {
  @ViewChild('svgContainer') svgContainer !: ElementRef;
  maxPoints: number = 5;
  viewportHeight: number = window.innerHeight * .7;
  viewportWidth: number = window.innerWidth * .7;
  line: any;
  lineWidth: number = 1;
  lineColor: String = "white";
  startAndEndPoints: Point[] = [];
  pointsArray = Array();
  score:number = 0;

  mousePosition: Point = { x: 0, y: 0 }
  isHoveringLine: boolean = false;
  hoverThreshold: number = 5;

  ngOnInit(): void {
    this.generateRandomLine();
  }

  ngOnDestroy(): void {

  }

  generateRandomLine() {
    this.startAndEndPoints = [];
    const pointCount = Math.floor(Math.random() * this.maxPoints + 2)
    //Claude's way
    // const points = Array(pointCount).fill().map(() => getRandomPoint());
    // My way
    this.pointsArray = Array()

    for (let i = 0; i < pointCount; i++) {
      this.pointsArray.push(this.generateRandomPoint());
    }

    this.startAndEndPoints.push(this.pointsArray[0])
    this.startAndEndPoints.push(this.pointsArray[this.pointsArray.length - 1])

    let pathData = `M ${this.pointsArray[0].x},${this.pointsArray[0].y}`;

    for (let i = 1; i < this.pointsArray.length; i++) {
      if (i < this.pointsArray.length - 1) {
        const prevPoint = this.pointsArray[i - 1];
        const currentPoint = this.pointsArray[i];
        const nextPoint = this.pointsArray[i + 1];

        // Calculate midpoints
        const mid1 = {
          x: (prevPoint.x + currentPoint.x) / 2,
          y: (prevPoint.y + currentPoint.y) / 2
        };

        const mid2 = {
          x: (currentPoint.x + nextPoint.x) / 2,
          y: (currentPoint.y + nextPoint.y) / 2
        };

        // Add some randomness to control points
        const control = {
          x: currentPoint.x + (Math.random() - 0.5) * 100,
          y: currentPoint.y + (Math.random() - 0.5) * 100
        };

        pathData += ` C ${mid1.x},${mid1.y} ${control.x},${control.y} ${mid2.x},${mid2.y}`;
      } else {
        // For the last point, just draw to it
        pathData += ` Q ${this.pointsArray[i - 1].x + 50},${this.pointsArray[i - 1].y + 50} ${this.pointsArray[i].x},${this.pointsArray[i].y}`;
      }
    }

    this.line = { path: pathData, color: this.lineColor, width: this.lineWidth }
  }

  generateRandomPoint(): Point {
    return {
      x: Math.random() * this.viewportWidth,
      y: Math.random() * this.viewportHeight
    }
  }

  distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const lineLength = Math.sqrt(
      Math.pow(lineEnd.x - lineStart.x, 2) +
      Math.pow(lineEnd.y - lineStart.y, 2)
    );

    if (lineLength === 0) return 0;

    // Calculate the projection of point onto the line
    const t = (
      (point.x - lineStart.x) * (lineEnd.x - lineStart.x) +
      (point.y - lineStart.y) * (lineEnd.y - lineStart.y)
    ) / (lineLength * lineLength);

    // If it is outside [0,1], the closest point is one of the endpoints
    if (t < 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) +
        Math.pow(point.y - lineStart.y, 2)
      );
    }
    if (t > 1) {
      return Math.sqrt(
        Math.pow(point.x - lineEnd.x, 2) +
        Math.pow(point.y - lineEnd.y, 2)
      );
    }

    // Calculate the closest point on the line
    const closestPoint = {
      x: lineStart.x + t * (lineEnd.x - lineStart.x),
      y: lineStart.y + t * (lineEnd.y - lineStart.y)
    };

    // Return the distance to the closest point
    return Math.sqrt(
      Math.pow(point.x - closestPoint.x, 2) +
      Math.pow(point.y - closestPoint.y, 2)
    );
  }

  distanceToCurve(point: Point, pathData: string): number {
    // We'll use a sampling approach to approximate distance to the curve
    const samplePoints = this.samplePointsAlongPath(pathData, 200); // 50 samples along the path

    // Find the minimum distance to any sample point
    let minDistance = Infinity;
    for (let i = 0; i < samplePoints.length - 1; i++) {
      const segmentStart = samplePoints[i];
      const segmentEnd = samplePoints[i + 1];

      // Use our existing line segment distance function
      const distance = this.distanceToLineSegment(point, segmentStart, segmentEnd);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  samplePointsAlongPath(pathData: string, numSamples: number): Point[] {
    // This is a simplified approach - we'll create a temporary SVG path element
    // and use getPointAtLength to sample points along the path
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathData);

    const pathLength = tempPath.getTotalLength();
    const samplePoints: Point[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const distance = (i / numSamples) * pathLength;
      const point = tempPath.getPointAtLength(distance);
      samplePoints.push({ x: point.x, y: point.y });
    }

    return samplePoints;
  }

  checkHoverLine() {
    if (!this.line || !this.line.path) return;

    const distance = this.distanceToCurve(this.mousePosition, this.line.path);

    // Update hover state based on distance threshold
    this.isHoveringLine = distance <= this.hoverThreshold;

    if (this.isHoveringLine) {
      console.log('Hovering over curved line!');
      // Add your hover effect or action here
    }
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.viewportHeight = window.innerHeight * .8;
    this.viewportWidth = window.innerWidth * .8;
    this.generateRandomLine();
  }
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Get the bounding rectangle of the SVG container
    const rect = this.svgContainer.nativeElement.getBoundingClientRect();

    // Calculate mouse position relative to the SVG
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Check if mouse is near the line
    this.checkHoverLine();
  }
}
