/// API and tenant config are intentionally separate: a shared API endpoint
/// determines the server to call, while the tenant domain resolves the clinic.
class Env {
  Env._();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  /// Tenant selected by this customer-app build. This is sent to the shared
  /// API so it can resolve the correct clinic database.
  static const tenantDomain = String.fromEnvironment(
    'TENANT_DOMAIN',
    defaultValue: 'dev5.vienvu.com',
  );
}
