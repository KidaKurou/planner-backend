/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import { AuthDto } from 'src/auth/dto/auth.dto';
import { PrismaService } from 'src/prisma.service';
import { UserDto } from './dto/user.dto';
import { startOfDay, subDays } from 'date-fns';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
  ) { }

  async getByID(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id
      },
      include: {
        tasks: true
      }
    })
  }

  async getByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email
      }
    }).catch(() => null);
  }

  async getAll() {
    return this.prisma.user.findMany();
  }

  async getProfile(id: string) {
    const { ...profile } = await this.getByID(id);

    // User Statistics
    const totalTasks = profile?.tasks.length ? profile.tasks.length : 0;
    const completedTasks = await this.prisma.task.count({
      where: {
        userId: id,
        isCompleted: true
      }
    }); // TODO: As best practice make another service for tasks (PROD)
    // const completedTasks = profile.tasks.filter(task => task.completed).length;

    const todayStart = startOfDay(new Date());
    const weekStart = startOfDay(subDays(new Date(), 7));

    const todayTasks = await this.prisma.task.count({
      where: {
        userId: id,
        createdAt: {
          gte: todayStart.toISOString()
        }
      }
    });

    const weekTasks = await this.prisma.task.count({
      where: {
        userId: id,
        createdAt: {
          gte: weekStart.toISOString()
        }
      }
    });

    
    const { password, ...rest } = profile;

    return {
      user: rest,
      statistics: [
        { label: 'Total', value: totalTasks },
        { label: 'Completed', value: completedTasks },
        { label: 'Today', value: todayTasks },
        { label: 'Week', value: weekTasks },
      ]
    }
  }

  async create(dto: AuthDto) {
    const user: any = {
      email: dto.email,
      name: '',
      password: await hash(dto.password)
    }

    return this.prisma.user.create({
      data: user,
    });
  }

  async update(id: string, dto: UserDto) {
    let data = dto;

    if (dto.password) {
      data = { ...dto, password: await hash(dto.password) };
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data,
      select: {
        name: true,
        email: true
      }
    });
  }
}
