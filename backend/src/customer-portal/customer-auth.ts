export interface CustomerAuthUser {
  tenantId: string;
  customerId: string;
  phone: string;
  kind: 'customer';
}
