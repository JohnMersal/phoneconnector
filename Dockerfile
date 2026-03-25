# Use the official Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your app (server.js and /public folder)
COPY . .

# EasyPanel will use this port
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]
