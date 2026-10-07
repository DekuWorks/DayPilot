import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AttachmentDto,
  BetaEnabledDto,
  CreateSuggestionDto,
  NotificationPrefsDto,
  RegisterDeviceDto,
  SuggestionMessageDto,
  UpdateStatusDto,
} from './dto/founder-hub.dto';
import { HubError } from './founder-hub.flow';
import { FounderHubService } from './founder-hub.service';

type Authed = { user: { id: string; role?: string } };

function run<T>(work: Promise<T>): Promise<T> {
  return work.catch((err: unknown) => {
    if (err instanceof HubError) {
      throw new HttpException(err.message, err.status);
    }
    throw err;
  });
}

@Controller('founder-hub')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FounderHubController {
  constructor(private readonly hub: FounderHubService) {}

  @Get()
  summary(@Req() req: Authed) {
    return run(this.hub.summary(req.user.id));
  }

  @Get('suggestions')
  listMine(@Req() req: Authed) {
    return run(this.hub.listMine(req.user.id));
  }

  @Post('suggestions')
  submit(@Req() req: Authed, @Body() dto: CreateSuggestionDto) {
    return run(this.hub.submit(req.user.id, { ...dto }));
  }

  @Get('suggestions/:id')
  readMine(@Req() req: Authed, @Param('id') id: string) {
    return run(this.hub.readMine(req.user.id, id));
  }

  @Post('suggestions/:id/messages')
  reply(
    @Req() req: Authed,
    @Param('id') id: string,
    @Body() dto: SuggestionMessageDto,
  ) {
    return run(this.hub.replyAsFounder(req.user.id, id, dto.body));
  }

  @Post('suggestions/:id/attachments')
  attach(
    @Req() req: Authed,
    @Param('id') id: string,
    @Body() dto: AttachmentDto,
  ) {
    return run(this.hub.addAttachment(req.user.id, id, dto));
  }

  @Get('attachments/:attachmentId')
  async attachment(
    @Req() req: Authed,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const file = await run(this.hub.readAttachment(req.user.id, attachmentId));
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    res.send(file.bytes);
  }

  @Get('notifications')
  notices(@Req() req: Authed) {
    return run(this.hub.listNotices(req.user.id));
  }

  @Post('notifications/:id/read')
  readNotice(@Req() req: Authed, @Param('id') id: string) {
    return run(this.hub.markNoticeRead(req.user.id, id));
  }

  @Get('notification-preferences')
  prefs(@Req() req: Authed) {
    return run(this.hub.getPrefs(req.user.id));
  }

  @Patch('notification-preferences')
  savePrefs(@Req() req: Authed, @Body() dto: NotificationPrefsDto) {
    return run(this.hub.savePrefs(req.user.id, dto));
  }

  @Post('devices')
  device(@Req() req: Authed, @Body() dto: RegisterDeviceDto) {
    return run(
      this.hub.registerDevice(
        req.user.id,
        dto.token,
        dto.platform,
        dto.provider ?? 'fcm',
      ),
    );
  }

  @Get('beta')
  beta(
    @Req() req: Authed,
    @Query('platform') platform?: string,
    @Query('appVersion') appVersion?: string,
  ) {
    return run(
      this.hub.betaFor(req.user.id, platform ?? 'web', appVersion ?? null),
    );
  }

  @Post('beta/:key/opt-out')
  optOut(@Req() req: Authed, @Param('key') key: string) {
    return run(this.hub.setOptOut(req.user.id, key, true));
  }

  @Delete('beta/:key/opt-out')
  optIn(@Req() req: Authed, @Param('key') key: string) {
    return run(this.hub.setOptOut(req.user.id, key, false));
  }

  @Get('inbox/alerts')
  @Roles('ADMIN')
  alerts(@Req() req: Authed) {
    return run(this.hub.alerts(req.user.id));
  }

  @Get('inbox')
  @Roles('ADMIN')
  inbox(
    @Req() req: Authed,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('unread') unread?: string,
  ) {
    return run(
      this.hub.listInbox(req.user.id, {
        category,
        status,
        q,
        unread: unread === '1' || unread === 'true',
      }),
    );
  }

  @Get('inbox/:id')
  @Roles('ADMIN')
  inboxOne(@Req() req: Authed, @Param('id') id: string) {
    return run(this.hub.readInbox(req.user.id, id));
  }

  @Post('inbox/:id/reply')
  @Roles('ADMIN')
  inboxReply(
    @Req() req: Authed,
    @Param('id') id: string,
    @Body() dto: SuggestionMessageDto,
  ) {
    return run(this.hub.adminReply(req.user.id, id, dto.body));
  }

  @Post('inbox/:id/notes')
  @Roles('ADMIN')
  inboxNote(
    @Req() req: Authed,
    @Param('id') id: string,
    @Body() dto: SuggestionMessageDto,
  ) {
    return run(this.hub.adminNote(req.user.id, id, dto.body));
  }

  @Patch('inbox/:id')
  @Roles('ADMIN')
  inboxStatus(
    @Req() req: Authed,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return run(this.hub.setStatus(req.user.id, id, dto.status));
  }

  @Post('inbox/:id/read')
  @Roles('ADMIN')
  markRead(@Req() req: Authed, @Param('id') id: string) {
    return run(this.hub.setInboxRead(req.user.id, id, true));
  }

  @Post('inbox/:id/unread')
  @Roles('ADMIN')
  markUnread(@Req() req: Authed, @Param('id') id: string) {
    return run(this.hub.setInboxRead(req.user.id, id, false));
  }

  @Get('admin/suggestions')
  @Roles('ADMIN')
  adminList(
    @Req() req: Authed,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('unread') unread?: string,
  ) {
    return run(
      this.hub.listInbox(req.user.id, {
        category,
        status,
        q,
        unread: unread === '1' || unread === 'true',
      }),
    );
  }

  @Get('admin/beta')
  @Roles('ADMIN')
  adminBeta(@Req() req: Authed) {
    return run(this.hub.listFeatureAdmin(req.user.id));
  }

  @Patch('admin/beta/:key')
  @Roles('ADMIN')
  adminBetaToggle(
    @Req() req: Authed,
    @Param('key') key: string,
    @Body() dto: BetaEnabledDto,
  ) {
    return run(this.hub.setFeatureEnabled(req.user.id, key, dto.enabled));
  }
}
