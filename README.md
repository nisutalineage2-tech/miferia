# TuFerIA

Plataforma de tiendas online multi-template con panel de administracion completo.

## Stack

- Backend: Node.js + Express + EJS
- Base de datos: SQLite (better-sqlite3)
- Frontend: Tailwind CSS CDN + vanilla JS
- Infra: Docker

## Quick Start

docker build -t tuferia .
docker run -d --name tuferia -p 8081:8081 -v tuferia_data:/app/data tuferia
docker exec tuferia node seed.js

## Acceso

Admin: http://localhost:8081/auth/login (tienda001@tienda001.com.ar / tienda001)
Tienda: http://localhost:8081/sportzone

## Estructura

app.js              - Entry point
routes/             - Express routers
  auth.js           - Login/registro
  dashboard.js      - Panel admin
  storefront.js     - Tienda publica
  customer.js       - Clientes
  api.js            - API endpoints
views/dashboard/    - Panel admin
views/storefront/   - 30 templates
views/partials/     - Componentes reutilizables
config/db.js        - Conexion SQLite
Dockerfile
seed.js             - Seed data

## Features

- 30 templates responsive con menu hamburguesa mobile
- Editor visual con preview en vivo y selector de secciones
- CRUD de productos, categorias, combos
- Gestion de pedidos
- Carrusel hero, filtros, carrito, suscripciones
- Temas persistentes (colores, fuentes, header)
