FROM node:14

WORKDIR /usr/src/app

# Step 1 for faster cached layers
COPY package*.json ./

RUN npm install

# Now we grab the rest
COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]
