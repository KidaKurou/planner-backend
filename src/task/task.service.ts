import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TaskDto } from './dto/task.dto'
import { YandexGPTService } from 'src/yandexgpt/yandexgpt.service'
import { Priority } from '@prisma/client'

@Injectable()
export class TaskService {
	constructor(
		private prisma: PrismaService,
		private yandexgptService: YandexGPTService
	) {}

	async getById(taskId: string, userId: string) {
		const task = await this.prisma.task.findFirst({
			where: {
				id: taskId,
				userId
			},
			include: {
				subtasks: true,
				parentTask: true,
				timeBlocks: true
			}
		})

		if (!task) return null

		return task
	}

	async getAll(userId: string) {
		return this.prisma.task.findMany({
			where: {
				userId
			},
			include: {
				subtasks: {
					include: {
						subtasks: true // Для вложенных подзадач
					}
				},
				timeBlocks: true
			}
		})
	}

	async create(userId: string, dto: TaskDto) {
		// Remove parentTaskId from dto to avoid conflict with relation
		const { parentTaskId, ...restDto } = dto
		return this.prisma.task.create({
			data: {
				...restDto,
				user: {
					connect: {
						id: userId
					}
				},
				// Если указан parentTaskId, связываем с родительской задачей
				...(parentTaskId && {
					parentTask: {
						connect: {
							id: parentTaskId
						}
					}
				})
			},
			include: {
				subtasks: true,
				parentTask: true
			}
		})
	}

	async update(taskId: string, userId: string, dto: Partial<TaskDto>) {
		return this.prisma.task.update({
			where: {
				userId,
				id: taskId
			},
			data: { ...dto },
			include: {
				subtasks: true,
				parentTask: true
			}
		})
	}

	async delete(taskId: string) {
		return this.prisma.task.delete({
			where: {
				id: taskId
			}
		})
	}
	async breakdownTask(taskId: string, userId: string) {
		// 1. Find the task
		const task = await this.getById(taskId, userId)

		if (!task) {
			throw new NotFoundException(`Task with ID ${taskId} not found`)
		}

		// 2. Generate subtasks using YandexGPT
		const subtasksWithPriorities = await this.yandexgptService.generateSubtasks(
			task.name
		)

		if (subtasksWithPriorities.length === 0) {
			return { originalTask: task, subtasks: [] }
		}

		// 3. Create subtasks in the database
		const createdSubtasks = await this.prisma.$transaction(async tx => {
			const subtasks: Awaited<ReturnType<typeof tx.task.create>>[] = []

			for (const subtask of subtasksWithPriorities) {
				const created = await tx.task.create({
					data: {
						name: subtask.name,
						priority: subtask.priority.toLowerCase() as Priority,
						userId: task.userId,
						createdAt: task.createdAt,
						isCompleted: false,
						parentTaskId: taskId,
						category: task.category,
						tags: [...(task.tags || []), 'ai-generated']
					},
					include: {
						parentTask: true
					}
				})
				subtasks.push(created)
			}

			return subtasks
		})

		return {
			originalTask: task,
			subtasks: createdSubtasks
		}
	}

	async getByCategory(userId: string, category: string) {
		return this.prisma.task.findMany({
			where: {
				userId,
				category
			},
			include: {
				subtasks: true,
				timeBlocks: true
			}
		})
	}

	async getUserCategories(userId: string) {
		const tasks = await this.prisma.task.findMany({
			where: {
				userId,
				category: {
					not: null
				}
			},
			select: {
				category: true
			},
			distinct: ['category']
		})

		return tasks.map(t => t.category).filter(Boolean)
	}
}
