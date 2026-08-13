import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const IS_PLATFORM_ROUTE_KEY = 'isPlatformRoute';
export const PlatformOnly = () => SetMetadata(IS_PLATFORM_ROUTE_KEY, true);

export interface AuthUser {
  kind?: 'tenant' | 'platform';
  tenantId?: string;
  id: string;
  email: string;
  username?: string;
  fullName: string;
  role: string;
  activeRole?: string;
  roleMain?: string;
  branchId?: string;
  staffId?: string;
  disabledModules?: string[];
  actionPermissions?: Record<string, string[]>;
  screenPermissions?: string[];
  branchPermissions?: Array<{
    branchId: string;
    roleName?: string;
    roleNames?: string[];
    roleKeys?: string[];
  }>;
}
