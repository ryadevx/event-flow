import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authorization.substring(7);

    try {
      request.user = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(token, {
        algorithms: ['HS256'],
      });

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
