import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import 'config.dart';
import 'services/api_service.dart';
import 'services/gps_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ControlAccesosApp());
}

class ControlAccesosApp extends StatelessWidget {
  const ControlAccesosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Control Accesos',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF14B8A6),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const TrackingPage(),
    );
  }
}

class TrackingPage extends StatefulWidget {
  const TrackingPage({super.key});

  @override
  State<TrackingPage> createState() => _TrackingPageState();
}

class _TrackingPageState extends State<TrackingPage> {
  final _gps = GpsService();
  final _mapController = MapController();
  final _urlController = TextEditingController();

  late ApiService _api;
  String _deviceKey = '';
  String _deviceName = '';
  String _apiBase = AppConfig.defaultApiBaseUrl;
  String _httpStatus = 'idle';
  String _statusDetail = '';
  String _lastEvent = 'Sin eventos';
  bool _tracking = false;
  bool _busy = false;
  Position? _position;
  final List<LatLng> _trail = [];
  StreamSubscription<Position>? _posSub;
  DateTime? _lastSentAt;

  @override
  void initState() {
    super.initState();
    _api = ApiService(_apiBase);
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    _apiBase = prefs.getString('apiBase') ?? AppConfig.defaultApiBaseUrl;
    _deviceKey = prefs.getString('deviceKey') ?? '';
    _deviceName = prefs.getString('deviceName') ?? '';
    _urlController.text = _apiBase;
    _api = ApiService(_apiBase);

    if (_deviceKey.isEmpty) {
      _deviceKey = 'DEV-FLUTTER-${const Uuid().v4().substring(0, 8).toUpperCase()}';
      _deviceName = 'Android $_deviceKey';
      await prefs.setString('deviceKey', _deviceKey);
      await prefs.setString('deviceName', _deviceName);
    }

    setState(() {});
  }

  Future<void> _saveApiBase(String value) async {
    final cleaned = value.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('apiBase', cleaned);
    setState(() {
      _apiBase = cleaned;
      _api = ApiService(cleaned);
      _urlController.text = cleaned;
    });
  }

  Future<void> _sendLocation(Position pos) async {
    // Evita saturar Vercel serverless (máx ~1 req/s)
    final now = DateTime.now();
    if (_lastSentAt != null && now.difference(_lastSentAt!).inMilliseconds < 1000) {
      return;
    }
    _lastSentAt = now;

    try {
      final result = await _api.pushLocation(
        deviceKey: _deviceKey,
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        speed: pos.speed,
        heading: pos.heading,
      );

      if (!mounted) return;
      setState(() {
        _httpStatus = 'ok';
        _statusDetail = '';
      });

      final events = result['events'];
      if (events is List && events.isNotEmpty) {
        final first = Map<String, dynamic>.from(events.first as Map);
        final type = first['type'] == 'enter' ? 'ENTRÓ' : 'SALIÓ';
        final fence = (first['geofence'] is Map)
            ? (first['geofence'] as Map)['name']
            : 'geocerca';
        setState(() => _lastEvent = '$type → $fence');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _httpStatus = 'error';
        _statusDetail = e.toString();
      });
    }
  }

  Future<void> _startTracking() async {
    setState(() {
      _busy = true;
      _statusDetail = '';
    });

    try {
      final ok = await _gps.ensurePermission();
      if (!ok) {
        throw Exception('Permiso de ubicación denegado o GPS apagado');
      }

      await _saveApiBase(_urlController.text);

      final health = await _api.health();
      if (health['ok'] != true) {
        throw Exception('API no saludable');
      }

      await _api.registerDevice(deviceKey: _deviceKey, name: _deviceName);

      final current = await _gps.current();
      _applyPosition(current, center: true);
      await _sendLocation(current);

      await _posSub?.cancel();
      _posSub = _gps.watch().listen((pos) {
        _applyPosition(pos);
        _sendLocation(pos);
      });

      setState(() {
        _tracking = true;
        _httpStatus = 'ok';
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      setState(() {
        _httpStatus = 'error';
        _statusDetail = e.toString();
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _applyPosition(Position pos, {bool center = false}) {
    final point = LatLng(pos.latitude, pos.longitude);
    setState(() {
      _position = pos;
      _trail.add(point);
      if (_trail.length > 500) {
        _trail.removeRange(0, _trail.length - 500);
      }
    });
    if (center) {
      _mapController.move(point, 17);
    } else {
      _mapController.move(point, _mapController.camera.zoom);
    }
  }

  Future<void> _stopTracking() async {
    await _posSub?.cancel();
    _posSub = null;
    setState(() {
      _tracking = false;
      _httpStatus = 'idle';
    });
  }

  @override
  void dispose() {
    _posSub?.cancel();
    _urlController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pos = _position;
    final center = pos != null
        ? LatLng(pos.latitude, pos.longitude)
        : const LatLng(19.4326, -99.1332);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Control Accesos · GPS HTTP'),
        actions: [
          IconButton(
            tooltip: 'Centrar',
            onPressed: pos == null
                ? null
                : () => _mapController.move(LatLng(pos.latitude, pos.longitude), 17),
            icon: const Icon(Icons.my_location),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(initialCenter: center, initialZoom: 15),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.controlaccesos.mobile',
                ),
                if (_trail.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: List<LatLng>.from(_trail),
                        strokeWidth: 4,
                        color: const Color(0xFF2DD4BF),
                      ),
                    ],
                  ),
                if (pos != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(pos.latitude, pos.longitude),
                        width: 40,
                        height: 40,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x663B82F6),
                                blurRadius: 12,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            decoration: const BoxDecoration(
              color: Color(0xFF1A222D),
              border: Border(top: BorderSide(color: Color(0xFF2E3D4F))),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _urlController,
                  enabled: !_tracking,
                  decoration: const InputDecoration(
                    labelText: 'URL de Vercel (web + API)',
                    hintText: 'https://tu-proyecto.vercel.app',
                    border: OutlineInputBorder(),
                    helperText: 'Misma URL del deploy. La API está en /api',
                  ),
                ),
                const SizedBox(height: 10),
                Text('Device: $_deviceKey', style: const TextStyle(fontSize: 12)),
                Text(
                  'HTTP: $_httpStatus${_statusDetail.isEmpty ? '' : ' · $_statusDetail'}',
                  style: TextStyle(
                    fontSize: 12,
                    color: _httpStatus == 'ok' ? Colors.greenAccent : Colors.white70,
                  ),
                ),
                if (pos != null)
                  Text(
                    'GPS: ${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}'
                    ' · ±${pos.accuracy.toStringAsFixed(0)}m'
                    ' · ${DateFormat.Hms().format(pos.timestamp)}',
                    style: const TextStyle(fontSize: 12),
                  ),
                Text('Geocerca: $_lastEvent', style: const TextStyle(fontSize: 12)),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _busy ? null : (_tracking ? _stopTracking : _startTracking),
                    icon: Icon(_tracking ? Icons.stop : Icons.play_arrow),
                    label: Text(
                      _busy
                          ? 'Conectando…'
                          : (_tracking ? 'Detener tracking' : 'Iniciar GPS + HTTP'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
