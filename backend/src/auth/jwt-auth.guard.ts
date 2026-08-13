import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PLATFORM_ROUTE_KEY, IS_PUBLIC_KEY } from '../common/auth';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const allowed = await super.canActivate(context);
    if (!allowed) return false;
    const user = context.switchToHttp().getRequest().user;
    const isPlatformRoute = this.reflector.getAllAndOverride<boolean>(IS_PLATFORM_ROUTE_KEY, [context.getHandler(), context.getClass()]);
    if (user?.kind === 'platform') {
      if (!isPlatformRoute) throw new ForbiddenException('Tài khoản Super Admin không có quyền truy cập dữ liệu tenant');
      return true;
    }
    if (isPlatformRoute) throw new ForbiddenException('Yêu cầu tài khoản Super Admin');
    if (!user?.tenantId || user.tenantId !== this.tenantContext.require().id) {
      throw new ForbiddenException('Token không thuộc domain hiện tại');
    }
    return true;
  }
}
