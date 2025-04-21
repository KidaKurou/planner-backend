import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { PrismaService } from 'src/prisma.service';
import { AiModule } from 'src/ai/ai.module';
import { TaskAiController } from './task-ai.controller';

@Module({
  imports: [AiModule],
  controllers: [TaskController, TaskAiController],
  providers: [TaskService, PrismaService],
  exports: [TaskService]
})
export class TaskModule { }
