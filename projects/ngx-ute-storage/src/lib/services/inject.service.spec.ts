import { TestBed } from '@angular/core/testing';

import { InjectService } from './inject.service';

describe('InjectService', () => {
  let service: InjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
