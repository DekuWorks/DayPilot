import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
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
  constructor(private readonly authService: AuthService) {}

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

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pair = await this.authService.signup(dto);
    setAuthCookies(res, pair);
    return pair;
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
    return this.authService.validateUserById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, dto);
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
