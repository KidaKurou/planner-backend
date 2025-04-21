import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { Priority } from '@prisma/client';

export class BreakdownTaskDto {
    @IsNotEmpty()
    @IsString()
    taskId: string;
  
    @IsOptional()
    @IsEnum(Priority)
    priority?: Priority;
}