#Estapa 1: build
FROM node:24.14.1-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN ls -la /app/dist
RUN ls -la /app/dist/botica_frontend
RUN ls -la /app/dist/botica_frontend/browser

#Etapa 2: Costruccion de la imagen final
#EXPOSE 4200
#CMD ["npm", "start"]

# Etapa 2: servidor web
FROM nginx:alpine

WORKDIR /app

COPY --from=build /app/dist/botica_frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]