# Render Deployment Guide

## Overview
This guide explains how to deploy MercoTrace to Render with proper configuration for the production environment.

## Fixed Issues
- **Root Cause**: The `application-prod.yml` contained hardcoded `localhost` connections that fail in containerized environments
- **Solution**: Configuration now uses environment variables with sensible defaults

## Required Environment Variables

### Database Configuration (REQUIRED - Use JDBC Format)
⚠️ **Important**: Use the JDBC format for DATABASE_URL, not the standard PostgreSQL URI format.

```
DATABASE_URL=jdbc:postgresql://[host]:[port]/[database]
DATABASE_USER=your_database_user
DATABASE_PASSWORD=your_database_password
DATABASE_POOL_SIZE=10
```

**Example for Render PostgreSQL:**
```
DATABASE_URL=jdbc:postgresql://dpg-12345abc.oregon-postgres.render.com:5432/mercotrace_db
DATABASE_USER=user123
DATABASE_PASSWORD=mypassword
DATABASE_POOL_SIZE=10
```

ℹ️ **Note**: If Render gives you a connection string like `postgresql://user:pass@host/db`, convert it to JDBC format:
- **Render format**: `postgresql://user123:pass@dpg-abc.render.com:5432/mercotrace`
- **JDBC format for Java**: `jdbc:postgresql://dpg-abc.render.com:5432/mercotrace`
- Then set `DATABASE_USER` and `DATABASE_PASSWORD` separately

### Security Configuration
```
JHIPSTER_SECURITY_AUTHENTICATION_JWT_BASE64_SECRET=[generate-a-new-secret]
```

**To generate a secure JWT secret:**
```bash
openssl rand -base64 64
```

### Mail Configuration (Optional)
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
JHIPSTER_MAIL_BASE_URL=https://your-mercotrace-domain.com
```

### Application Configuration
```
SPRING_PROFILES_ACTIVE=prod
APPLICATION_CACHE_REDIS_ENABLED=false
SPRING_CACHE_TYPE=simple
```

## Deployment Steps on Render

1. **Create a PostgreSQL Database Service**
   - Go to Dashboard → New → PostgreSQL
   - Note the connection details from the database service page

2. **Convert Connection String to JDBC Format**
   - Render provides a connection string like:
     ```
     postgresql://user123:password@dpg-abc.render.com:5432/mercotrace_db
     ```
   - Extract the components:
     - **Host & Port**: `dpg-abc.render.com:5432`
     - **Database**: `mercotrace_db`
     - **User**: `user123`
     - **Password**: `password` (if shown)
   - Create JDBC URL:
     ```
     jdbc:postgresql://dpg-abc.render.com:5432/mercotrace_db
     ```

3. **Deploy the Application**
   - Connect your GitHub repository
   - Select `Dockerfile` as the build method
   - Set the following environment variables in Render dashboard:

4. **Set Environment Variables in Render**
   - Go to your service → Environment
   - Add these variables (replace with your actual values):
     - `DATABASE_URL`: `jdbc:postgresql://your-host:5432/your-db`
     - `DATABASE_USER`: Your PostgreSQL username
     - `DATABASE_PASSWORD`: Your PostgreSQL password
     - `JHIPSTER_SECURITY_AUTHENTICATION_JWT_BASE64_SECRET`: [Generate new]
     - `JHIPSTER_MAIL_BASE_URL`: `https://your-app.render.com`

5. **Deploy**
   - Render will automatically build the Docker image and deploy

## Verifying the Deployment

### Check Application Logs
```bash
curl https://your-app.render.com/health
```

Expected response:
```json
{
  "status": "UP"
}
```

### Common Issues

#### Issue: Cannot connect to database
- **Check**: Verify `DATABASE_URL` is correct
- **Solution**: Ensure PostgreSQL service is running on Render

#### Issue: Application timeout
- **Check**: Review application logs for specific errors
- **Solution**: Run with `SPRING_PROFILES_ACTIVE=prod,debug` to see detailed output

#### Issue: Static files not served
- **Check**: Frontend build succeeded during Docker build
- **Solution**: Verify `npm run build` completes successfully in the client build stage

## Docker Build Details

The Dockerfile uses a multi-stage build:
1. **Stage 1**: Build React client (`npm run build`)
2. **Stage 2**: Build Java backend (`mvn clean package`)
3. **Stage 3**: Runtime image with both backend JAR and frontend static files

## Security Considerations

- **Change the JWT secret** before deploying to production
- **Use strong database credentials**
- **Enable HTTPS** (Render provides free SSL)
- **Configure CORS** in `application-prod.yml` with your domain
- **Use environment variables** for all sensitive data (never commit secrets)

## Local Development with Docker

To test locally with Docker Compose:

```bash
docker-compose up
```

Ensure your `.env` file includes:
```
DATABASE_URL=jdbc:postgresql://postgres:5432/mercotrace
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

## Support

For issues:
1. Check application logs: `tail -f /var/log/app.log`
2. Run with debug enabled: Set `SPRING_PROFILES_ACTIVE=prod,debug`
3. Check database connectivity
4. Verify all environment variables are set correctly
