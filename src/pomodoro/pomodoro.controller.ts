import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { PomodoroService } from './pomodoro.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { PomodoroRoundDto, PomodoroSessionDto } from './pomodoro.dto';

@Controller('user/timer')
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) { }

  @Get('today')
  @Auth()
  async getTodaySession(@CurrentUser('id') userId: string) {
    return this.pomodoroService.getTodaySession(userId);
  }

  @Post()
  @Auth()
  async create(@CurrentUser('id') userId: string) {
    return this.pomodoroService.create(userId);
  }

  @Put('/round/:id')
  @Auth()
  @UsePipes(new ValidationPipe())
  async updateRound(@Param('id') id: string, @Body() dto: PomodoroRoundDto) {
    return this.pomodoroService.updateRound(id, dto);
  }

  @Put(':id')
  @Auth()
  @UsePipes(new ValidationPipe())
  async update(@Param('id') pomodoroId: string, @CurrentUser('id') userId: string, @Body() dto: PomodoroSessionDto) {
    return this.pomodoroService.update(pomodoroId, userId, dto);
  }

  @Delete(':id')
  @Auth()
  async deleteSession(@Param('id') pomodoroId: string, @CurrentUser('id') userId: string) {
    return this.pomodoroService.deleteSession(pomodoroId, userId);
  }
}
