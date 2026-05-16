import { Injectable, Logger } from '@nestjs/common';
import { Client, ClientChannel } from 'ssh2';
import { PrismaService } from '../prisma/prisma.service';
import { ServerService } from '../server/server.service';

interface SSHSession {
  client: Client;
  stream: ClientChannel;
}

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private sessions = new Map<string, SSHSession>();

  constructor(
    private prisma: PrismaService,
    private serverService: ServerService,
  ) {}

  async connect(
    serverId: string,
    userId: string,
    cols: number,
    rows: number,
  ): Promise<{ sessionId: string; stream: ClientChannel }> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.userId !== userId) {
      throw new Error('服务器不存在或无权访问');
    }

    const sessionId = `${userId}:${serverId}`;

    if (this.sessions.has(sessionId)) {
      this.disconnect(sessionId);
    }

    const client = new Client();

    const connectConfig: any = {
      host: server.host,
      port: server.port,
      username: server.sshUsername,
      readyTimeout: 10000,
    };

    if (server.authType === 'password' && server.sshPassword) {
      connectConfig.password = this.serverService.getDecryptedPassword(server);
    } else if (server.authType === 'key' && server.sshKey) {
      connectConfig.privateKey = this.serverService.getDecryptedKey(server);
    }

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        client.shell(
          { term: 'xterm-256color', cols, rows },
          (err, stream) => {
            if (err) {
              reject(err);
              return;
            }

            this.sessions.set(sessionId, { client, stream });
            this.logger.log(`SSH session established: ${sessionId}`);
            resolve({ sessionId, stream });
          },
        );
      });

      client.on('error', (err) => {
        this.logger.error(`SSH 连接错误: ${err.message}`);
        reject(err);
      });

      client.connect(connectConfig);
    });
  }

  disconnect(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.stream.end();
      } catch {}
      try {
        session.client.end();
      } catch {}
      this.sessions.delete(sessionId);
      this.logger.log(`SSH session closed: ${sessionId}`);
    }
  }

  disconnectAll() {
    for (const [id] of this.sessions) {
      this.disconnect(id);
    }
  }

  getSession(sessionId: string): SSHSession | undefined {
    return this.sessions.get(sessionId);
  }
}
