import 'package:socket_io_client/socket_io_client.dart' as io;

typedef LocationAck = void Function(Map<String, dynamic> data);
typedef SocketStatus = void Function(String status, [String? detail]);

class SocketService {
  io.Socket? _socket;

  bool get connected => _socket?.connected == true;

  void connect({
    required String baseUrl,
    required String deviceKey,
    required SocketStatus onStatus,
    LocationAck? onAck,
  }) {
    disconnect();

    final origin = baseUrl.replaceAll(RegExp(r'/+$'), '');
    onStatus('connecting', origin);

    _socket = io.io(
      origin,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setPath('/socket.io')
          .setAuth({'deviceKey': deviceKey})
          .enableAutoConnect()
          .enableReconnection()
          .build(),
    );

    _socket!
      ..onConnect((_) => onStatus('connected'))
      ..onDisconnect((_) => onStatus('disconnected'))
      ..onConnectError((err) => onStatus('error', err.toString()))
      ..onError((err) => onStatus('error', err.toString()))
      ..on('device:location:ack', (data) {
        if (data is Map && onAck != null) {
          onAck(Map<String, dynamic>.from(data));
        }
      });
  }

  void sendLocation({
    required String deviceKey,
    required double lat,
    required double lng,
    double? accuracy,
    double? speed,
    double? heading,
    LocationAck? onAck,
  }) {
    final socket = _socket;
    if (socket == null || !socket.connected) {
      if (onAck != null) {
        onAck({'error': 'Socket no conectado'});
      }
      return;
    }

    final payload = <String, dynamic>{
      'deviceKey': deviceKey,
      'lat': lat,
      'lng': lng,
      'source': 'mobile',
      if (accuracy != null) 'accuracy': accuracy,
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
    };

    socket.emitWithAck('device:location', payload, ack: (data) {
      if (data is Map && onAck != null) {
        onAck(Map<String, dynamic>.from(data));
      }
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
