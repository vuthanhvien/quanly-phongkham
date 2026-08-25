import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/auth';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CustomerAuthUser } from './customer-auth';

@Injectable()
export class CustomerJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Thiếu token xác thực');

    let payload: CustomerAuthUser;
    try {
      payload = this.jwtService.verify<CustomerAuthUser>(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.kind !== 'customer' || payload.tenantId !== this.tenantContext.require().id) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    request.customer = payload;
    return true;
  }
}
