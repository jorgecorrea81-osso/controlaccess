# Guía rápida de publicación

## Por qué 2 plataformas

| Pieza | Plataforma | Motivo |
|-------|------------|--------|
| Frontend Svelte | **Vercel** | Ideal para SPA/estáticos |
| Backend Express + Socket.IO | **Render** (u otro Node 24/7) | Los móviles necesitan WebSockets persistentes; Vercel Serverless no los mantiene |

El repo es **un solo monorepo**; Vercel y Render apuntan al mismo GitHub.

---

## Paso A — Backend (Render)

1. Push del repo a GitHub  
2. [Render](https://dashboard.render.com) → New → Blueprint → `render.yaml`  
3. Variables:
   - `MONGODB_URI` = tu connection string de Atlas  
   - `CLIENT_URL` = `https://TU-PROYECTO.vercel.app` (la pondrás tras el paso B; puedes usar `*` en `CORS_ORIGINS` mientras tanto)  
   - `CORS_ORIGINS` = `*`  
   - `JWT_SECRET` = (Render puede generarlo)  
4. Atlas → Network Access → permite `0.0.0.0/0`  
5. Cuando el servicio esté live, prueba:  
   `https://TU-API.onrender.com/api/health`  
6. Siembra: en local con el mismo `MONGODB_URI` → `npm run seed`

## Paso B — Frontend (Vercel)

El error **"404 NOT_FOUND / This page doesn't exist"** casi siempre es porque Vercel no encuentra `apps/web/dist`.

### Ajustes obligatorios en el proyecto Vercel

Settings → General:

| Campo | Valor |
|-------|--------|
| **Root Directory** | `.` (raíz del repo, **vacío** / no pongas `apps/web`) |
| **Framework Preset** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `apps/web/dist` |
| **Install Command** | `npm install` |

1. Redeploy (Deployments → … → Redeploy)  
2. Environment Variables:

```
VITE_API_URL=https://TU-API.onrender.com/api
VITE_SOCKET_URL=https://TU-API.onrender.com
```

3. En el log de build debe aparecer `vite build` y archivos en `apps/web/dist`  
4. Copia la URL de Vercel y actualiza en Render `CLIENT_URL` (opcional si `CORS_ORIGINS=*`)

> Si en Root Directory pusiste `apps/web`, cámbialo a la raíz del monorepo o Vercel buscará mal la salida y verás 404.

## Móvil

Apunta Flutter a la URL del **backend** (Render), no a Vercel:

- REST: `https://TU-API.onrender.com/api/...`
- Socket.IO: mismo host, path `/socket.io`, auth `{ deviceKey }` o `{ token }`

## Checklist

- [ ] `/api/health` responde `ok: true`  
- [ ] Login web funciona contra la API pública  
- [ ] Socket conecta (panel muestra “conectado”)  
- [ ] Simulador mueve un device y dispara geocercas  
