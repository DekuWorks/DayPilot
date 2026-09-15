import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { resolveJwtSecret } from '../common/jwt-secret';
import { AuthService } from './auth.service';
import { ACCESS_COOKIE, readCookie } from './auth-cookies';

export type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  type?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => readCookie(req?.headers?.cookie, ACCESS_COOKIE),
      ]),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access' || !payload.sub) {
      throw new UnauthorizedException();
    }
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
