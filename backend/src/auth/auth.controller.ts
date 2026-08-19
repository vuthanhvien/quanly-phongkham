import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Public, AuthUser } from '../common/auth';
import { AuthService } from './auth.service';

class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  password: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(128, { message: 'Mật khẩu mới không được vượt quá 128 ký tự' })
  newPassword: string;
}

class ChangePinDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã PIN phải gồm đúng 6 chữ số' })
  pin: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload.identifier || payload.email || '', payload.password);
  }

  @Get('me')
  me(@Request() request: { user: AuthUser }) {
    return { data: request.user };
  }

  @Post('change-password')
  changePassword(@Request() request: { user: AuthUser }, @Body() payload: ChangePasswordDto) {
    return this.authService.changePassword(request.user.id, payload.currentPassword, payload.newPassword);
  }

  @Post('change-pin')
  changePin(@Request() request: { user: AuthUser }, @Body() payload: ChangePinDto) {
    return this.authService.changePin(request.user.id, payload.currentPassword, payload.pin);
  }
}
