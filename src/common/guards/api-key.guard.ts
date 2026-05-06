import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Simple API-key guard.
 * Clients must send `x-api-key: <value>` matching the API_KEY env variable.
 * Defaults to `dev-api-key` when the env variable is not set.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validKey = process.env.API_KEY ?? 'dev-api-key';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-api-key'];

    if (!key || key !== this.validKey) {
      throw new UnauthorizedException('Invalid or missing x-api-key header');
    }

    return true;
  }
}
