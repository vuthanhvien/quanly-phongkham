import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Public } from '../common/auth';
import {
  Appointment, Branch, Consultation, Customer, CustomerImage, Invoice,
  ContentDoctor, ContentNews, ContentPost, ContentService, ContentVideo, MedicalEpisode, ServiceOrder, Treatment,
} from '../entities/entities';
import { CustomerAuthUser } from './customer-auth';
import { CustomerJwtAuthGuard } from './customer-jwt-auth.guard';

const SELF_EDITABLE_FIELDS = ['email', 'gender', 'address', 'addressLine'] as const;

class UpdateMeDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;
}

class CreateAppointmentDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsIn(['CONSULTATION', 'PROCEDURE', 'FOLLOW_UP'])
  type?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  doctorStaffId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

function safeCustomer(customer: Customer) {
  const { id, code, fullName, avatarUrl, phone, email, gender, idNumber, address, addressLine, tier, status, totalSpent, loyaltyPoints } =
    customer;
  return { id, code, fullName, avatarUrl, phone, email, gender, idNumber, address, addressLine, tier, status, totalSpent, loyaltyPoints };
}

@Controller('customer-portal')
@Public()
@UseGuards(CustomerJwtAuthGuard)
export class CustomerPortalController {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(ContentService) private readonly services: Repository<ContentService>,
    @InjectRepository(ContentPost) private readonly posts: Repository<ContentPost>,
    @InjectRepository(ContentNews) private readonly news: Repository<ContentNews>,
    @InjectRepository(ContentDoctor) private readonly doctors: Repository<ContentDoctor>,
    @InjectRepository(ContentVideo) private readonly videos: Repository<ContentVideo>,
    @InjectRepository(MedicalEpisode) private readonly medicalEpisodes: Repository<MedicalEpisode>,
    @InjectRepository(Consultation) private readonly consultations: Repository<Consultation>,
    @InjectRepository(Treatment) private readonly treatments: Repository<Treatment>,
    @InjectRepository(ServiceOrder) private readonly serviceOrders: Repository<ServiceOrder>,
    @InjectRepository(CustomerImage) private readonly customerImages: Repository<CustomerImage>,
  ) {}

  @Get('me')
  async me(@Request() request: { customer: CustomerAuthUser }) {
    const customer = await this.requireOwnCustomer(request.customer.customerId);
    return { data: safeCustomer(customer) };
  }

  @Patch('me')
  async updateMe(@Request() request: { customer: CustomerAuthUser }, @Body() payload: UpdateMeDto) {
    const customer = await this.requireOwnCustomer(request.customer.customerId);
    for (const field of SELF_EDITABLE_FIELDS) {
      if (payload[field] !== undefined) customer[field] = payload[field];
    }
    await this.customers.save(customer);
    return { data: safeCustomer(customer) };
  }

  /**
   * The customer-facing counterpart to the CMS customer detail tabs.  Every
   * query is scoped from the JWT customer id; the app never supplies an id.
   */
  @Get('me/overview')
  async overview(@Request() request: { customer: CustomerAuthUser }) {
    const customerId = request.customer.customerId;
    const [customer, medicalEpisodes, consultations, treatments, serviceOrders, images, invoices] = await Promise.all([
      this.requireOwnCustomer(customerId),
      this.medicalEpisodes.find({ where: { customerId }, order: { operationDate: 'DESC', createdAt: 'DESC' } }),
      this.consultations.find({ where: { customerId }, order: { consultedAt: 'DESC' } }),
      this.treatments.find({ where: { customerId }, order: { updatedAt: 'DESC' } }),
      this.serviceOrders.find({ where: { customerId }, order: { orderDate: 'DESC' } }),
      this.customerImages.find({ where: { customerId }, order: { capturedAt: 'DESC', createdAt: 'DESC' } }),
      this.invoices.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 10 }),
    ]);
    return {
      data: {
        customer: safeCustomer(customer), medicalEpisodes, consultations,
        treatments, serviceOrders, images, invoices,
      },
    };
  }

  @Get('appointments')
  async listAppointments(
    @Request() request: { customer: CustomerAuthUser },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const skip = Math.max((Number(page) || 1) - 1, 0) * take;
    const [data, total] = await this.appointments.findAndCount({
      where: { customerId: request.customer.customerId },
      order: { startTime: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  @Get('appointments/:id')
  async getAppointment(@Request() request: { customer: CustomerAuthUser }, @Param('id') id: string) {
    const appointment = await this.appointments.findOne({ where: { id } });
    if (!appointment || appointment.customerId !== request.customer.customerId) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }
    return { data: appointment };
  }

  @Post('appointments')
  async createAppointment(@Request() request: { customer: CustomerAuthUser }, @Body() payload: CreateAppointmentDto) {
    const startTime = new Date(payload.startTime);
    const endTime = new Date(payload.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      throw new BadRequestException('Thời gian đặt lịch không hợp lệ');
    }

    if (payload.doctorStaffId || payload.roomId) {
      const overlap = await this.appointments.findOne({
        where: [
          ...(payload.doctorStaffId
            ? [{ doctorStaffId: payload.doctorStaffId, startTime: LessThan(endTime), endTime: MoreThan(startTime) }]
            : []),
          ...(payload.roomId
            ? [{ roomId: payload.roomId, startTime: LessThan(endTime), endTime: MoreThan(startTime) }]
            : []),
        ],
      });
      if (overlap) throw new BadRequestException('Bác sĩ hoặc phòng đã có lịch trong khung giờ này');
    }

    const appointment = this.appointments.create({
      customerId: request.customer.customerId,
      branchId: payload.branchId,
      type: payload.type || 'CONSULTATION',
      startTime,
      endTime,
      status: 'SCHEDULED',
      doctorStaffId: payload.doctorStaffId,
      roomId: payload.roomId,
      note: payload.note,
    });
    await this.appointments.save(appointment);
    return { data: appointment };
  }

  @Patch('appointments/:id/cancel')
  async cancelAppointment(@Request() request: { customer: CustomerAuthUser }, @Param('id') id: string) {
    const appointment = await this.appointments.findOne({ where: { id } });
    if (!appointment || appointment.customerId !== request.customer.customerId) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }
    if (appointment.startTime && appointment.startTime.getTime() < Date.now()) {
      throw new BadRequestException('Không thể hủy lịch hẹn đã diễn ra');
    }
    appointment.status = 'CANCELLED';
    await this.appointments.save(appointment);
    return { data: appointment };
  }

  @Get('invoices')
  async listInvoices(
    @Request() request: { customer: CustomerAuthUser },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const skip = Math.max((Number(page) || 1) - 1, 0) * take;
    const [data, total] = await this.invoices.findAndCount({
      where: { customerId: request.customer.customerId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  @Get('invoices/:id')
  async getInvoice(@Request() request: { customer: CustomerAuthUser }, @Param('id') id: string) {
    const invoice = await this.invoices.findOne({ where: { id } });
    if (!invoice || invoice.customerId !== request.customer.customerId) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }
    return { data: invoice };
  }

  @Get('branches')
  async listBranches() {
    const data = await this.branches.find({ where: { isActive: true }, order: { name: 'ASC' } });
    return { data };
  }

  @Get('services')
  async listServices() {
    const data = await this.services.find({
      where: { status: 'PUBLISHED', isArchived: false },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
    return {
      data: data.map(({ id, slug, name, category, price, imageUrl, excerpt, content, isFeatured }) => ({
        id,
        code: slug,
        name,
        categoryId: category,
        sellingPrice: price,
        imageUrl,
        excerpt,
        content,
        isFeatured,
      })),
    };
  }

  @Get('posts')
  async listPosts() {
    const data = await this.posts.find({
      where: { status: 'PUBLISHED', isArchived: false },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
    return { data };
  }

  @Get('news')
  async listNews() {
    const data = await this.news.find({
      where: { status: 'PUBLISHED', isArchived: false },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
    return { data };
  }

  @Get('videos')
  async listVideos() {
    const data = await this.videos.find({
      where: { status: 'PUBLISHED', isArchived: false },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
    return { data };
  }

  @Get('doctors')
  async listDoctors() {
    const data = await this.doctors.find({
      where: { status: 'PUBLISHED', isArchived: false },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
    return { data: data.map(({ id, slug, fullName, imageUrl, specialty, experience, excerpt, content }) => ({ id, code: slug, fullName, avatarUrl: imageUrl, position: specialty, experience, excerpt, content })) };
  }

  private async requireOwnCustomer(customerId: string) {
    const customer = await this.customers.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
    return customer;
  }
}
