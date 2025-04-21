/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TaskService } from 'src/task/task.service';
import { TaskDto } from 'src/task/dto/task.dto';
import { Priority } from '@prisma/client';
import { lastValueFrom } from 'rxjs';
import { YandexGptMessage, YandexGptResponse } from './interfaces/yandex-gpt.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly modelUri: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly taskService: TaskService
  ) {
    this.apiUrl = this.configService.get<string>('YANDEX_GPT_API_URL') || '';
    this.apiKey = this.configService.get<string>('YANDEX_GPT_API_KEY') || '';
    this.modelUri = this.configService.get<string>('YANDEX_GPT_MODEL_URI') || '';

    if (!this.apiUrl || !this.apiKey || !this.modelUri) {
      this.logger.error('Missing configuration for Yandex GPT API');
    }
  }

  /**
   * Breaks down a task into subtasks using YandexGPT
   * @param userId User ID
   * @param taskName Task name to break down
   * @param originalPriority Original task priority (will be inherited by subtasks)
   * @returns Array of created subtasks
   */
  async breakdownTask(userId: string, taskName: string, originalPriority?: Priority): Promise<TaskDto[]> {
    try {
      if (!taskName || taskName.trim() === '') {
        throw new BadRequestException('Task name cannot be empty');
      }

      const subtaskNames = await this.generateSubtasks(taskName);
      
      if (!subtaskNames || subtaskNames.length === 0) {
        throw new BadRequestException('Failed to generate subtasks');
      }

      // Create all subtasks for the user
      const createdTasks = [];
      for (const subtaskName of subtaskNames) {
        const taskDto: TaskDto = {
          name: subtaskName,
          priority: originalPriority || Priority.medium,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        };

        const createdTask = await this.taskService.create(userId, taskDto);
        if (createdTask) createdTasks.push(createdTask);
      }

      return createdTasks;
    } catch (error) {
      this.logger.error(`Error breaking down task: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to break down task: ${error.message}`);
    }
  }

  /**
   * Calls YandexGPT API to generate subtasks
   * @param taskName Main task name
   * @returns Array of subtask names
   */
  private async generateSubtasks(taskName: string): Promise<string[]> {
    try {
      const prompt = this.createPrompt(taskName);
      
      const response = await lastValueFrom(
        this.httpService.post<YandexGptResponse>(
          this.apiUrl,
          {
            modelUri: this.modelUri,
            completionOptions: {
              stream: false,
              temperature: 0.6,
              maxTokens: 2000,
            },
            messages: prompt,
          },
          {
            headers: {
              'Authorization': `Api-Key ${this.apiKey}`,
              'Content-Type': 'application/json',
              'x-folder-id': this.configService.get<string>('YANDEX_FOLDER_ID'),
            },
          },
        ),
      );

      return this.parseSubtasksFromResponse(response.data);
    } catch (error) {
      this.logger.error(`YandexGPT API error: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate subtasks from AI service');
    }
  }

  /**
   * Creates a prompt for YandexGPT
   * @param taskName Task name
   * @returns Array of messages for YandexGPT
   */
  private createPrompt(taskName: string): YandexGptMessage[] {
    return [
      {
        role: 'system',
        text: 'You are a professional task manager assistant. Your job is to break down a main task into 3-7 specific, actionable subtasks. Each subtask should be clear and start with an action verb. Format your response as a JSON array of strings with ONLY the subtasks. Do not include any explanations, just return the JSON array.'
      },
      {
        role: 'user',
        text: `Break down this task into subtasks: "${taskName}"`
      }
    ];
  }

  /**
   * Parses subtasks from YandexGPT response
   * @param response YandexGPT response
   * @returns Array of subtask names
   */
  private parseSubtasksFromResponse(response: YandexGptResponse): string[] {
    try {
      const assistantMessage = response.result.alternatives[0].message;
      if (!assistantMessage || !assistantMessage.text) {
        throw new Error('Invalid response from YandexGPT');
      }

      // Try to parse the JSON response
      let subtasks: string[];
      try {
        // The response might include a JSON array or might be a string with explanations
        // First try to find and parse a JSON array
        const jsonMatch = assistantMessage.text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          subtasks = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, try to extract lines that could be tasks
          subtasks = assistantMessage.text
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.replace(/^[-*\d.)\s]+/, '').trim())
            .filter(line => line.length > 0);
        }
      } catch (e) {
        // If parsing failed, extract potential tasks by line breaks
        subtasks = assistantMessage.text
          .split('\n')
          .filter(line => line.trim() !== '' && !line.includes(':'))
          .map(line => line.replace(/^[-*\d.)\s]+/, '').trim());
      }

      if (!subtasks || subtasks.length === 0) {
        throw new Error('Failed to parse subtasks from response');
      }

      return subtasks;
    } catch (error) {
      this.logger.error(`Error parsing subtasks: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to parse AI response');
    }
  }

  
}
