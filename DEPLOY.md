# Despliegue todo en Vercel (HTTP, sin Render)

Web + API viven en el **mismo proyecto Vercel**.  
No hay Socket.IO: Flutter y el panel usan **HTTP** (polling cada 2s en web).

## 1) Variables de entorno en Vercel

Project → Settings → Environment Variables:

| Variable | Valor |
|----------|--------|
| `MONGODB_URI` | tu connection string Atlas |
| `JWT_SECRET` | secreto largo |
| `CORS_ORIGINS` | `*` |
| `CLIENT_URL` | `https://TU-PROYECTO.vercel.app` |
| `NODE_ENV` | `production` |

Opcional (web ya usa `/api` del mismo dominio):

| `VITE_API_URL` | `/api` |

## 2) Protección de deployment (importante para Flutter)

Si ves login de Vercel al abrir la URL:

Settings → Deployment Protection → **desactiva** Protection para Production  
(o el móvil no podrá llamar a `/api`).

## 3) Settings de build

| Campo | Valor |
|-------|--------|
| Root Directory | vacío (raíz) |
| Framework | Other |
| Build Command | `npm run build` |
| Output Directory | `apps/web/dist` |
| Install Command | `npm install` |

## 4) Probar API

Tras el deploy:

`https://TU-PROYECTO.vercel.app/api/health`

Debe devolver `{ "ok": true, "transport": "http" }`.

## 5) Seed (una vez)

En local, con el mismo `MONGODB_URI`:

```bash
npm run seed
```

## 6) Flutter

URL en la app = la de Vercel (sin `/api` al final):

`https://TU-PROYECTO.vercel.app`

Endpoints usados:

- `POST /api/devices/register`
- `POST /api/devices/location` `{ deviceKey, lat, lng }`

## Flujo

```
Flutter GPS → POST /api/devices/location → MongoDB
Panel web   → GET /api/devices + /api/geofences/events cada 2s
```
