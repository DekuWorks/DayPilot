import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { socketCorsOrigin } from '../common/cors-origin';
import { resolveJwtSecret } from '../common/jwt-secret';

const USER_ROOM_PREFIX = 'user:';

type HandshakeAuth = { token?: string };
type HandshakeQuery = { token?: string | string[] };

@WebSocketGateway({
  cors: {
    origin: socketCorsOrigin(),
    credentials: true,
  },
  path: '/ws',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const auth = client.handshake?.auth as HandshakeAuth | undefined;
    const query = client.handshake?.query as HandshakeQuery | undefined;
    const queryToken = query?.token;
    const headerAuth = client.handshake?.headers?.authorization;
    const token =
      auth?.token ??
      (Array.isArray(queryToken) ? queryToken[0] : queryToken) ??
      (typeof headerAuth === 'string'
        ? headerAuth.replace(/^Bearer\s+/i, '')
        : undefined);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify<{
        type?: string;
        sub?: string;
      }>(token, {
        secret: resolveJwtSecret(this.config.get<string>('JWT_SECRET')),
      });
      if (payload.type !== 'access' || !payload.sub) {
        client.disconnect();
        return;
      }
      const userId = payload.sub;
      const data = client.data as { userId?: string };
      data.userId = userId;
      void client.join(USER_ROOM_PREFIX + userId);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {
    // optional: cleanup
  }

  @OnEvent('event.created')
  handleEventCreated(payload: { userId: string; event: object }) {
    this.server
      .to(USER_ROOM_PREFIX + payload.userId)
      .emit('event:created', payload.event);
  }

  @OnEvent('event.updated')
  handleEventUpdated(payload: { userId: string; event: object }) {
    this.server
      .to(USER_ROOM_PREFIX + payload.userId)
      .emit('event:updated', payload.event);
  }

  @OnEvent('event.deleted')
  handleEventDeleted(payload: { userId: string; eventId: string }) {
    this.server
      .to(USER_ROOM_PREFIX + payload.userId)
      .emit('event:deleted', { id: payload.eventId });
  }

  @OnEvent('calendar.synced')
  handleCalendarSynced(payload: { userId: string }) {
    this.server
      .to(USER_ROOM_PREFIX + payload.userId)
      .emit('calendar:synced', {});
  }
}
