import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServerDto, UpdateServerDto } from './server.dto';
import * as crypto from 'crypto';
import * as net from 'net';

@Injectable()
export class ServerService {
  private readonly logger = new Logger(ServerService.name);

  constructor(private prisma: PrismaService) {}

  private encrypt(text: string): string {
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'changeme1234567890changeme12', 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key.slice(0, 32), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'changeme1234567890changeme12', 'utf8');
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async findAll(userId: string) {
    return this.prisma.server.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        sshUsername: true,
        authType: true,
        status: true,
        lastCheckedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateServerDto) {
    const data: any = {
      name: dto.name,
      host: dto.host,
      port: dto.port || 22,
      sshUsername: dto.sshUsername,
      authType: dto.authType,
      userId,
    };

    if (dto.sshPassword) {
      data.sshPassword = this.encrypt(dto.sshPassword);
    }
    if (dto.sshKey) {
      data.sshKey = this.encrypt(dto.sshKey);
    }

    return this.prisma.server.create({ data });
  }

  async update(userId: string, id: string, dto: UpdateServerDto) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.userId !== userId) throw new ForbiddenException('Access denied');

    const data: any = { ...dto };
    if (dto.sshPassword) {
      data.sshPassword = this.encrypt(dto.sshPassword);
    }
    if (dto.sshKey) {
      data.sshKey = this.encrypt(dto.sshKey);
    }

    return this.prisma.server.update({ where: { id }, data });
  }

  async delete(userId: string, id: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.server.delete({ where: { id } });
    return { message: 'Server deleted' };
  }

  async checkHealth(userId: string, id: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.userId !== userId) throw new ForbiddenException('Access denied');

    const status = await this.testConnection(server.host, server.port);

    await this.prisma.server.update({
      where: { id },
      data: { status, lastCheckedAt: new Date() },
    });

    return { status };
  }

  async testConnection(host: string, port: number): Promise<string> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        resolve('offline');
      }, 5000);

      socket.connect(port, host, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve('online');
      });

      socket.on('error', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve('offline');
      });
    });
  }

  getDecryptedPassword(server: any): string | null {
    if (server.sshPassword) {
      return this.decrypt(server.sshPassword);
    }
    return null;
  }

  getDecryptedKey(server: any): string | null {
    if (server.sshKey) {
      return this.decrypt(server.sshKey);
    }
    return null;
  }
}
