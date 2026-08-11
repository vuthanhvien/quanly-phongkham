import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
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
}
