import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { CalendarConnectionsService } from './calendar-connections.service';
import { ConnectAppleDto } from './dto/connect-apple.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CalendarProvider } from '../generated/prisma';

@Controller('calendar-connections')
export class CalendarConnectionsController {
  constructor(
    private readonly calendarConnections: CalendarConnectionsService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: { user: { id: string } }) {
    return this.calendarConnections.list(req.user.id);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: express.Response,
  ) {
    const frontend =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    if (!code || !state) {
      res.redirect(`${frontend}/sync?error=missing_params`);
      return;
    }
    try {
      const { redirectUrl } = await this.calendarConnections.handleCallback(
        'google',
        code,
        state,
      );
      res.redirect(redirectUrl);
    } catch {
      res.redirect(`${frontend}/sync?error=google_callback`);
    }
  }

  @Get('outlook/callback')
  async outlookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: express.Response,
  ) {
    const frontend =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    if (!code || !state) {
      res.redirect(`${frontend}/sync?error=missing_params`);
      return;
    }
    try {
      const { redirectUrl } = await this.calendarConnections.handleCallback(
        'outlook',
        code,
        state,
      );
      res.redirect(redirectUrl);
    } catch {
      res.redirect(`${frontend}/sync?error=outlook_callback`);
    }
  }

  /** iCloud CalDAV — Apple ID + app-specific password (not Sign in with Apple). */
  @UseGuards(JwtAuthGuard)
  @Post('apple/connect')
  async connectApple(
    @Req() req: { user: { id: string } },
    @Body() dto: ConnectAppleDto,
  ) {
    return this.calendarConnections.connectAppleCalDav(
      req.user.id,
      dto.appleId,
      dto.appSpecificPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':provider/connect')
  async connect(
    @Req() req: { user: { id: string } },
    @Param('provider') provider: string,
  ) {
    const p = provider.toLowerCase() as CalendarProvider;
    if (p !== 'google' && p !== 'outlook' && p !== 'apple') {
      return { redirectUrl: null, error: 'Unknown provider' };
    }
    return this.calendarConnections.getConnectUrl(req.user.id, p);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async disconnect(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.calendarConnections.disconnect(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/sync')
  async sync(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.calendarConnections.syncConnectionById(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/validate')
  async validate(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.calendarConnections.validateConnection(req.user.id, id);
  }
}
