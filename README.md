This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Quick Deployment Steps

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Import your repository:**
   - Click "Add New Project"
   - Select your repository
   - Configure settings:
     - Framework: Next.js (auto-detected)
     - Root Directory: `my-admin` (if in subdirectory)
     - Build Command: `npm run build`
     - Output Directory: `.next`

4. **Add Environment Variables:**
   - `NEXT_PUBLIC_API_BASE_URL` = Your backend API URL
   - Add for Production, Preview, and Development environments

5. **Click Deploy**

### Environment Variables Required

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

For Vercel deployment, add this in the Vercel dashboard under Settings → Environment Variables.

### Detailed Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions, troubleshooting, and best practices.

### Post-Deployment

- ✅ Test all pages and functionality
- ✅ Verify API connections
- ✅ Check environment variables
- ✅ Test on mobile devices

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
