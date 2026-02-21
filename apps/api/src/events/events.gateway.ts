import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const USER_ROOM_PREFIX = 'user:';

@WebSocketGateway({
  cors: { origin: true },
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

  async handleConnection(client: {
    handshake: any;
    id: string;
    join: (room: string) => void;
    disconnect: () => void;
  }) {
    const token =
      client.handshake?.auth?.token ??
      client.handshake?.query?.token ??
      client.handshake?.headers?.authorization?.replace?.('Bearer ', '');
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret:
          this.config.get<string>('JWT_SECRET') || 'change-me-in-production',
      });
      if (payload.type !== 'access' || !payload.sub) {
        client.disconnect();
        return;
      }
      const userId = payload.sub as string;
      (client as any).userId = userId;
      client.join(USER_ROOM_PREFIX + userId);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: any) {
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
}
