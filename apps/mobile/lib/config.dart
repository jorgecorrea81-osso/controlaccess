/// URL base del proyecto en Vercel (mismo host sirve web + /api).
class AppConfig {
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://controlaccess33-git-main-jorge-d006.vercel.app',
  );
}
