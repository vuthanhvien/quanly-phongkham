import { expect, test } from '@playwright/test';
import { archiveRecord, createRecord, defaultBranchId, e2eId, listRecords, sessionFor, type ApiSession } from './fixtures/api';
import { credentialsFor } from './fixtures/auth';

test.describe.serial('CRM → clinical journey (ADMIN)', () => {
  test.skip(!credentialsFor('ADMIN'), 'Set E2E_ADMIN_IDENTIFIER and E2E_ADMIN_PASSWORD.');

  let admin: ApiSession;
  let branchId: string;
  const cleanup: Array<{ resource: string; id: string }> = [];

  test.beforeAll(async ({ request }) => {
    admin = await sessionFor(request, 'ADMIN');
    branchId = await defaultBranchId(admin);
  });

  test.afterEach(async () => {
    await Promise.all(cleanup.splice(0).reverse().map(({ resource, id }) => archiveRecord(admin, resource, id)));
  });

  test('lead is converted into a customer', async () => {
    const code = e2eId('LEAD');
    const lead = await createRecord(admin, 'leads', {
      code,
      fullName: `Khách E2E ${code}`,
      phone: `09${String(Date.now()).slice(-8)}`,
      source: 'E2E',
      status: 'NEW',
      branchId,
    });
    cleanup.push({ resource: 'leads', id: lead.id });

    const response = await admin.request.post(`/api/records/leads/${lead.id}/convert-to-customer`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(response, 'convert lead to customer').toBeOK();
    const body = await response.json() as { data: { id: string; fullName: string } };
    expect(body.data.id).toBeTruthy();
    expect(body.data.fullName).toBe(`Khách E2E ${code}`);
    cleanup.push({ resource: 'customers', id: body.data.id });

    const [updatedLead] = await listRecords(admin, 'leads', { search: code });
    expect(updatedLead?.status).toBe('CONVERTED');
    expect(updatedLead?.convertedCustomerId).toBe(body.data.id);
  });

  test('customer receives a medical episode and appointment', async () => {
    const code = e2eId('CUSTOMER');
    const customer = await createRecord(admin, 'customers', {
      code,
      fullName: `Khách E2E ${code}`,
      phone: `08${String(Date.now()).slice(-8)}`,
      branchId,
      status: 'CONSULTING',
    });
    cleanup.push({ resource: 'customers', id: customer.id });

    const episode = await createRecord(admin, 'medical-episodes', {
      customerId: customer.id,
      branchId,
      serviceName: 'Khám E2E',
      status: 'ACTIVE',
      chiefComplaint: 'Dữ liệu tự động phục vụ E2E',
    });
    cleanup.push({ resource: 'medical-episodes', id: episode.id });

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const appointment = await createRecord(admin, 'appointments', {
      customerId: customer.id,
      branchId,
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    cleanup.push({ resource: 'appointments', id: appointment.id });

    expect(episode.customerId).toBe(customer.id);
    expect(appointment.customerId).toBe(customer.id);
    expect(appointment.status).toBe('SCHEDULED');
  });

  test('an invoice is created with the expected payment state', async () => {
    const code = e2eId('INVOICE-CUSTOMER');
    const customer = await createRecord(admin, 'customers', {
      code,
      fullName: `Khách E2E ${code}`,
      phone: `07${String(Date.now()).slice(-8)}`,
      branchId,
      status: 'CONSULTING',
    });
    cleanup.push({ resource: 'customers', id: customer.id });

    const invoice = await createRecord(admin, 'invoices', {
      code: e2eId('INVOICE'),
      customerId: customer.id,
      branchId,
      taxableAmount: 100000,
      vatRate: 10,
      vatAmount: 10000,
      totalAmount: 110000,
      paidAmount: 110000,
      method: 'CASH',
      status: 'PAID',
    });
    cleanup.push({ resource: 'invoices', id: invoice.id });
    expect(invoice.customerId).toBe(customer.id);
    expect(invoice.totalAmount).toBe(110000);
    expect(invoice.status).toBe('PAID');
  });
});
