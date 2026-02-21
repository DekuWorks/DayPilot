import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import type { UserRole } from '../generated/prisma';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });
    await this.prisma.subscription.create({
      data: { userId: user.id },
    });
    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl ?? null,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.audit.log({
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
    });
    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl,
    );
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken, {
      ignoreExpiration: false,
    });
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const hash = this.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash: hash },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expired');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl,
    );
  }

  async logout(refreshToken: string | null) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.decode(refreshToken);
      if (payload?.type === 'refresh' && payload.sub) {
        const hash = this.hashRefreshToken(refreshToken);
        await this.prisma.refreshToken.deleteMany({
          where: { userId: payload.sub, tokenHash: hash },
        });
      }
    } catch {
      // ignore
    }
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    avatarUrl?: string | null,
  ) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, type: 'access' },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min in seconds
      user: {
        id: userId,
        email,
        role,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
      },
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async updateProfile(userId: string, dto: { avatarUrl?: string | null }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.avatarUrl !== undefined && {
          avatarUrl: dto.avatarUrl || null,
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });
    return updated;
  }
}
