import { Module } from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FastHandsModule } from './fast-hands/fast-hands.module';
import { GameService } from './fast-hands-mp/fast-hands-mp.service';
import { GameGateWay } from './fast-hands-mp/fast-hands-gateway';

@Module({
  imports: [
    ConfigModule.forRoot(),
    FastHandsModule
  ],
  controllers: [AppController],
  providers: [AppService, GameService, GameGateWay],
})
export class AppModule {}
