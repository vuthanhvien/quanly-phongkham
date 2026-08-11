import { Injectable, Logger } from '@nestjs/common';

/**
 * No SMS/ZNS provider is wired up yet — this logs the OTP so the login flow is
 * testable end-to-end. Swap the body for a real provider once credentials exist.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`OTP for ${phone}: ${code}`);
  }

  get isDevMode(): boolean {
    return (process.env.NODE_ENV || 'development') !== 'production';
  }
}
