# Use the official Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your app (IMPORTANT: this includes server.js AND the public folder)
COPY . .

# EasyPanel port
EXPOSE 3000

# Start the application
CMD [ "node", "server.js" ]
