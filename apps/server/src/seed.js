import { connectDB } from './db.js';
import { User } from './models/User.js';
import { Device } from './models/Device.js';
import { Geofence } from './models/Geofence.js';
import { GeofenceEvent } from './models/GeofenceEvent.js';

/** Centro demo: Ciudad de México (Zócalo) */
const CENTER = { lat: 19.4326, lng: -99.1332 };

async function seed() {
  await connectDB();

  console.log('[seed] Limpiando colecciones de tracking...');
  await Promise.all([
    User.deleteMany({}),
    Device.deleteMany({}),
    Geofence.deleteMany({}),
    GeofenceEvent.deleteMany({}),
  ]);

  const admin = await User.create({
    name: 'Admin Sistema',
    email: 'admin@controlaccesos.local',
    password: 'admin123',
    role: 'admin',
    department: 'TI',
  });

  const guard = await User.create({
    name: 'Operador Mapas',
    email: 'guardia@controlaccesos.local',
    password: 'guardia123',
    role: 'guard',
    department: 'Monitoreo',
  });

  const employee = await User.create({
    name: 'Ana Móvil',
    email: 'ana@controlaccesos.local',
    password: 'empleado123',
    role: 'employee',
    department: 'Campo',
  });

  const office = await Geofence.create({
    name: 'Oficina Central',
    description: 'Geocerca circular de la sede',
    type: 'circle',
    coordinates: [[CENTER.lng, CENTER.lat]],
    radiusMeters: 250,
    color: '#2dd4bf',
  });

  const zoneA = await Geofence.create({
    name: 'Zona A - Patio',
    description: 'Polígono de prueba al norte del centro',
    type: 'polygon',
    coordinates: [
      [CENTER.lng - 0.004, CENTER.lat + 0.003],
      [CENTER.lng + 0.004, CENTER.lat + 0.003],
      [CENTER.lng + 0.004, CENTER.lat + 0.007],
      [CENTER.lng - 0.004, CENTER.lat + 0.007],
    ],
    color: '#38bdf8',
  });

  await Device.create([
    {
      name: 'Teléfono Ana',
      deviceKey: 'DEV-ANA-001',
      user: employee._id,
      label: 'Ana',
      lastLocation: {
        type: 'Point',
        coordinates: [CENTER.lng - 0.01, CENTER.lat - 0.008],
      },
      lastSeenAt: new Date(),
      online: false,
    },
    {
      name: 'Teléfono Operador',
      deviceKey: 'DEV-OP-001',
      user: guard._id,
      label: 'Operador',
      lastLocation: {
        type: 'Point',
        coordinates: [CENTER.lng + 0.006, CENTER.lat + 0.002],
      },
      lastSeenAt: new Date(),
      online: false,
    },
    {
      name: 'Dispositivo Demo',
      deviceKey: 'DEV-DEMO-001',
      user: admin._id,
      label: 'Demo',
      lastLocation: {
        type: 'Point',
        coordinates: [CENTER.lng, CENTER.lat + 0.012],
      },
      lastSeenAt: new Date(),
      online: false,
    },
  ]);

  console.log('[seed] Tracking demo listo');
  console.log('  Admin:    admin@controlaccesos.local / admin123');
  console.log('  Operador: guardia@controlaccesos.local / guardia123');
  console.log('  Empleado: ana@controlaccesos.local / empleado123');
  console.log(`  Geocercas: ${office.name}, ${zoneA.name}`);
  console.log('  Devices:  DEV-ANA-001, DEV-OP-001, DEV-DEMO-001');
  console.log(`  Mapa centro: ${CENTER.lat}, ${CENTER.lng}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
