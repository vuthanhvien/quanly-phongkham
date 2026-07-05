import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthUser {
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
  branchPermissions?: Array<{
    branchId: string;
    roleName?: string;
    roleNames?: string[];
    roleKeys?: string[];
  }>;
}
