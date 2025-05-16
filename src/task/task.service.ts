import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TaskDto } from './dto/task.dto';
import { YandexGPTService } from 'src/yandexgpt/yandexgpt.service';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private yandexgptService: YandexGPTService
  ) { }

  async getById(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) return null;

    return task;
  }

  async getAll(userId: string) {
    return this.prisma.task.findMany({ where: { userId } });
  }

  async create(userId: string, dto: TaskDto) {
    return this.prisma.task.create({
      data: {
        ...dto,
        user: {
          connect: {
            id: userId
          }
        }
      }
    });
  }

  async update(taskId: string, userId: string, dto: Partial<TaskDto>) {
    return this.prisma.task.update({
      where: {
        userId,
        id: taskId
      },
      data: { ...dto }
    });
  }

  async delete(taskId: string) {
    return this.prisma.task.delete({
      where: {
        id: taskId
      }
    });
  }

  async BreakdownTask(taskId: string, userId: string) {
    // 1. Find the task
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // 2. Generate subtasks using YandexGPT
    const subtaskNames = await this.yandexgptService.generateSubtasks(task.name);
    
    // 3. Create subtasks in the database
    const subtaskPromises = subtaskNames.map(subtaskName => 
      this.create(userId, {
        name: subtaskName
      })
    );

    // 4. Wait for all subtasks to be created
    const createdSubtasks = await Promise.all(subtaskPromises);
    
    return {
      originalTask: task,
      subtasks: createdSubtasks
    };
  }
}
