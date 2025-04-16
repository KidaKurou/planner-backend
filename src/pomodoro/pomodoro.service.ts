import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PomodoroRoundDto, PomodoroSessionDto } from './pomodoro.dto';

@Injectable()
export class PomodoroService {
    constructor(private prisma: PrismaService) { }

    async getTodaySession(userId: string) {
        const today = new Date().toISOString().split('T')[0];

        const session = await this.prisma.pomodoroSession.findFirst({
            where: {
                createdAt: {
                    gte: new Date(today)
                },
                userId
            },
            include: {
                pomodoroRounds: {
                    orderBy: { id: 'asc' }
                }
            }
        });
        return session;
    }

    async create(userId: string) {
        const todaySession = await this.getTodaySession(userId);

        if (todaySession) return todaySession;

        // TODO: Вынести логику или IntervalsCount, BreakInterval, WorkInterval в PomodoroSettings
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                intervalsCount: true
            }
        });

        if (!user) throw new NotFoundException('User not found');

        const { intervalsCount } = user as { intervalsCount: number };

        return this.prisma.pomodoroSession.create({
            data: {
                pomodoroRounds: {
                    createMany: {
                        data: Array.from({ length: intervalsCount }, () => ({
                            totalSeconds: 0
                        }))
                    }
                },
                user: {
                    connect: { id: userId }
                }
            },
            include: {
                pomodoroRounds: {
                    orderBy: { id: 'asc' }
                }
            }
        })
    }

    async update(pomodoroId: string, userId: string, dto: Partial<PomodoroSessionDto>) {
        return this.prisma.pomodoroSession.update({
            where: {
                userId,
                id: pomodoroId
            },
            data: dto
        });
    }

    async updateRound(roundId: string, dto: Partial<PomodoroRoundDto>) {
        return this.prisma.pomodoroRound.update({
            where: {
                id: roundId
            },
            data: dto
        });
    }

    async deleteSession(sessionId: string, userId: string) {
        return this.prisma.pomodoroSession.delete({
            where: {
                userId,
                id: sessionId
            }
        });
    }
}
