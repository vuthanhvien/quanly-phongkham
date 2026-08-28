import { expect, test } from '@playwright/test';
import { archiveRecord, createRecord, defaultBranchId, e2eId, listRecords, sessionFor, type ApiSession } from './fixtures/api';
import { credentialsFor } from './fixtures/auth';

/**
 * Exercises the same API used by RecordImportPage after it parses an Excel
 * workbook: one header sheet plus one detail sheet, linked by business codes.
 */
test.describe.serial('bundle import (ADMIN)', () => {
  test.skip(!credentialsFor('ADMIN'), 'Set E2E_ADMIN_IDENTIFIER and E2E_ADMIN_PASSWORD.');

  test('imports product combo, stock receipt and service order from linked sheets', async ({ request }) => {
    const admin: ApiSession = await sessionFor(request, 'ADMIN');
    const branchId = await defaultBranchId(admin);
    const branch = (await listRecords(admin, 'branches')).find((row) => row.id === branchId);
    const branchCode = String(branch?.slug || '');
    if (!branchCode) throw new Error('E2E tenant needs a branch slug for bundle imports.');
    const cleanup: Array<{ resource: string; id: string }> = [];

    try {
    const unitName = e2eId('UNIT');
    const unit = await createRecord(admin, 'units', { name: unitName, conversionFactor: 1 });
    cleanup.push({ resource: 'units', id: unit.id });

    const componentCode = e2eId('ITEM');
    const comboCode = e2eId('COMBO');
    const productImport = await admin.request.post('/api/records/products/import-bundle', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        sheets: {
          products: [
            { code: componentCode, name: `SP thành phần ${componentCode}`, productType: 'CONSUMABLE', baseUnitId: unitName, sellingPrice: 25000, minStockLevel: 1 },
            { code: comboCode, name: `Combo ${comboCode}`, productType: 'COMBO', baseUnitId: unitName, sellingPrice: 50000, minStockLevel: 0 },
          ],
          'product-combo-items': [{ productCode: comboCode, componentProductCode: componentCode, quantity: 2 }],
        },
      },
    });
    expect(productImport, 'import product bundle').toBeOK();
    const products = await listRecords(admin, 'products', { search: componentCode });
    const component = products.find((row) => row.code === componentCode);
    expect(component?.id).toBeTruthy();
    cleanup.push({ resource: 'products', id: String(component!.id) });
    const combo = (await listRecords(admin, 'products', { search: comboCode })).find((row) => row.code === comboCode);
    expect(combo?.id).toBeTruthy();
    cleanup.push({ resource: 'products', id: String(combo!.id) });

    const receiptCode = e2eId('RECEIPT');
    const batchNumber = e2eId('BATCH');
    const stockImport = await admin.request.post('/api/records/stock-batches/import-bundle', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        sheets: {
          'stock-batches': [{ code: receiptCode, movementType: 'IMPORT', movementDate: '2026-08-28', branchId: branchCode, note: 'E2E bundle receipt' }],
          'stock-batch-items': [{ receiptCode, productCode: componentCode, batchNumber, quantity: 10, transferUnitId: unitName }],
        },
      },
    });
    expect(stockImport, 'import stock receipt bundle').toBeOK();
    const batches = await listRecords(admin, 'stock-batches');
    const batch = batches.find((row) => row.batchNumber === batchNumber);
    expect(Number(batch?.remainingQuantity)).toBe(10);
    if (batch?.id) cleanup.push({ resource: 'stock-batches', id: String(batch.id) });

    const customerCode = e2eId('CUSTOMER');
    const customer = await createRecord(admin, 'customers', { code: customerCode, fullName: `Khách ${customerCode}`, phone: `09${String(Date.now()).slice(-8)}`, branchId });
    cleanup.push({ resource: 'customers', id: customer.id });
    const orderCode = e2eId('ORDER');
    const orderImport = await admin.request.post('/api/records/service-orders/import-bundle', {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        sheets: {
          'service-orders': [{ code: orderCode, customerCode, branchId: branchCode, orderDate: '2026-08-28', status: 'DRAFT' }],
          'service-order-items': [{ orderCode, productCode: componentCode, quantity: 3, transferUnitId: unitName, unitPrice: 25000 }],
        },
      },
    });
    expect(orderImport, 'import service order bundle').toBeOK();
    const order = (await listRecords(admin, 'service-orders', { search: orderCode })).find((row) => row.code === orderCode);
    expect(order?.customerId).toBe(customer.id);
    expect(Number(order?.totalAmount)).toBe(75000);
    if (order?.id) cleanup.push({ resource: 'service-orders', id: String(order.id) });
    } finally {
      await Promise.all(cleanup.reverse().map(({ resource, id }) => archiveRecord(admin, resource, id)));
    }
  });
});
