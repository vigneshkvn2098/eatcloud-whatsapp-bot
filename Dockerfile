# Use official Node.js LTS (Long Term Support) image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for development)
RUN npm install

# Install nodemon globally for hot-reloading during development
RUN npm install -g nodemon

# Copy application source code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with nodemon for auto-restart on file changes
CMD ["nodemon", "server.js"]