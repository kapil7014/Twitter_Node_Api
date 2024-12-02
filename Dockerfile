FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
ENV PORT: 5000 \
    CallBackUrl: http://localhost:4200/auth/login \
    TwitterApiUrl: https://api.twitter.com/ \
    TwitterAuthorizeUrl: https://twitter.com/i/oauth2/authorize \
    TwitterScopes: tweet.read users.read follows.read follows.write offline.access \
    ClientKeyId:  \
    ClientSecretKey:  \
    API_Key: pocTwitterDynamoDb@2022
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 5050
RUN chown -R node /usr/src/app
USER node
CMD ["node", "index.js"]