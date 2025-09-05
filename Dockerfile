# -------------------------------
# 1. Base image
# -------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# -------------------------------
# 2. Build stage
# -------------------------------
FROM base AS build

# Copy package files first (better caching)
COPY package*.json ./
COPY vite.config.ts ./

# Install ALL deps (including dev)
RUN npm install

# Copy rest of the code
COPY . .

# Set Railway VITE variables as build ENV
ARG VITE_AUTH_AUTHORITY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_CLIENT_SECRET
ARG VITE_GOOGLE_REDIRECT_URI
ARG VITE_GOOGLE_RESPONSE_TYPE
ARG VITE_GOOGLE_SCOPE

ENV VITE_AUTH_AUTHORITY=$VITE_AUTH_AUTHORITY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_SECRET=$VITE_GOOGLE_CLIENT_SECRET
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI
ENV VITE_GOOGLE_RESPONSE_TYPE=$VITE_GOOGLE_RESPONSE_TYPE
ENV VITE_GOOGLE_SCOPE=$VITE_GOOGLE_SCOPE

# Build client (Vite) → dist/public
RUN npm run build:client

# Build server (tsc/esbuild) → dist/server.js
RUN npm run build:server

# -------------------------------
# 3. Runtime stage
# -------------------------------
FROM base AS runtime

ENV NODE_ENV=production

# Copy only package files first (for caching)
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist

# Default port
EXPOSE 5000

CMD ["npm", "start"]
