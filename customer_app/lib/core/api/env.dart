/// Single-tenant config: this app build targets one clinic's API domain,
/// mirroring how tenant resolution in the backend works (Host header ->
/// tenant). Swap via --dart-define if a multi-clinic build is ever needed.
class Env {
  Env._();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
}
