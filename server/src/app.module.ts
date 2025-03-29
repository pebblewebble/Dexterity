import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FastHandsModule } from './fast-hands/fast-hands.module';

@Module({
  imports: [FastHandsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
