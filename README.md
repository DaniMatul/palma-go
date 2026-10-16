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
npm run dev
```

El backend queda disponible en `http://localhost:3000` y expone `GET /api/health`.
