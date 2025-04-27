import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FastHandsMpComponent } from './fast-hands-mp.component';

describe('FastHandsMpComponent', () => {
  let component: FastHandsMpComponent;
  let fixture: ComponentFixture<FastHandsMpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FastHandsMpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FastHandsMpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
