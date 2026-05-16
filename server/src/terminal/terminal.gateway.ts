import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TerminalService } from './terminal.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/socket.io',
})
export class TerminalGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TerminalGateway.name);

  constructor(
    private terminalService: TerminalService,
    private jwtService: JwtService,
  ) {}

  private getUserId(client: Socket): string | null {
    const raw = client.handshake.headers.cookie;
    if (!raw) return null;
    const match = raw.match(/jwt=([^;]+)/);
    if (!match) return null;
    try {
      const payload = this.jwtService.verify(match[1]);
      return payload.sub;
    } catch {
      return null;
    }
  }

  @SubscribeMessage('terminal:connect')
  async handleConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serverId: string; cols?: number; rows?: number },
  ) {
    const userId = this.getUserId(client);
    if (!userId) {
      client.emit('terminal:error', '未登录，请先登录');
      return;
    }

    try {
      const { sessionId, stream } = await this.terminalService.connect(
        data.serverId,
        userId,
        data.cols || 80,
        data.rows || 24,
      );

      client.data.sessionId = sessionId;

      stream.on('data', (buf: Buffer) => {
        client.emit('terminal:output', buf.toString('utf-8'));
      });

      stream.on('close', () => {
        client.emit('terminal:close');
        this.terminalService.disconnect(sessionId);
      });

      stream.on('error', (err: Error) => {
        client.emit('terminal:error', err.message);
      });

      client.emit('terminal:connected');
    } catch (err: any) {
      client.emit('terminal:error', err.message);
    }
  }

  @SubscribeMessage('terminal:input')
  handleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string,
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return;

    const session = this.terminalService.getSession(sessionId);
    if (session) {
      session.stream.write(data);
    }
  }

  @SubscribeMessage('terminal:resize')
  handleResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cols: number; rows: number },
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) return;

    const session = this.terminalService.getSession(sessionId);
    if (session) {
      session.stream.setWindow(data.rows, data.cols, 0, 0);
    }
  }

  handleDisconnect(client: Socket) {
    const sessionId = client.data.sessionId;
    if (sessionId) {
      this.terminalService.disconnect(sessionId);
    }
  }
}
