FROM node:22-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend ./
RUN npm run build

FROM node:22-alpine AS backend-prod-deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev

FROM node:22-alpine AS cms-build
WORKDIR /app
ARG VITE_API_URL=/api
ARG VITE_BASE_PATH=/admin/
ARG VITE_LANDING_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_LANDING_URL=$VITE_LANDING_URL
COPY cms/package*.json ./
RUN npm install
COPY cms ./
RUN npm run build

FROM node:22-alpine AS landing-deps
WORKDIR /app
COPY landing/package*.json ./
RUN npm install

FROM node:22-alpine AS landing-build
WORKDIR /app
ARG LANDING_API_URL=http://127.0.0.1:9998/api
ARG NEXT_PUBLIC_API_URL=/api
ENV LANDING_API_URL=$LANDING_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=landing-deps /app/node_modules ./node_modules
COPY landing ./
RUN npm run build

# Development targets keep each app's dependencies in the image.  Source code
# is mounted by docker-compose.dev.yml, while the node_modules directories are
# preserved in named volumes for fast hot reloads.
FROM node:22-alpine AS backend-dev
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend ./
CMD ["npm", "run", "start:dev"]

FROM node:22-alpine AS cms-dev
WORKDIR /app/cms
COPY cms/package*.json ./
RUN npm install
COPY cms ./
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "9999"]

FROM node:22-alpine AS landing-dev
WORKDIR /app/landing
COPY landing/package*.json ./
RUN npm install
COPY landing ./
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "9997"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache tini

COPY docker/runtime-package.json /opt/runtime/package.json
RUN cd /opt/runtime && npm install

COPY --from=backend-prod-deps /app/node_modules ./backend/node_modules
COPY --from=backend-build /app/package*.json ./backend/
COPY --from=backend-build /app/dist ./backend/dist
COPY --from=backend-build /app/src/locations/vietnam-admin-v2.json ./backend/dist/locations/vietnam-admin-v2.json
COPY --from=backend-build /app/src/locations/countries.json ./backend/dist/locations/countries.json
COPY --from=backend-build /app/storage ./backend/storage

COPY --from=cms-build /app/dist ./cms-dist

COPY --from=landing-build /app/.next/standalone ./landing/
COPY --from=landing-build /app/.next/static ./landing/.next/static
RUN mkdir -p ./landing/public

COPY docker ./docker

EXPOSE 9997 9998 9999

CMD ["tini", "--", "/opt/runtime/node_modules/.bin/pm2-runtime", "/app/docker/ecosystem.config.cjs"]
