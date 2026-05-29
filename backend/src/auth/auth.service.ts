import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { BranchRoleAssignment, DynamicRoleDefinition, Staff, User, ViewSetting } from '../entities/entities';

const DEFAULT_ROLE_SCOPE = 'ALL';
const DEFAULT_RESOURCE_ACTIONS = ['view', 'create', 'update', 'delete', 'print'];

const RESOURCE_ACTIONS: Record<string, string[]> = {
  customers: [...DEFAULT_RESOURCE_ACTIONS, 'reveal-phone'],
  leads: [...DEFAULT_RESOURCE_ACTIONS, 'convert-to-customer'],
};

function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || DEFAULT_ROLE_SCOPE;
}

function buildRoleChain(role?: string, mainRole?: string) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === DEFAULT_ROLE_SCOPE) return [DEFAULT_ROLE_SCOPE];
  const normalizedMainRole = normalizeRole(mainRole);
  return Array.from(
    new Set([
      normalizedRole,
      ...(normalizedMainRole !== normalizedRole ? [normalizedMainRole] : []),
      DEFAULT_ROLE_SCOPE,
    ]),
  );
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchRoleAssignment) private readonly branchPermissions: Repository<BranchRoleAssignment>,
    @InjectRepository(DynamicRoleDefinition) private readonly dynamicRoles: Repository<DynamicRoleDefinition>,
    @InjectRepository(ViewSetting) private readonly viewSettings: Repository<ViewSetting>,
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
    const disabledModules = await this.resolveDisabledModules(activeRole, user.role);
    const actionPermissions = await this.resolveActionPermissions(activeRole, user.role);
    const profile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      activeRole,
      roleMain: user.role,
      branchId: user.branchId,
      staffId: staff?.id || user.staffId,
      disabledModules,
      actionPermissions,
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

  private async resolveActionPermissions(role?: string, mainRole?: string) {
    const roleChain = buildRoleChain(role, mainRole);
    const views = await this.viewSettings.find();
    const entityTypes = Array.from(new Set(views.map((view) => view.entityType).filter(Boolean)));

    return Object.fromEntries(
      entityTypes.map((entityType) => [entityType, this.resolveAllowedActionsForEntity(views, entityType, roleChain)]),
    );
  }

  private async resolveDisabledModules(role?: string, mainRole?: string) {
    const roleChain = buildRoleChain(role, mainRole);
    const views = await this.viewSettings.find();
    const entityTypes = Array.from(new Set(views.map((view) => view.entityType).filter(Boolean)));

    return entityTypes.filter((entityType) => {
      const entityViews = views.filter((view) => view.entityType === entityType);
      for (const inheritedRole of roleChain) {
        const inheritedViews = entityViews.filter((view) => normalizeRole(view.role) === inheritedRole);
        const moduleEnabled = inheritedViews
          .map((view) => view.config?.moduleEnabled)
          .find((value) => typeof value === 'boolean');

        if (typeof moduleEnabled === 'boolean') return !moduleEnabled;
        if (inheritedViews.length > 0) return false;
      }

      return false;
    });
  }

  private resolveAllowedActionsForEntity(views: ViewSetting[], entityType: string, roleChain: string[]) {
    const entityViews = views.filter((view) => view.entityType === entityType);
    for (const inheritedRole of roleChain) {
      const inheritedViews = entityViews.filter((view) => normalizeRole(view.role) === inheritedRole);
      const actions = inheritedViews
        .map((view) => view.config?.allowedActions)
        .find((value) => Array.isArray(value));

      if (Array.isArray(actions)) {
        return actions.map(String);
      }
    }

    return RESOURCE_ACTIONS[entityType] || DEFAULT_RESOURCE_ACTIONS;
  }
}
