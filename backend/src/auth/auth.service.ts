import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { BranchRoleAssignment, DynamicRoleDefinition, Staff, User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchRoleAssignment) private readonly branchPermissions: Repository<BranchRoleAssignment>,
    @InjectRepository(DynamicRoleDefinition) private readonly dynamicRoles: Repository<DynamicRoleDefinition>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email, isActive: true } });
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const staff = user.staffId ? await this.staff.findOne({ where: { id: user.staffId } }) : await this.staff.findOne({ where: { userId: user.id } });
    const branchPermissions = await this.branchPermissions.find({ where: { userId: user.id, isActive: true } });
    const assignedRoleKeys = Array.from(new Set(branchPermissions.flatMap((item) => item.roleKeys || []).filter(Boolean)));
    const roleDefinitions = assignedRoleKeys.length
      ? await this.dynamicRoles.find({ where: { key: In(assignedRoleKeys), isActive: true } })
      : [];
    const roleMap = new Map(roleDefinitions.map((role) => [role.key, role]));
    const activeRole =
      branchPermissions.find((item) => item.branchId === user.branchId)?.roleKeys?.[0] ||
      branchPermissions[0]?.roleKeys?.[0] ||
      user.role;
    const profile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      activeRole,
      roleMain: user.role,
      branchId: user.branchId,
      staffId: staff?.id || user.staffId,
      branchPermissions: branchPermissions.map((item) => ({
        branchId: item.branchId,
        roleName: item.roleName,
        roleNames: (item.roleKeys || []).map((key) => roleMap.get(key)?.name || key),
        roleKeys: item.roleKeys || [],
      })),
    };
    return {
      accessToken: this.jwtService.sign(profile),
      user: profile,
    };
  }
}
