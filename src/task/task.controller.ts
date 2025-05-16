import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { TaskService } from './task.service';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { TaskDto } from './dto/task.dto';

@Controller('user/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @Auth()
  async getAll(@CurrentUser('id') userId: string) {
    return this.taskService.getAll(userId);
  }

  @Post()
  @Auth()
  @UsePipes(new ValidationPipe())
  async create(@CurrentUser('id') userId: string, @Body() dto: TaskDto) {
    return this.taskService.create(userId, dto);
  }

  @Put(':id')
  @Auth()
  @UsePipes(new ValidationPipe())
  async update(@Param('id') taskId: string, @CurrentUser('id') userId: string, @Body() dto: TaskDto) {
    return this.taskService.update(taskId, userId, dto);
  }

  @Delete(':id')
  @Auth()
  async delete(@Param('id') taskId: string) {
    return this.taskService.delete(taskId);
  }

  @Post(':id/breakdown')
  @Auth()
  async breakdownTask(@Param('id') taskId: string, @CurrentUser('id') userId: string) {
    return this.taskService.BreakdownTask(taskId, userId);
  }
}
