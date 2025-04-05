import { Module } from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FastHandsModule } from './fast-hands/fast-hands.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    FastHandsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
