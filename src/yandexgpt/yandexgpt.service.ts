import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class YandexGPTService {
  private readonly logger = new Logger(YandexGPTService.name);
  private readonly apiUrl = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  private readonly catalogId: string | undefined;
  private readonly iamToken: string | undefined;

  constructor(private configService: ConfigService) {
    this.catalogId = this.configService.get<string>('YANDEX_CLOUD_CATALOG_ID');
    this.iamToken = this.configService.get<string>('YANDEX_CLOUD_IAM_TOKEN');
    
    if (!this.catalogId || !this.iamToken) {
      this.logger.warn('YandexGPT credentials are not properly configured');
    }
  }

  async generateSubtasks(taskName: string): Promise<string[]> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          modelUri: `gpt://${this.catalogId}/yandexgpt`,
          completionOptions: {
            stream: false,
            temperature: 0.5,
            maxTokens: "1000",
            reasoningOptions: {
              mode: "ENABLED_HIDDEN"
            }
          },
          messages: [
            {
              role: "system",
              text: "Ты помощник, который разбивает задачи на логические подзадачи. " +
                "Предоставь 2-5 четких, конкретных подзадач для выполнения основной задачи. " +
                "Каждая подзадача должна начинаться с новой строки и быть краткой (до 100 символов). " +
                "Подзадачи должны охватывать все необходимые шаги для выполнения основной задачи. " +
                "Не включай в ответ нумерацию, пояснения или дополнительный текст."
            },
            {
              role: "user",
              text: `Разбей эту задачу на подзадачи: "${taskName}"`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.iamToken}`
          }
        }
      );

      if (response.data?.result?.alternatives?.[0]?.message?.text) {
        const subtasksText = response.data.result.alternatives[0].message.text;
        // Split by new line and filter out empty lines
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return subtasksText
          .split('\n')
          .map((task: string) => task.trim())
          .filter(task => task.length > 0);
      }
      
      this.logger.warn('Unexpected YandexGPT API response format', response.data);
      return [];
    } catch (error) {
      this.logger.error('Error generating subtasks with YandexGPT', error.response?.data || error.message);
      throw new Error('Failed to generate subtasks');
    }
  }
}