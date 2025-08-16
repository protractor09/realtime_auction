# Stage 2: Build the Express backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY ./backend/package*.json ./
RUN npm install
COPY ./backend .

# Stage 3: Create the final production image
FROM node:18-alpine
WORKDIR /app

# Copy the built frontend from Stage 1
COPY --from=frontend-build /app/build ./frontend/build

# Copy the backend code and node_modules from Stage 2
COPY --from=backend-build /app ./backend

# Expose the port your Express app listens on
EXPOSE 3000

# Set the command to start the Express server
CMD ["node", "./backend/server.js"]