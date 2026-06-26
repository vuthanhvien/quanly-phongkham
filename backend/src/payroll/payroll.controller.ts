import { Body, Controller, Get, Post } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Post('generate')
  generate(
    @Body()
    body: {
      staffId: string;
      month: number;
      year: number;
      branchId?: string;
      bonus?: number;
      deduction?: number;
      note?: string;
    },
  ) {
    return this.service.generate(body);
  }

  @Get('default-rates')
  defaultRates() {
    return this.service.defaultRates();
  }
}
