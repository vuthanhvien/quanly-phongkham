import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/auth';
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
    if (!user?.tenantId || user.tenantId !== this.tenantContext.require().id) {
      throw new ForbiddenException('Token không thuộc domain hiện tại');
    }
    return true;
  }
}
