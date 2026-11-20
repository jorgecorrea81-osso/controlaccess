# Control Accesos — monorepo (tracking + geocercas)

| App | Tecnología | Dónde se publica |
|-----|------------|------------------|
| `apps/web` | Svelte + Leaflet | **Vercel** |
| `apps/server` | Express + Socket.IO | **Render / Railway / Fly** (WebSockets) |
| Datos | MongoDB Atlas | Cloud |

> **Importante:** Vercel no mantiene conexiones Socket.IO persistentes.  
> El **frontend** va a Vercel; el **backend** (REST + sockets para móvil) a un servicio Node 24/7.

## Estructura

```
controlaccesos/
├── apps/
│   ├── web/       # Panel Leaflet (Vercel)
│   └── server/    # API + Socket.IO (Render/Docker)
├── vercel.json
├── render.yaml
└── package.json   # npm workspaces
```

## Desarrollo local

```bash
npm install
npm run seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000/api/health  

Login demo: `admin@controlaccesos.local` / `admin123`

## 1) Publicar el backend (obligatorio para móvil)

Socket.IO y la API deben ser públicos (HTTPS).

### Opción rápida: Render

1. Sube el repo a GitHub
2. En [Render](https://render.com) → New → Blueprint → selecciona `render.yaml`
3. Configura variables:
   - `MONGODB_URI` — Atlas (Network Access: `0.0.0.0/0`)
   - `CLIENT_URL` — URL de Vercel (ej. `https://tu-app.vercel.app`)
   - `CORS_ORIGINS` — `*` (móvil + web) o lista de orígenes
   - `JWT_SECRET` — secreto fuerte
4. Tras el deploy, anota la URL: `https://controlaccesos-api.onrender.com`
5. Siembra datos (shell de Render o local apuntando a Atlas):

```bash
npm run seed
```

### Docker local / otro host

```bash
docker build -f apps/server/Dockerfile -t controlaccesos-api .
docker run -p 4000:4000 --env-file .env controlaccesos-api
```

## 2) Publicar el frontend en Vercel

1. Importa el **mismo monorepo** en [Vercel](https://vercel.com)
2. Framework: Vite (ya definido en `vercel.json`)
3. Variables de entorno **de build**:

| Variable | Ejemplo |
|----------|---------|
| `VITE_API_URL` | `https://controlaccesos-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://controlaccesos-api.onrender.com` |

4. Deploy

El panel web hablará con tu API pública; Flutter usará la misma base.

## Móvil (Flutter) — contrato listo

Base: `https://TU-API...`

- REST: `POST /api/auth/login`, `GET /api/devices`, etc.
- Socket.IO path: `/socket.io`
- Auth socket: `{ deviceKey: "DEV-ANA-001" }` o `{ token: "<JWT>" }`
- Emit: `device:location` `{ deviceKey, lat, lng }`
- Escuchar (monitores): `device:moved`, `geofence:event`

## Variables backend

Ver `.env.example`. Claves relevantes:

- `CORS_ORIGINS=*` — permite web Vercel + apps móviles
- `HOST=0.0.0.0` — escucha en red (contenedores)
- `CLIENT_URL` — URL del front en Vercel

## Scripts

```bash
npm run dev          # local API + web
npm run build        # build Svelte (Vercel)
npm run start        # API producción
npm run seed         # datos demo
```
