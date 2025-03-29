import { Module } from '@nestjs/common';
import { FastHandsController } from './fast-hands.controller';
import { FastHandsService } from './fast-hands.service';

@Module({
  controllers: [FastHandsController],
  providers: [FastHandsService]
})
export class FastHandsModule {}
