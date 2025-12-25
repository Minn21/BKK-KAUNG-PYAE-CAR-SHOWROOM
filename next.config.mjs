/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production
  output: 'standalone', // Optional: for better serverless performance
  // Enable image optimization
  images: {
    domains: [], // Add your image domains if needed
    unoptimized: false,
  },
  // Environment variables validation (optional)
  env: {
    // These are already available via process.env, but you can add defaults here
  },
};

export default nextConfig;
