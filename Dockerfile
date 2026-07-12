FROM node:20-alpine

WORKDIR /app

# Build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 py3-setuptools make g++

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p public/uploads/templates data

EXPOSE 8081

# Start the app directly. better-sqlite3 writes every change to disk immediately.
# Run `docker exec <container> node seed.js` once for initial demo data.
CMD ["node", "app.js"]
