import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { Public } from '../common/auth';
import { CustomerAuthService } from './customer-auth.service';

class RequestOtpDto {
  @IsString()
  phone: string;
}

class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

class EmailLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class RegisterPhoneDto extends RequestOtpDto {
  @IsString()
  @Length(2, 120)
  fullName: string;
}

class CompletePhoneRegistrationDto extends RegisterPhoneDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

class RegisterEmailDto extends EmailLoginDto {
  @IsString()
  @Length(2, 120)
  fullName: string;
}

@Controller('customer-portal/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Public()
  @Post('otp/request')
  requestOtp(@Body() payload: RequestOtpDto) {
    return this.customerAuthService.requestOtp(payload.phone);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() payload: VerifyOtpDto) {
    return this.customerAuthService.verifyOtp(payload.phone, payload.code);
  }

  @Public()
  @Post('email/login')
  loginWithEmail(@Body() payload: EmailLoginDto) {
    return this.customerAuthService.loginWithEmail(payload.email, payload.password);
  }

  @Public()
  @Post('register/phone/request')
  registerPhoneRequest(@Body() payload: RegisterPhoneDto) {
    return this.customerAuthService.requestPhoneRegistration(payload.fullName, payload.phone);
  }

  @Public()
  @Post('register/phone/verify')
  registerPhoneVerify(@Body() payload: CompletePhoneRegistrationDto) {
    return this.customerAuthService.registerWithPhone(payload.fullName, payload.phone, payload.code);
  }

  @Public()
  @Post('register/email')
  registerEmail(@Body() payload: RegisterEmailDto) {
    return this.customerAuthService.registerWithEmail(payload.fullName, payload.email, payload.password);
  }
}
