import { Body, Controller, Post } from '@nestjs/common';
import { FastHandsService } from './fast-hands.service';

@Controller('fast-hands')
export class FastHandsController {
  constructor(private readonly fastHandsService: FastHandsService) {

  }

  @Post('save-score')
  async saveScore(@Body() data:JSON){
    return await this.fastHandsService.saveScore(data);
  }
}
