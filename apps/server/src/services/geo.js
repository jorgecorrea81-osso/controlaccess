/** Distancia Haversine en metros */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ray casting: coordinates = [[lng, lat], ...] */
export function pointInPolygon(lat, lng, coordinates) {
  if (!coordinates?.length) return false;

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i]; // lng, lat
    const [xj, yj] = coordinates[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideGeofence(lat, lng, geofence) {
  if (!geofence?.active) return false;

  if (geofence.type === 'circle') {
    const [clng, clat] = geofence.coordinates[0];
    return distanceMeters(lat, lng, clat, clng) <= (geofence.radiusMeters || 0);
  }

  if (geofence.type === 'polygon') {
    return pointInPolygon(lat, lng, geofence.coordinates);
  }

  return false;
}
