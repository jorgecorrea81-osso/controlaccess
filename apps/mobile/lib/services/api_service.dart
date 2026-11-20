import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiService {
  ApiService(this.baseUrl);

  String baseUrl;

  Uri _uri(String path) {
    final root = baseUrl.replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$root$path');
  }

  Future<Map<String, dynamic>> health() async {
    final res = await http.get(_uri('/api/health')).timeout(const Duration(seconds: 15));
    if (res.statusCode >= 400) {
      throw Exception('Health HTTP ${res.statusCode}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> registerDevice({
    required String deviceKey,
    required String name,
    String label = 'Flutter',
  }) async {
    final res = await http
        .post(
          _uri('/api/devices/register'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'deviceKey': deviceKey,
            'name': name,
            'label': label,
          }),
        )
        .timeout(const Duration(seconds: 20));

    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw Exception(body['error']?.toString() ?? 'Error al registrar device');
    }
    return body['device'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> pushLocation({
    required String deviceKey,
    required double lat,
    required double lng,
    double? accuracy,
    double? speed,
    double? heading,
  }) async {
    final res = await http
        .post(
          _uri('/api/devices/location'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'deviceKey': deviceKey,
            'lat': lat,
            'lng': lng,
            'source': 'mobile',
            if (accuracy != null) 'accuracy': accuracy,
            if (speed != null) 'speed': speed,
            if (heading != null) 'heading': heading,
          }),
        )
        .timeout(const Duration(seconds: 20));

    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw Exception(body['error']?.toString() ?? 'Error al enviar ubicación');
    }
    return body;
  }
}
