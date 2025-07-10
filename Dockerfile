FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production


COPY dist ./dist
COPY .env ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the bot
CMD ["node", "dist/index.js"]