# Control Accesos (monorepo)

Tracking GPS + geocercas. **Todo en Vercel** (web + API HTTP).

| Pieza | Tecnología | Host |
|-------|------------|------|
| Web | Svelte + Leaflet | Vercel |
| API | Express serverless (`/api`) | Vercel |
| Móvil | Flutter GPS → HTTP | APK |
| Datos | MongoDB Atlas | Cloud |

> Sin Socket.IO en producción Vercel. El panel hace polling HTTP cada 2s.

## Local

```bash
npm install
npm run seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:4000/api/health  

## Vercel

Ver `DEPLOY.md`. Variables mínimas: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS=*`.

Desactiva **Deployment Protection** para que Flutter pueda llamar a `/api`.

## Flutter

URL = tu dominio Vercel:

`https://TU-APP.vercel.app`

APK de prueba: `apps/mobile/dist/controlaccesos-mobile.apk`
