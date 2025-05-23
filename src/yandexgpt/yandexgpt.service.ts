/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
	Injectable,
	Logger,
	ServiceUnavailableException,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

export interface SubtaskWithPriority {
	name: string
	priority: 'low' | 'medium' | 'high'
}

@Injectable()
export class YandexGPTService {
	private readonly logger = new Logger(YandexGPTService.name)
	private readonly apiUrl =
		'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'
	private readonly catalogId: string | undefined
	private readonly iamToken: string | undefined
	private client: AxiosInstance

	constructor(private configService: ConfigService) {
		this.catalogId = this.configService.get<string>('YANDEX_CLOUD_CATALOG_ID')
		this.iamToken = this.configService.get<string>('YANDEX_CLOUD_IAM_TOKEN')

		if (!this.catalogId || !this.iamToken) {
			this.logger.warn('YandexGPT credentials are not properly configured')
		}

		this.client = axios.create({
			baseURL: this.apiUrl,
			timeout: 15_000,
			headers: {
				'Content-Type': 'application/json',
				...(this.iamToken ? { Authorization: `Bearer ${this.iamToken}` } : {})
			}
		})
	}
	async generateSubtasks(taskName: string): Promise<string[]> {
		if (!this.catalogId || !this.iamToken) {
			this.logger.error(
				'Cannot generate subtasks: YandexGPT credentials not configured'
			)
			throw new ServiceUnavailableException('YandexGPT configuration missing')
		}

		if (!taskName || taskName.trim().length === 0) {
			this.logger.warn('Empty task name provided to generateSubtasks')
			return []
		}

		try {
			const response = await this.client.post('', {
				modelUri: `gpt://${this.catalogId}/yandexgpt`,
				completionOptions: {
					stream: false,
					temperature: 0.5,
					maxTokens: 1000,
					reasoningOptions: {
						mode: 'ENABLED_HIDDEN'
					}
				},
				messages: [
					{
						role: 'system',
						text:
							'Ты помощник, который разбивает задачи на логические подзадачи с приоритетами. ' +
							'Предоставь 2-5 четких, конкретных подзадач для выполнения основной задачи. ' +
							'Каждая подзадача должна быть в формате: "НАЗВАНИЕ_ПОДЗАДАЧИ | ПРИОРИТЕТ" ' +
							'где ПРИОРИТЕТ может быть: high, medium, или low. ' +
							'Определи приоритет на основе важности и срочности подзадачи для выполнения основной задачи. ' +
							'Каждая подзадача должна начинаться с новой строки и быть краткой (до 100 символов). ' +
							'Не включай в ответ нумерацию или дополнительный текст. ' +
							'Пример формата: "Изучить требования | high"'
					},
					{
						role: 'user',
						text: `Разбей эту задачу на подзадачи с приоритетами: ${taskName}`
					}
				]
			})

			if (response.data?.result?.alternatives?.[0]?.message?.text) {
				const subtasksText = response.data.result.alternatives[0].message.text

				// Split by new line and parse each line for name and priority
				const subtasks = subtasksText
					.split('\n')
					.map(line => line.replace(/^[-•\d.\s]+/, '').trim())
					.filter(line => line.length > 0)
					.map(line => {
						// Try to parse format: "Task name | priority"
						const parts = line.split('|').map(part => part.trim())

						if (parts.length >= 2) {
							const name = parts[0]
							const priorityText = parts[1].toLowerCase()

							// Map priority text to valid enum values
							let priority: 'low' | 'medium' | 'high' = 'medium' // default
							if (
								priorityText.includes('high') ||
								priorityText.includes('важн') ||
								priorityText.includes('критич')
							) {
								priority = 'high'
							} else if (
								priorityText.includes('low') ||
								priorityText.includes('низк') ||
								priorityText.includes('мало')
							) {
								priority = 'low'
							}

							return { name, priority }
						} else {
							// Fallback: if no priority specified, assign medium priority
							return { name: line, priority: 'medium' as const }
						}
					})
					.filter(subtask => subtask.name.length > 0)

				// Remove duplicates based on task name
				const uniqueSubtasks: string[] = Array.from(
					new Map(subtasks.map(subtask => [subtask.name, subtask])).values()
				) as string[]

				return uniqueSubtasks
			}

			this.logger.warn(
				'Unexpected YandexGPT API response format',
				response.data
			)
			return []
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response) {
					// The request was made and the server responded with a status code
					// that falls out of the range of 2xx
					this.logger.error(
						`YandexGPT API error: ${error.response.status}`,
						error.response.data
					)

					if (error.response.status === 401 || error.response.status === 403) {
						throw new UnauthorizedException(
							'Authentication failed with YandexGPT API. Check your IAM token.'
						)
					}
				} else if (error.request) {
					// The request was made but no response was received
					this.logger.error(
						'No response received from YandexGPT API',
						error.request
					)
					throw new ServiceUnavailableException('YandexGPT service unavailable')
				} else {
					// Something happened in setting up the request
					this.logger.error(
						'Error setting up YandexGPT API request',
						error.message
					)
				}
			} else {
				// Handle non-Axios errors
				this.logger.error('Unexpected error when calling YandexGPT', error)
			}

			throw new ServiceUnavailableException('Failed to generate subtasks')
		}
	}
}
