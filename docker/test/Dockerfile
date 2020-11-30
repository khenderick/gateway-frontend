FROM node:11.9.0

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

RUN npm install jest jest-junit

ENV PATH="/app/node_modules/.bin:${PATH}"
