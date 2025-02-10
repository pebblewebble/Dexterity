import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OsuStreamComponent } from './osu-stream.component';

describe('OsuStreamComponent', () => {
  let component: OsuStreamComponent;
  let fixture: ComponentFixture<OsuStreamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsuStreamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OsuStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
