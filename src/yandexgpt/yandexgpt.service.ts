import {
	Injectable,
	Logger,
	ServiceUnavailableException,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

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
							'Ты помощник, который разбивает задачи на логические подзадачи. ' +
							'Предоставь 2-5 четких, конкретных подзадач для выполнения основной задачи. ' +
							'Каждая подзадача должна начинаться с новой строки и быть краткой (до 100 символов). ' +
							'Подзадачи должны охватывать все необходимые шаги для выполнения основной задачи. ' +
							'Не включай в ответ нумерацию, пояснения или дополнительный текст.'
					},
					{
						role: 'user',
						text: `Разбей эту задачу на подзадачи: ${taskName}`
					}
				]
			})

			if (response.data?.result?.alternatives?.[0]?.message?.text) {
				const subtasksText = response.data.result.alternatives[0].message.text
				// Split by new line and filter out empty lines
				return Array.from(
					new Set(
						subtasksText
							.split('\n')
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return
							.map(t => t.replace(/^[-•\d.\s]+/, '').trim())
							.filter(t => t.length > 0)
					)
				)
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
