import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchRoleAssignment, DynamicRoleDefinition, Staff, User, ViewSetting } from '../entities/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Staff, BranchRoleAssignment, DynamicRoleDefinition, ViewSetting]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-only-secret',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
