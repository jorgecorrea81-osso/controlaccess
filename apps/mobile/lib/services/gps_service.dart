import 'dart:async';

import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class GpsService {
  StreamSubscription<Position>? _sub;

  Future<bool> ensurePermission() async {
    var status = await Permission.locationWhenInUse.status;
    if (status.isDenied || status.isRestricted) {
      status = await Permission.locationWhenInUse.request();
    }
    if (status.isPermanentlyDenied) {
      await openAppSettings();
      return false;
    }
    if (!status.isGranted) return false;

    final serviceOn = await Geolocator.isLocationServiceEnabled();
    if (!serviceOn) {
      await Geolocator.openLocationSettings();
      return false;
    }
    return true;
  }

  Future<Position> current() {
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 0,
      ),
    );
  }

  Stream<Position> watch() {
    const settings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 3,
    );
    return Geolocator.getPositionStream(locationSettings: settings);
  }

  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
  }
}
