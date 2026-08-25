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

    const customer = await this.findCustomerByPhone(phone);
    const response: { message: string; devCode?: string } = {
      message: 'Nếu số điện thoại đã đăng ký, mã xác thực sẽ được gửi đến bạn',
    };
    if (!customer) return response;
    if (customer.passwordHash) {
      throw new BadRequestException('Tài khoản này dùng Email và mật khẩu. Vui lòng đăng nhập bằng Email');
    }

    return this.issueOtp(phone);
  }

  async requestPhoneRegistration(fullName: string, rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    if (!String(fullName || '').trim() || !phone) {
      throw new BadRequestException('Vui lòng nhập họ tên và số điện thoại');
    }
    const existing = await this.findCustomerByPhone(phone);
    if (existing) throw new BadRequestException(this.existingAccountMessage(existing));
    return this.issueOtp(phone);
  }

  async registerWithPhone(fullName: string, rawPhone: string, code: string) {
    const phone = normalizePhone(rawPhone);
    if (!String(fullName || '').trim() || !phone || !code) {
      throw new BadRequestException('Vui lòng nhập đủ thông tin đăng ký');
    }
    const existing = await this.findCustomerByPhone(phone);
    if (existing) throw new BadRequestException(this.existingAccountMessage(existing));
    await this.consumeOtp(phone, code);
    const customer = this.customers.create({
      code: this.newCustomerCode(),
      fullName: String(fullName).trim(),
      phone,
      status: 'CONSULTING',
    });
    await this.customers.save(customer);
    return this.createSession(customer);
  }

  async registerWithEmail(fullName: string, rawEmail: string, password: string) {
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!String(fullName || '').trim() || !email || !password) {
      throw new BadRequestException('Vui lòng nhập đủ thông tin đăng ký');
    }
    const existing = await this.findCustomerByEmail(email);
    if (existing) throw new BadRequestException(this.existingAccountMessage(existing));
    const customer = this.customers.create({
      code: this.newCustomerCode(),
      fullName: String(fullName).trim(),
      phone: '',
      email,
      passwordHash: await hash(password, 10),
      status: 'CONSULTING',
    });
    await this.customers.save(customer);
    return this.createSession(customer);
  }

  private async issueOtp(phone: string) {
    const response: { message: string; devCode?: string } = {
      message: 'Mã xác thực đã được gửi đến bạn',
    };

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

    const customer = await this.findCustomerByPhone(phone);
    if (!customer) throw new UnauthorizedException('Mã xác thực không đúng hoặc đã hết hạn');
    if (customer.passwordHash) {
      throw new UnauthorizedException('Tài khoản này dùng Email và mật khẩu. Vui lòng đăng nhập bằng Email');
    }

    await this.consumeOtp(phone, code);
    return this.createSession(customer);
  }

  private async consumeOtp(phone: string, code: string) {
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

  }

  async loginWithEmail(rawEmail: string, password: string) {
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!email || !password) {
      throw new BadRequestException('Vui lòng nhập email và mật khẩu');
    }

    const customer = await this.findCustomerByEmail(email);
    if (!customer) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!customer.passwordHash) {
      throw new UnauthorizedException('Tài khoản này dùng Số điện thoại. Vui lòng đăng nhập bằng Số điện thoại');
    }
    if (!(await compare(password, customer.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.createSession(customer);
  }

  private createSession(customer: Customer) {
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

  private findCustomerByPhone(phone: string) {
    return this.customers
      .createQueryBuilder('customer')
      .addSelect('customer.passwordHash')
      .where('customer.phone = :phone', { phone })
      .andWhere('customer.isArchived = :isArchived', { isArchived: false })
      .getOne();
  }

  private findCustomerByEmail(email: string) {
    return this.customers
      .createQueryBuilder('customer')
      .addSelect('customer.passwordHash')
      .where('LOWER(customer.email) = :email', { email })
      .andWhere('customer.isArchived = :isArchived', { isArchived: false })
      .getOne();
  }

  private existingAccountMessage(customer: Customer) {
    return customer.passwordHash
      ? 'Tài khoản đã tồn tại. Vui lòng đăng nhập bằng Email'
      : 'Tài khoản đã tồn tại. Vui lòng đăng nhập bằng Số điện thoại';
  }

  private newCustomerCode() {
    return `CUS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
}
