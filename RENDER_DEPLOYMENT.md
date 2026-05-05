# Render Deployment Guide

## Overview
This guide explains how to deploy MercoTrace to Render with proper configuration for the production environment.

## Fixed Issues
- **Root Cause**: The `application-prod.yml` contained hardcoded `localhost` connections that fail in containerized environments
- **Solution**: Configuration now uses environment variables with sensible defaults

## Required Environment Variables

### Database Configuration
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_USER=your_database_user
DATABASE_PASSWORD=your_database_password
DATABASE_POOL_SIZE=10
```

**Example for Render PostgreSQL:**
```
DATABASE_URL=postgresql://user123:mypassword@dpg-12345.render.com:5432/mercotrace_db
DATABASE_USER=user123
DATABASE_PASSWORD=mypassword
```

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
   - Note the connection details

2. **Deploy the Application**
   - Connect your GitHub repository
   - Select `Dockerfile` as the build method
   - Set the following environment variables in Render dashboard:

3. **Set Environment Variables**
   - Go to your service → Environment
   - Add all required variables from the section above
   - Make sure `DATABASE_URL` matches your PostgreSQL service

4. **Deploy**
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
