# CMMS Simulator

Simulador CMMS local construido con Next.js, TypeScript, Tailwind CSS, Prisma y SQLite.

## Requisitos

- Node.js 20+
- npm 10+

## Primer arranque

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run db:push
npm run prisma:seed
npm run dev
```

## Credenciales demo

- `admin@cmms.local` / `admin123`
- `tech@cmms.local` / `tech123`

## Estado actual

Esta primera base incluye:

- estructura App Router
- layout shell con sidebar y topbar
- login simulado con `localStorage`
- i18n interno `es/en`
- esquema Prisma para modulos CMMS
- seed con activos, tecnicos, OTs, PMs y refacciones
