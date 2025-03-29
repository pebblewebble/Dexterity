import { Test, TestingModule } from '@nestjs/testing';
import { FastHandsService } from './fast-hands.service';

describe('FastHandsService', () => {
  let service: FastHandsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FastHandsService],
    }).compile();

    service = module.get<FastHandsService>(FastHandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
