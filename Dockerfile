FROM node:22-alpine as build

RUN apk add curl bash build-base librdkafka-dev python3
RUN curl -sfL https://gobinaries.com/tj/node-prune | bash -s -- -b /usr/local/bin

WORKDIR /app

COPY package.json yarn.lock ./

RUN npm config set strict-ssl=false

RUN yarn

COPY . .

RUN yarn build

# run node prune
RUN /usr/local/bin/node-prune

# remove unused dependencies
RUN rm -rf node_modules/rxjs/src/
RUN rm -rf node_modules/rxjs/bundles/
RUN rm -rf node_modules/rxjs/_esm5/
RUN rm -rf node_modules/rxjs/_esm2015/

FROM node:22-alpine AS deploy
RUN apk add --no-cache librdkafka
WORKDIR /app

COPY --from=build /app/package*.json /app/
COPY --from=build /app/yarn.lock /app/
COPY --from=build /app/dist/ /app/dist/
COPY --from=build /app/node_modules/ /app/node_modules/
COPY config.yml /app/config.yml
COPY public /app/public

CMD [ "node", "dist/main.js" ]
