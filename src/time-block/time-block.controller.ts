import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { TimeBlockService } from './time-block.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import { TimeBlockDto } from './dto/time-block.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('user/time-blocks')
export class TimeBlockController {
  constructor(private readonly timeBlockService: TimeBlockService) { }

  @Get()
  @Auth()
  async getAll(@CurrentUser('id') userId: string) {
    return this.timeBlockService.getAll(userId);
  }

  @Post()
  @Auth()
  @UsePipes(new ValidationPipe())
  async create(@CurrentUser('id') userId: string, @Body() dto: TimeBlockDto) {
    return this.timeBlockService.create(userId, dto);
  }

  @Put('update-order')
  @Auth()
  @UsePipes(new ValidationPipe())
  async updateOrder(@Body() dto: UpdateOrderDto) {
    return this.timeBlockService.updateOrder(dto.ids);
  }

  @Put(':id')
  @Auth()
  @UsePipes(new ValidationPipe())
  async update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: Partial<TimeBlockDto>) {
    return this.timeBlockService.update(id, userId, dto);
  }

  @Delete(':id')
  @Auth()
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.timeBlockService.delete(id, userId);
  }
}
