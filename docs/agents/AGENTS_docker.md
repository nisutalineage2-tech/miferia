# AGENTS - Docker / Deployment

## Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 py3-setuptools make g++

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p public/uploads/templates data

EXPOSE 8081

CMD ["node", "app.js"]
```

### Notas
- **Node 20 Alpine** - imagen ligera (~180MB)
- **python3, make, g++** - necesarios para compilar `better-sqlite3` (libreria nativa C++)
- **Puerto 8081** - expuesto
- **Directorios creados:** `public/uploads/templates` y `data`

---

## docker-compose.yml

```yaml
services:
  tuferia:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tuferia
    ports:
      - "8081:8081"
    restart: unless-stopped
    volumes:
      - ./tuferia_data:/app/data
      - ./tuferia_uploads:/app/public/uploads

volumes:
  tuferia_data:
  tuferia_uploads:
```

### Volumes

| Host | Container | Contenido |
|---|---|---|
| `./tuferia_data` | `/app/data` | Base de datos SQLite (`tuferia.db`) |
| `./tuferia_uploads` | `/app/public/uploads` | Imagenes subidas por usuarios |

> **Importante:** Los volumes en el host garantizan persistencia de datos al recrear el container.

---

## Comandos Utiles

### Iniciar
```bash
# Build y levantar en background
docker compose up -d --build

# Ver logs en tiempo real
docker compose logs -f tuferia

# Ver logs de las ultimas 100 lineas
docker compose logs --tail 100 tuferia
```

### Detener
```bash
# Detener (mantiene containers)
docker compose stop

# Detener y eliminar containers
docker compose down

# Detener, eliminar y limpiar volumes (BORRA DATOS)
docker compose down -v
```

### Ejecutar comandos
```bash
# Cargar datos demo
docker exec tuferia node seed.js

# Cargar tienda secundaria
docker exec tuferia node seed_tienda001.js

# Asignar imagenes placeholder
docker exec tuferia node add_images.js

# Shell dentro del container
docker exec -it tuferia sh

# Ver tamano de la base de datos
docker exec tuferia ls -lh /app/data/

# Backup de la base de datos
docker cp tuferia:/app/data/tuferia.db ./backup_tuferia.db
```

### Reconstruir
```bash
# Reconstruir despues de cambios en codigo
docker compose up -d --build

# Forzar rebuild sin cache
docker compose build --no-cache && docker compose up -d
```

---

## Persistencia de Datos

### Estructura en el host
```
tuferia/
├── tuferia_data/          # Montado en /app/data
│   └── tuferia.db         # Base de datos SQLite
└── tuferia_uploads/       # Montado en /app/public/uploads
    ├── {uuid}.jpg         # Imagenes subidas
    ├── {uuid}.png
    └── ...
```

### Backup
```bash
# Backup completo
tar -czf tuferia_backup_$(date +%Y%m%d).tar.gz tuferia_data/ tuferia_uploads/

# Solo base de datos
cp tuferia_data/tuferia.db ./backup_$(date +%Y%m%d).db
```

### Restore
```bash
# Restore base de datos
cp ./backup_20240101.db tuferia_data/tuferia.db
docker compose restart tuferia
```

---

## Produccion

### Pre-requisitos
- Docker 20.10+
- Docker Compose v2
- Dominio con SSL (usar nginx/caddy como reverse proxy)

### Configuracion recomendada
```yaml
# docker-compose.prod.yml
services:
  tuferia:
    build: .
    restart: always
    ports:
      - "127.0.0.1:8081:8081"  # Solo local, reverse proxy encima
    volumes:
      - /data/tuferia/db:/app/data
      - /data/tuferia/uploads:/app/public/uploads
    environment:
      - NODE_ENV=production
```

### Reverse Proxy (nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name tuferia.com;

    ssl_certificate /etc/letsencrypt/live/tuferia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tuferia.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
```

### Seguridad en Produccion
1. **Cambiar secret de sesion** en `app.js:22` (usar variable de entorno)
2. **HTTPS** obligatorio via reverse proxy
3. **Backups automaticos** de `tuferia_data/` y `tuferia_uploads/`
4. **Monitoreo** de tamano de BD y espacio en disco
5. **Rate limiting** (no implementado actualmente)

---

## Troubleshooting

### Container no inicia
```bash
docker compose logs tuferia
# Verificar que el puerto 8081 no este en uso
lsof -i :8081
```

### Error de better-sqlite3
```bash
# Reconstruir con dependencias nativas
docker compose build --no-cache
```

### Base de datos corrupta
```bash
# Restaurar desde backup
cp ./backup_tuferia.db tuferia_data/tuferia.db
docker compose restart tuferia
```

### Uploads no persisten
```bash
# Verificar que el volume este montado correctamente
docker inspect tuferia | grep -A 5 "Mounts"
```

### Container ocupa mucho disco
```bash
# Limpiar imagenes Docker no usadas
docker system prune -a
```
