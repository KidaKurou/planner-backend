import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaService } from 'src/prisma.service';
import { YandexGPTModule } from 'src/yandexgpt/yandexgpt.module';

@Module({
  imports: [YandexGPTModule],
  controllers: [TaskController],
  providers: [TaskService, PrismaService],
  exports: [TaskService]
})
export class TaskModule { }
