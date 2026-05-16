import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getLatest(serverId: string, userId: string) {
    await this.verifyOwnership(serverId, userId);

    return this.prisma.serverMetric.findFirst({
      where: { serverId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async getHistory(serverId: string, userId: string, from?: string, to?: string) {
    await this.verifyOwnership(serverId, userId);

    const where: any = { serverId };

    if (from) {
      where.recordedAt = { ...where.recordedAt, gte: new Date(from) };
    }
    if (to) {
      where.recordedAt = { ...where.recordedAt, lte: new Date(to) };
    }

    return this.prisma.serverMetric.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
      take: 500,
    });
  }

  private async verifyOwnership(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.userId !== userId) {
      throw new Error('Server not found or access denied');
    }
  }
}
