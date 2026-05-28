import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import { BranchPermission, Staff, User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(BranchPermission) private readonly branchPermissions: Repository<BranchPermission>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email, isActive: true } });
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const staff = user.staffId ? await this.staff.findOne({ where: { id: user.staffId } }) : await this.staff.findOne({ where: { userId: user.id } });
    const branchPermissions = staff
      ? await this.branchPermissions.find({ where: { staffId: staff.id, isActive: true } })
      : [];
    const profile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      staffId: staff?.id || user.staffId,
      branchPermissions: branchPermissions.map((item) => ({
        branchId: item.branchId,
        roleName: item.roleName,
        permissions: item.permissions,
      })),
    };
    return {
      accessToken: this.jwtService.sign(profile),
      user: profile,
    };
  }
}
