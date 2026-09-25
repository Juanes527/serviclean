import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

const extraerDeCookie = (peticion: Request): string | null => {
  return peticion?.cookies?.serviclean_token ?? null;
};

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extraerDeCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; correo: string; rol: string }) {
    return { id: payload.sub, correo: payload.correo, rol: payload.rol };
  }
}
