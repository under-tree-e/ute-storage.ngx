import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxUteStorageComponent } from './ngx-ute-storage.component';

describe('NgxUteStorageComponent', () => {
  let component: NgxUteStorageComponent;
  let fixture: ComponentFixture<NgxUteStorageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NgxUteStorageComponent]
    });
    fixture = TestBed.createComponent(NgxUteStorageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
