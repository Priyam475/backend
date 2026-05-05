# Stage 1: Build the React client
FROM node:21-alpine AS client-builder
WORKDIR /app/client

# Copy client files
COPY client/package*.json ./
COPY client/bun.lockb ./

# Install dependencies and build
RUN npm install --legacy-peer-deps || npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the Java backend
FROM maven:3.9.4-eclipse-temurin-21 AS server-builder
WORKDIR /app/server

# Copy server files
COPY server/pom.xml ./
COPY server/src ./src
COPY server/sonar-project.properties ./

# Build the application
# Skip heavyweight quality gates in container builds; these should run in CI.
RUN mvn clean package -Dmaven.test.skip=true -Denforcer.skip=true -Dcheckstyle.skip=true -Dspotless.check.skip=true -Dmodernizer.skip=true

# Stage 3: Runtime image
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Runtime defaults for container deployments:
# - use prod profile
# - disable Redis-backed cache unless explicitly enabled
ENV SPRING_PROFILES_ACTIVE=prod
ENV APPLICATION_CACHE_REDIS_ENABLED=false
ENV SPRING_CACHE_TYPE=simple

# Copy built backend JAR
COPY --from=server-builder /app/server/target/*.jar app.jar

# Copy built frontend to be served by the backend
COPY --from=client-builder /app/client/dist ./static

# Expose port (adjust as needed)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
