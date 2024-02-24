FROM node:21.5.0

WORKDIR /reactApp

COPY src ./src

COPY index.html .

COPY package.json .

RUN npm install

ENTRYPOINT [ "npm", "run", "prod" ]