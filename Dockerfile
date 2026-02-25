FROM node:22 AS builder
WORKDIR /usr/src/app
COPY . .
ENV VITE_RETRO_API_BASE_URL=http://5.129.220.111:3000
RUN npm ci
RUN npm run build

FROM nginx:1.14.1-alpine
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]