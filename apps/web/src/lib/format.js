export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export function roleLabel(role) {
  const map = { admin: 'Admin', guard: 'Operador', employee: 'Campo' };
  return map[role] || role;
}

export function eventTypeLabel(type) {
  return type === 'enter' ? 'Entró' : 'Salió';
}
