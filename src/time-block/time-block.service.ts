import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TimeBlockDto } from './dto/time-block.dto';

@Injectable()
export class TimeBlockService {
    constructor(private prisma: PrismaService) { }

    async getAll(userId: string) {
        return this.prisma.timeBlock.findMany({
            where: {
                userId
            },
            orderBy: {
                order: 'asc'
            }
        });
    }

    async create(userId: string, dto: TimeBlockDto) {
        return this.prisma.timeBlock.create({
            data: {
                ...dto,
                user: {
                    connect: {
                        id: userId
                    }
                }
            }
        });
    }

    async update(id: string, userId: string, dto: Partial<TimeBlockDto>) {
        return this.prisma.timeBlock.update({
            where: {
                userId,
                id
            },
            data: { ...dto }
        });
    }

    async delete(id: string, userId: string) {
        return this.prisma.timeBlock.delete({
            where: {
                userId,
                id
            }
        });
    }

    async updateOrder(ids: string[]) {
        return this.prisma.$transaction(
            ids.map((id, order) => this.prisma.timeBlock.update({
                where: { id },
                data: { order }
            }))
        )
    }
}
