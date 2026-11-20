import { AccessLog } from '../models/AccessLog.js';
import { AccessPoint } from '../models/AccessPoint.js';
import { Credential } from '../models/Credential.js';

/**
 * Evalúa un intento de acceso y registra el resultado.
 * Pensado para web (REST) y móvil (Socket.IO).
 */
export async function evaluateAccess({
  cardCode,
  accessPointId,
  direction = 'in',
  source = 'web',
  metadata = {},
}) {
  const accessPoint = await AccessPoint.findById(accessPointId);
  if (!accessPoint) {
    const err = new Error('Punto de acceso no encontrado');
    err.status = 404;
    throw err;
  }

  if (!accessPoint.active) {
    return createDeniedLog({
      accessPoint,
      direction,
      source,
      cardCode,
      reason: 'Punto de acceso inactivo',
      metadata,
    });
  }

  const credential = await Credential.findOne({ cardCode: cardCode.toUpperCase().trim() }).populate(
    'user'
  );

  if (!credential) {
    return createDeniedLog({
      accessPoint,
      direction,
      source,
      cardCode,
      reason: 'Credencial no registrada',
      metadata,
    });
  }

  if (!credential.active) {
    return createDeniedLog({
      accessPoint,
      direction,
      source,
      cardCode,
      reason: 'Credencial inactiva',
      credential,
      user: credential.user,
      metadata,
    });
  }

  if (credential.expiresAt && credential.expiresAt < new Date()) {
    return createDeniedLog({
      accessPoint,
      direction,
      source,
      cardCode,
      reason: 'Credencial expirada',
      credential,
      user: credential.user,
      metadata,
    });
  }

  const user = credential.user;
  if (!user || !user.active) {
    return createDeniedLog({
      accessPoint,
      direction,
      source,
      cardCode,
      reason: 'Usuario inactivo o inexistente',
      credential,
      user,
      metadata,
    });
  }

  if (!accessPoint.allowedRoles.includes(user.role)) {
    return createDeniedLog({
      accessPoint,
      direction,
      source,
      cardCode,
      reason: `Rol "${user.role}" no autorizado en este punto`,
      credential,
      user,
      metadata,
    });
  }

  const log = await AccessLog.create({
    user: user._id,
    credential: credential._id,
    accessPoint: accessPoint._id,
    direction,
    result: 'granted',
    reason: 'Acceso concedido',
    cardCodeAttempt: cardCode.toUpperCase().trim(),
    source,
    metadata,
  });

  await log.populate([
    { path: 'user' },
    { path: 'credential' },
    { path: 'accessPoint' },
  ]);

  return {
    granted: true,
    log: log.toSafeJSON(),
  };
}

async function createDeniedLog({
  accessPoint,
  direction,
  source,
  cardCode,
  reason,
  credential = null,
  user = null,
  metadata = {},
}) {
  const log = await AccessLog.create({
    user: user?._id || null,
    credential: credential?._id || null,
    accessPoint: accessPoint._id,
    direction,
    result: 'denied',
    reason,
    cardCodeAttempt: String(cardCode || '').toUpperCase().trim(),
    source,
    metadata,
  });

  await log.populate([
    { path: 'user' },
    { path: 'credential' },
    { path: 'accessPoint' },
  ]);

  return {
    granted: false,
    log: log.toSafeJSON(),
  };
}
