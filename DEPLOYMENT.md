# Vercel Deployment Guide

This guide will help you deploy your Next.js admin dashboard to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Your backend API URL ready

## Step 1: Prepare Your Project

### 1.1 Environment Variables

Create a `.env.example` file (already created) to document required environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

**Important:** Never commit `.env.local` or `.env` files with actual values to Git.

### 1.2 Build Test

Test your build locally before deploying:

```bash
npm run build
```

If the build succeeds, you're ready to deploy!

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended for first deployment)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New Project"**
3. **Import your Git repository:**
   - Connect your GitHub/GitLab/Bitbucket account if not already connected
   - Select your repository
   - Click "Import"

4. **Configure Project Settings:**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `my-admin` (if your project is in a subdirectory)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

5. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add: `NEXT_PUBLIC_API_BASE_URL` = `https://your-api-domain.com`
   - Make sure to add it for all environments (Production, Preview, Development)

6. **Click "Deploy"**

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd my-admin
   vercel
   ```

4. **Follow the prompts:**
   - Link to existing project or create new
   - Set environment variables when prompted

5. **For production deployment:**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Environment Variables in Vercel

After deployment, configure environment variables:

1. Go to your project on Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-api-domain.com` | Production, Preview, Development |

**Important Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser
- After adding/changing environment variables, you need to redeploy
- Use different API URLs for different environments if needed

## Step 4: Post-Deployment Checklist

- [ ] Verify the deployment URL works
- [ ] Test login functionality
- [ ] Test API connections
- [ ] Check that all pages load correctly
- [ ] Verify environment variables are set correctly
- [ ] Test on mobile devices (responsive design)
- [ ] Check browser console for any errors

## Step 5: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate will be automatically provisioned

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Test build locally: `npm run build`
3. Check for TypeScript errors: `npm run lint`
4. Verify all dependencies are in `package.json`

### API Connection Issues

1. Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
2. Check CORS settings on your backend API
3. Ensure API is accessible from the internet
4. Check browser console for network errors

### Environment Variables Not Working

1. Verify variables are set in Vercel dashboard
2. Redeploy after adding/changing variables
3. Check variable names match exactly (case-sensitive)
4. Ensure `NEXT_PUBLIC_*` prefix for client-side variables

### 404 Errors on Routes

1. Check Next.js routing configuration
2. Verify all pages are in correct directories
3. Check for case-sensitive route issues

## Continuous Deployment

Vercel automatically deploys:
- **Production:** When you push to main/master branch
- **Preview:** When you push to other branches or create pull requests

## Performance Optimization

1. **Image Optimization:** Vercel automatically optimizes Next.js images
2. **Caching:** Configure caching headers if needed
3. **Analytics:** Enable Vercel Analytics in dashboard
4. **Speed Insights:** Enable Speed Insights for performance monitoring

## Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use environment variables for sensitive data
3. ✅ Enable Vercel's DDoS protection
4. ✅ Use HTTPS (automatically enabled)
5. ✅ Regularly update dependencies

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Support](https://vercel.com/support)

