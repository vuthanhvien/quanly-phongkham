import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
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
}
