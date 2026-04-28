# Stage 1: Build the React application
FROM node:20-slim AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the app
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
# Copy the build output from the first stage to Nginx's public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (Cloud Run's default)
EXPOSE 8080

# Configure Nginx to listen on port 8080 and handle SPA routing
RUN sed -i 's/listen\(.*\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

# Overwrite default nginx config to handle React Router (SPA) fallback
RUN echo 'server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
