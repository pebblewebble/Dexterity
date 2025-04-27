import { Test, TestingModule } from '@nestjs/testing';
import { FastHandsMpService } from './fast-hands-mp.service';

describe('FastHandsMpService', () => {
  let service: FastHandsMpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FastHandsMpService],
    }).compile();

    service = module.get<FastHandsMpService>(FastHandsMpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
