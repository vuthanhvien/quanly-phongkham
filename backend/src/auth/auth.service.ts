import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email, isActive: true } });
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const profile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
    };
    return {
      accessToken: this.jwtService.sign(profile),
      user: profile,
    };
  }
}

