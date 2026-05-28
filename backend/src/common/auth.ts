import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  branchId?: string;
  staffId?: string;
  branchPermissions?: Array<{
    branchId: string;
    roleName: string;
    permissions: string[];
  }>;
}
