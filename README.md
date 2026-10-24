# Palma GO

Base de una aplicación web local para un comedor.

## Estructura

- `client/`: frontend con React, Vite, TypeScript y MUI.
- `server/`: backend con Express, TypeScript, Prisma y SQLite.

## Puesta en marcha

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

El backend queda disponible en `http://localhost:3000` y expone `GET /api/health`.

### Orden recomendado

Mantén el backend ejecutándose en una terminal y el frontend en otra. Antes de abrir la aplicación, verifica la conexión:

```bash
curl http://localhost:3000/api/health
```

La respuesta esperada es:

```json
{"status":"ok"}
```

Las vistas `Menú`, `Nuevo pedido` y `Pedidos` consultan la API al abrirse. Si el backend no está ejecutándose, la interfaz mostrará un mensaje de conexión en lugar del error genérico del navegador.
