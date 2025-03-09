import { Component } from '@angular/core';

@Component({
  selector: 'app-follow-me',
  imports: [],
  templateUrl: './follow-me.component.html',
  styleUrl: './follow-me.component.css'
})
export class FollowMeComponent {
  private maxPoints:Number = 10;

  generateRandomLine(){
    const pointCount = Math.floor(Math.random()*this.maxPoints)
  }
}
