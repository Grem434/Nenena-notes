# Nenena Notes Web – Servir build local
FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
