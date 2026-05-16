import { Injectable, Logger, NotFoundException, ForbiddenException, StreamableFile } from '@nestjs/common';
import { Client, SFTPWrapper } from 'ssh2';
import { PrismaService } from '../prisma/prisma.service';
import { ServerService } from '../server/server.service';

export interface FileEntry {
  name: string;
  type: 'file' | 'dir' | 'link';
  size: number;
  permissions: string;
  mtime: number;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private prisma: PrismaService,
    private serverService: ServerService,
  ) {}

  private async getSftpClient(serverId: string, userId: string): Promise<{ sftp: SFTPWrapper; client: Client }> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.userId !== userId) {
      throw new ForbiddenException('服务器不存在或无权访问');
    }

    const client = new Client();
    const config: any = {
      host: server.host,
      port: server.port,
      username: server.sshUsername,
      readyTimeout: 10000,
    };

    if (server.authType === 'password' && server.sshPassword) {
      config.password = this.serverService.getDecryptedPassword(server);
    } else if (server.authType === 'key' && server.sshKey) {
      config.privateKey = this.serverService.getDecryptedKey(server);
    }

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) {
            client.end();
            reject(err);
          } else {
            resolve({ sftp, client });
          }
        });
      });
      client.on('error', reject);
      client.connect(config);
    });
  }

  async listFiles(serverId: string, userId: string, path: string): Promise<FileEntry[]> {
    const { sftp, client } = await this.getSftpClient(serverId, userId);

    return new Promise((resolve, reject) => {
      sftp.readdir(path || '/', (err, list) => {
        client.end();
        if (err) return reject(err);

        const entries: FileEntry[] = list
          .filter((f) => f.filename !== '.' && f.filename !== '..')
          .map((f) => ({
            name: f.filename,
            type: f.longname.startsWith('d') ? 'dir' : f.longname.startsWith('l') ? 'link' : 'file',
            size: f.attrs.size || 0,
            permissions: f.longname.substring(0, 10),
            mtime: f.attrs.mtime || 0,
          }));

        resolve(entries);
      });
    });
  }

  async readFile(serverId: string, userId: string, path: string): Promise<string> {
    const { sftp, client } = await this.getSftpClient(serverId, userId);

    return new Promise((resolve, reject) => {
      sftp.readFile(path, { encoding: 'utf8' }, (err, data) => {
        client.end();
        if (err) return reject(err);
        resolve(data as unknown as string);
      });
    });
  }

  async writeFile(serverId: string, userId: string, path: string, content: string): Promise<void> {
    const { sftp, client } = await this.getSftpClient(serverId, userId);

    return new Promise((resolve, reject) => {
      sftp.writeFile(path, content, { encoding: 'utf8' }, (err) => {
        client.end();
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async deleteFile(serverId: string, userId: string, path: string): Promise<void> {
    const { sftp, client } = await this.getSftpClient(serverId, userId);

    return new Promise((resolve, reject) => {
      sftp.stat(path, (err, stats) => {
        if (err) { client.end(); return reject(err); }

        if (stats.isDirectory()) {
          sftp.rmdir(path, (err2) => {
            client.end();
            if (err2) return reject(err2);
            resolve();
          });
        } else {
          sftp.unlink(path, (err2) => {
            client.end();
            if (err2) return reject(err2);
            resolve();
          });
        }
      });
    });
  }

  async createDirectory(serverId: string, userId: string, path: string): Promise<void> {
    const { sftp, client } = await this.getSftpClient(serverId, userId);

    return new Promise((resolve, reject) => {
      sftp.mkdir(path, (err) => {
        client.end();
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async renameFile(serverId: string, userId: string, oldPath: string, newPath: string): Promise<void> {
    const { sftp, client } = await this.getSftpClient(serverId, userId);

    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err) => {
        client.end();
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
