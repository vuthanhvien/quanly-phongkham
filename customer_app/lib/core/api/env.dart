import 'build_environment.dart';

/// API and tenant config are intentionally separate: a shared API endpoint
/// determines the server to call, while the tenant domain resolves the clinic.
class Env {
  Env._();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: BuildEnvironment.apiBaseUrl,
  );

  /// Tenant selected by this customer-app build. This is sent to the shared
  /// API so it can resolve the correct clinic database.
  static const tenantDomain = String.fromEnvironment(
    'TENANT_DOMAIN',
    defaultValue: BuildEnvironment.tenantDomain,
  );

  /// CMS media can contain a local absolute URL from the backend (commonly
  /// `127.0.0.1`). Rebase local URLs to the API host used by this app so media
  /// works on simulator/device builds that use a different development host.
  static String resolvePublicUrl(String value) {
    final raw = Uri.tryParse(value.trim());
    if (raw == null) return value;
    final api = Uri.parse(baseUrl);
    if (!raw.hasScheme) {
      return api.replace(path: raw.path, query: raw.query).toString();
    }
    const loopbackHosts = {'localhost', '127.0.0.1', '::1'};
    if (!loopbackHosts.contains(raw.host.toLowerCase())) return value;
    return raw
        .replace(scheme: api.scheme, host: api.host, port: api.port)
        .toString();
  }
}
