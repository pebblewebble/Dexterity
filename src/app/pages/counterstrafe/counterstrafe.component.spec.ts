import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CounterstrafeComponent } from './counterstrafe.component';

describe('CounterstrafeComponent', () => {
  let component: CounterstrafeComponent;
  let fixture: ComponentFixture<CounterstrafeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterstrafeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CounterstrafeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
