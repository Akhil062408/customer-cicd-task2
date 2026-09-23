FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY server.js .
COPY test.js .

EXPOSE 8080

USER node

CMD ["node", "server.js"]