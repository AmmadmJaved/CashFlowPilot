# ExpenseShare - Vercel Deployment Guide

## Overview
This guide helps you deploy ExpenseShare to Vercel with PWA support and proper configuration.

## Prerequisites
1. Vercel CLI installed (`npm i -g vercel`)
2. PostgreSQL database (Neon, Supabase, or Vercel Postgres)
3. Environment variables configured

## Environment Variables
Set these in Vercel dashboard or `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-username
PGPASSWORD=your-password
PGDATABASE=your-database

# Session (generate a secure random string)
SESSION_SECRET=your-super-secret-session-key

# Replit specific (for OAuth - optional)
REPLIT_DOMAINS=your-domain.vercel.app
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id

# SendGrid (optional)
SENDGRID_API_KEY=your-sendgrid-key

# Environment
NODE_ENV=production
```

## Deployment Steps

### 1. Prepare Your Database
```bash
# Push schema to your database
npm run db:push
```

### 2. Build Configuration
The project includes:
- `vercel.json` - Vercel configuration
- `api/index.ts` - Serverless function wrapper
- PWA configuration in `public/manifest.json`
- Service Worker at `public/sw.js`

### 3. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 4. Configure Environment Variables
In Vercel Dashboard:
1. Go to your project settings
2. Add all environment variables from above
3. Redeploy

## PWA Features

### Installation
- Install banner appears automatically on mobile/desktop
- Users can install from browser menu
- App works offline with cached data

### Service Worker Features
- Caches static assets and API responses
- Offline functionality for cached content
- Background sync for data when back online
- Push notification support (ready for implementation)

### Icons
Generate PWA icons in these sizes and place in `public/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Manifest Configuration
The `manifest.json` includes:
- App name and description
- Display mode (standalone)
- Theme colors
- Icon definitions
- Categories and features

## Vercel-Specific Fixes

### 1. Package.json Scripts
The build process is handled by Vercel automatically. The existing scripts work:
- `dev` - Development server
- `build` - Production build (handled by Vercel)
- `db:push` - Database schema push

### 2. Static File Serving
Vercel serves static files from the `dist` directory after build.

### 3. API Routes
All API routes are handled through the serverless function at `api/index.ts`.

### 4. WebSocket Support
WebSocket connections work through the same serverless function with proper routing.

## Testing

### Local Testing
```bash
# Test PWA locally
npm run dev
# Open Chrome DevTools > Application > Manifest
# Check Service Worker registration
```

### Production Testing
1. Deploy to Vercel
2. Test installation on mobile/desktop
3. Test offline functionality
4. Verify all API endpoints work

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Check TypeScript errors
   - Verify all imports are correct
   - Ensure environment variables are set

2. **Database Connection**
   - Verify DATABASE_URL format
   - Check firewall settings
   - Test connection locally first

3. **PWA Not Installing**
   - Check manifest.json syntax
   - Verify HTTPS (required for PWA)
   - Check browser console for errors

4. **Service Worker Issues**
   - Clear browser cache
   - Check sw.js for errors
   - Verify registration in DevTools

### Performance Optimization
- Static assets are cached by service worker
- API responses cached for offline access
- Lazy loading for better initial load
- Optimized bundle size with tree shaking

## Security Considerations
- All sensitive data in environment variables
- Session secrets properly configured
- HTTPS enforced in production
- CORS properly configured for your domain

## Monitoring
- Check Vercel Analytics for usage stats
- Monitor error logs in Vercel dashboard
- Set up alerts for downtime or errors

## Next Steps After Deployment
1. Test all functionality thoroughly
2. Configure custom domain if needed
3. Set up monitoring and alerts
4. Share install link with users
5. Monitor PWA adoption metrics