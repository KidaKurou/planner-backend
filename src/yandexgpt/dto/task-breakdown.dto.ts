import { IsString, IsNotEmpty } from 'class-validator';

export class TaskBreakdownDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}