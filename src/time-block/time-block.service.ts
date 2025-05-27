import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { TimeBlockDto } from './dto/time-block.dto'

@Injectable()
export class TimeBlockService {
	constructor(private prisma: PrismaService) {}

	async getAll(userId: string) {
		return this.prisma.timeBlock.findMany({
			where: {
				userId
			},
			orderBy: {
				order: 'asc'
			},
			include: {
				task: true
			}
		})
	}

	async create(userId: string, dto: TimeBlockDto) {
		const { taskId, ...restDto } = dto
		return this.prisma.timeBlock.create({
			data: {
				...restDto,
				user: {
					connect: {
						id: userId
					}
				},
				// Связываем с задачей, если указан taskId
				...(taskId && {
					task: {
						connect: {
							id: taskId
						}
					}
				})
			},
			include: {
				task: true
			}
		})
	}

	async update(id: string, userId: string, dto: Partial<TimeBlockDto>) {
		return this.prisma.timeBlock.update({
			where: {
				userId,
				id
			},
			data: { ...dto },
			include: {
				task: true
			}
		})
	}

	async delete(id: string, userId: string) {
		return this.prisma.timeBlock.delete({
			where: {
				userId,
				id
			}
		})
	}

	async updateOrder(ids: string[]) {
		return this.prisma.$transaction(
			ids.map((id, order) =>
				this.prisma.timeBlock.update({
					where: { id },
					data: { order }
				})
			)
		)
	}
}
