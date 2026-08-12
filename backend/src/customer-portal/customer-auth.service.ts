import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { Customer, CustomerOtp } from '../entities/entities';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SmsService } from './sms.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function normalizePhone(phone: string) {
  return String(phone || '').trim();
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function safeCustomer(customer: Customer) {
  const { id, code, fullName, avatarUrl, phone, email, gender, tier, status } = customer;
  return { id, code, fullName, avatarUrl, phone, email, gender, tier, status };
}

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(CustomerOtp) private readonly otps: Repository<CustomerOtp>,
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContextService,
    private readonly smsService: SmsService,
  ) {}

  async requestOtp(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    if (!phone) throw new BadRequestException('Vui lòng nhập số điện thoại');

    const customer = await this.customers.findOne({ where: { phone, isArchived: false } });
    const response: { message: string; devCode?: string } = {
      message: 'Nếu số điện thoại đã đăng ký, mã xác thực sẽ được gửi đến bạn',
    };
    if (!customer) return response;

    const recent = await this.otps.findOne({ where: { phone }, order: { createdAt: 'DESC' } });
    // During development the OTP is returned as devCode, so allow immediate
    // regeneration while testing the login flow. Production keeps the rate limit.
    if (
      !this.smsService.isDevMode &&
      recent &&
      Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException('Vui lòng đợi ít phút trước khi yêu cầu mã mới');
    }

    const code = generateCode();
    const otp = this.otps.create({
      phone,
      codeHash: await hash(code, 10),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
    });
    await this.otps.save(otp);
    await this.smsService.sendOtp(phone, code);

    if (this.smsService.isDevMode) response.devCode = code;
    return response;
  }

  async verifyOtp(rawPhone: string, code: string) {
    const phone = normalizePhone(rawPhone);
    if (!phone || !code) throw new BadRequestException('Vui lòng nhập số điện thoại và mã xác thực');

    const customer = await this.customers.findOne({ where: { phone, isArchived: false } });
    if (!customer) throw new UnauthorizedException('Mã xác thực không đúng hoặc đã hết hạn');

    const otp = await this.otps.findOne({
      where: { phone, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Mã xác thực không đúng hoặc đã hết hạn');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Bạn đã nhập sai quá số lần cho phép, vui lòng yêu cầu mã mới');
    }

    const matches = await compare(code, otp.codeHash);
    if (!matches) {
      otp.attempts += 1;
      await this.otps.save(otp);
      throw new UnauthorizedException('Mã xác thực không đúng hoặc đã hết hạn');
    }

    otp.consumedAt = new Date();
    await this.otps.save(otp);

    const payload = {
      tenantId: this.tenantContext.require().id,
      customerId: customer.id,
      phone: customer.phone,
      kind: 'customer' as const,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      customer: safeCustomer(customer),
    };
  }
}
