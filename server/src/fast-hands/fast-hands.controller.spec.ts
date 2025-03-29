import { Test, TestingModule } from '@nestjs/testing';
import { FastHandsController } from './fast-hands.controller';

describe('FastHandsController', () => {
  let controller: FastHandsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FastHandsController],
    }).compile();

    controller = module.get<FastHandsController>(FastHandsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
