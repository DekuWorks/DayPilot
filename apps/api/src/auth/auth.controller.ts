import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FounderHubService } from '../founder-hub/founder-hub.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseExchangeDto } from './dto/supabase-exchange.dto';
import { MergeDuplicateDto } from './dto/merge-duplicate.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  readCookie,
  setAuthCookies,
} from './auth-cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly founderHub: FounderHubService,
  ) {}

  /** Hybrid mobile: Supabase Auth → Nest JWT (events/calendar use Nest API). */
  @Post('supabase-exchange')
  async supabaseExchange(
    @Body() dto: SupabaseExchangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pair = await this.authService.exchangeFromSupabaseAccessToken(
      dto.accessToken,
    );
    setAuthCookies(res, pair);
    return pair;
  }

  /**
   * Closed. A password row with no Supabase id could be created for any email,
   * then a later SSO login was attached to it. Web and Flutter sign up through
   * Supabase. Existing password logins still use POST /auth/login.
   */
  @Post('signup')
  signup() {
    throw new ForbiddenException(
      'Password signup is closed. Create the account from the DayPilot sign-up page.',
    );
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pair = await this.authService.login(dto);
    setAuthCookies(res, pair);
    return pair;
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      dto.refreshToken || readCookie(req.headers.cookie, REFRESH_COOKIE);
    if (!token) {
      throw new UnauthorizedException('Refresh token required');
    }
    const pair = await this.authService.refresh(token);
    setAuthCookies(res, pair);
    return pair;
  }

  @Post('logout')
  async logout(
    @Req() req: Request & { body?: { refreshToken?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      req.body?.refreshToken || readCookie(req.headers.cookie, REFRESH_COOKIE);
    await this.authService.logout(token ?? null);
    clearAuthCookies(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('merge-duplicate')
  async mergeDuplicate(
    @Req() req: { user: { id: string } },
    @Body() dto: MergeDuplicateDto,
  ) {
    return this.authService.mergeDuplicateFromDonorToken(
      req.user.id,
      dto.donorAccessToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: { user: { id: string } }) {
    const user = await this.authService.validateUserById(req.user.id);
    const founderHub = await this.founderHub.accountFlags(req.user.id);
    return { ...user, founderHub };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.authService.updateProfile(req.user.id, dto);
    const founderHub = await this.founderHub.accountFlags(req.user.id);
    return { ...user, founderHub };
  }

  /** App Store 5.1.1(v) — permanent account deletion (Nest + Supabase Auth). */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(
    @Req() req: { user: { id: string } },
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.deleteAccount(
      req.user.id,
      dto.confirm,
    );
    clearAuthCookies(res);
    return result;
  }
}
