import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from 'ssh2';
import { PrismaService } from '../prisma/prisma.service';
import { ServerService } from '../server/server.service';

@Injectable()
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);

  constructor(
    private prisma: PrismaService,
    private serverService: ServerService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async collectAllMetrics() {
    const servers = await this.prisma.server.findMany();

    for (const server of servers) {
      try {
        await this.collectServerMetrics(server);
      } catch (err: any) {
        this.logger.warn(`Failed to collect metrics for ${server.name}: ${err.message}`);
      }
    }
  }

  private async collectServerMetrics(server: any) {
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

    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        client.end();
        this.updateServerStatus(server.id, 'offline');
        resolve();
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timer);
        this.updateServerStatus(server.id, 'online');

        const commands = [
          "top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4}'",
          "free -b | grep Mem | awk '{print $3,$2}'",
          "df -B1 / | tail -1 | awk '{print $3,$2}'",
          "cat /proc/loadavg | awk '{print $1}'",
          "cat /proc/uptime | awk '{print $1}'",
        ];

        this.getNetworkUsage(client).then((netData) => {
          this.executeCommands(client, commands).then((results) => {
            client.end();

            const [memUsed, memTotal] = results[1] ? results[1].split(' ') : [null, null];

            this.prisma.serverMetric
              .create({
                data: {
                  serverId: server.id,
                  cpuUsage: results[0] ? parseFloat(results[0]) : null,
                  memUsage: memUsed ? parseFloat(memUsed) / (1024 * 1024) : null,
                  memTotal: memTotal ? parseFloat(memTotal) / (1024 * 1024) : null,
                  diskUsage: results[2] ? parseFloat(results[2]) : null,
                  diskTotal: results[2] ? parseFloat(results[2]) : null,
                  loadAvg: results[3] ? parseFloat(results[3]) : null,
                  uptime: results[4] ? parseInt(results[4]) : null,
                  netRx: netData?.rx ?? null,
                  netTx: netData?.tx ?? null,
                },
              })
              .catch((e) => this.logger.error(`Metrics save error: ${e.message}`));

            resolve();
          });
        });
      });

      client.on('error', () => {
        clearTimeout(timer);
        this.updateServerStatus(server.id, 'offline');
        resolve();
      });

      client.connect(config);
    });
  }

  private executeCommands(client: Client, commands: string[]): Promise<string[]> {
    return Promise.all(
      commands.map(
        (cmd) =>
          new Promise<string>((resolve) => {
            client.exec(cmd, (err, stream) => {
              if (err) { resolve(''); return; }
              let output = '';
              stream
                .on('data', (data: Buffer) => { output += data.toString(); })
                .on('close', () => resolve(output.trim()));
            });
          }),
      ),
    );
  }

  private getNetworkUsage(client: Client): Promise<{ rx: number; tx: number } | null> {
    return new Promise((resolve) => {
      let sample1: { rx: number; tx: number } | null = null;

      const readProcNetDev = (): Promise<{ rx: number; tx: number }> => {
        return new Promise((res) => {
          client.exec("cat /proc/net/dev | grep -E 'eth|ens|enp' | head -1", (err, stream) => {
            if (err) { res({ rx: 0, tx: 0 }); return; }
            let output = '';
            stream.on('data', (d: Buffer) => { output += d.toString(); });
            stream.on('close', () => {
              const parts = output.trim().split(/\s+/);
              if (parts.length >= 10) {
                res({ rx: parseInt(parts[1]) || 0, tx: parseInt(parts[9]) || 0 });
              } else {
                res({ rx: 0, tx: 0 });
              }
            });
          });
        });
      };

      readProcNetDev().then((first) => {
        sample1 = first;
        setTimeout(() => {
          readProcNetDev().then((second) => {
            if (sample1) {
              resolve({
                rx: second.rx - sample1.rx,
                tx: second.tx - sample1.tx,
              });
            } else {
              resolve(null);
            }
          });
        }, 1000);
      });
    });
  }

  private async updateServerStatus(serverId: string, status: string) {
    await this.prisma.server
      .update({
        where: { id: serverId },
        data: { status, lastCheckedAt: new Date() },
      })
      .catch(() => {});
  }
}
