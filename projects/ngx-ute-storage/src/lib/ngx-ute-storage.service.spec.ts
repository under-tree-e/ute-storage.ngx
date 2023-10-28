import { TestBed } from '@angular/core/testing';

import { NgxUteStorageService } from './ngx-ute-storage.service';

describe('NgxUteStorageService', () => {
  let service: NgxUteStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxUteStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
