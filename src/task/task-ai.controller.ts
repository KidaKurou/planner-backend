import { Body, Controller, Post, Param, UsePipes, ValidationPipe, NotFoundException } from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { AiService } from 'src/ai/ai.service';
import { TaskService } from './task.service';
import { BreakdownTaskDto } from 'src/ai/dto/breakdown-task.dto';

@Controller('user/tasks/ai')
export class TaskAiController {
  constructor(
    private readonly taskService: TaskService,
    private readonly aiService: AiService,
  ) {}

  @Post('breakdown/:taskId')
  @Auth()
  @UsePipes(new ValidationPipe())
  async breakdownTask(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BreakdownTaskDto
  ) {
    // Get the original task
    const task = await this.taskService.getById(taskId, userId);
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Use AI to break down the task into subtasks
    const subtasks = await this.aiService.breakdownTask(
      userId,
      task.name,
      dto.priority // || task.priority
    );

    return {
      message: 'Task has been broken down successfully',
      originalTask: task,
      subtasks
    };
  }
}