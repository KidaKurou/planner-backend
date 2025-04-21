import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { TaskModule } from 'src/task/task.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TaskModule
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
