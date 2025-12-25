# Pre-Deployment Checklist

Use this checklist before deploying to Vercel to ensure everything is ready.

## Code Quality

- [ ] All code is committed to Git
- [ ] No console.log statements in production code (or remove them)
- [ ] No hardcoded API URLs (use environment variables)
- [ ] No sensitive data in code (API keys, passwords, etc.)
- [ ] All TypeScript/ESLint errors are resolved
- [ ] Code is properly formatted

## Build & Test

- [ ] `npm run build` completes successfully
- [ ] `npm run lint` passes without errors
- [ ] Local development server runs without errors
- [ ] All pages are accessible and functional
- [ ] No 404 errors on routes

## Environment Variables

- [ ] `.env.local` file exists for local development
- [ ] `.env.example` documents all required variables
- [ ] All `NEXT_PUBLIC_*` variables are documented
- [ ] No `.env` files are committed to Git (check `.gitignore`)

## API Configuration

- [ ] Backend API is deployed and accessible
- [ ] API URL is correct for production
- [ ] CORS is configured on backend for Vercel domain
- [ ] API authentication is working
- [ ] All API endpoints are tested

## Functionality Testing

- [ ] Login/authentication works
- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] File uploads work (if applicable)
- [ ] Forms submit correctly
- [ ] Navigation works on all pages
- [ ] Responsive design works on mobile/tablet
- [ ] Images and assets load correctly

## Performance

- [ ] Page load times are acceptable
- [ ] No unnecessary large files
- [ ] Images are optimized
- [ ] No memory leaks in browser console

## Security

- [ ] No sensitive data exposed in client-side code
- [ ] Authentication tokens are stored securely
- [ ] API endpoints are protected
- [ ] Input validation is in place

## Documentation

- [ ] README.md is updated
- [ ] DEPLOYMENT.md is reviewed
- [ ] Environment variables are documented
- [ ] API endpoints are documented (if needed)

## Git Repository

- [ ] Code is pushed to remote repository
- [ ] Main/master branch is up to date
- [ ] No uncommitted changes
- [ ] `.gitignore` is properly configured

## Vercel Configuration

- [ ] Vercel account is created
- [ ] Repository is connected to Vercel
- [ ] Environment variables are set in Vercel dashboard
- [ ] Build settings are configured correctly

## Post-Deployment

- [ ] Deployment URL is accessible
- [ ] All pages load correctly
- [ ] API connections work
- [ ] No console errors in browser
- [ ] Mobile responsiveness verified
- [ ] Custom domain configured (if applicable)

## Quick Commands

```bash
# Test build locally
npm run build

# Test production build locally
npm run build
npm run start

# Check for linting errors
npm run lint

# Verify environment variables
echo $NEXT_PUBLIC_API_BASE_URL
```

## Common Issues to Check

- [ ] API CORS errors (check backend CORS configuration)
- [ ] 404 errors (check routing)
- [ ] Environment variables not loading (check variable names)
- [ ] Build failures (check build logs)
- [ ] Image loading issues (check image paths)

---

**Ready to deploy?** Follow the steps in [DEPLOYMENT.md](./DEPLOYMENT.md)

