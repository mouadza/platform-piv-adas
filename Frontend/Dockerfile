FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/
ARG NPM_CONFIG_STRICT_SSL=false
ENV VITE_API_URL=$VITE_API_URL
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_STRICT_SSL=$NPM_CONFIG_STRICT_SSL \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
