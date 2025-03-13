import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FastHandsComponent } from './fast-hands.component';

describe('FastHandsComponent', () => {
  let component: FastHandsComponent;
  let fixture: ComponentFixture<FastHandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FastHandsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FastHandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
