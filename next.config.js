/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is the default in Next.js 13+
  reactStrictMode: true,

  // Output standalone for Vercel / Docker-compatible deployments
  // (Vercel auto-detects Next.js, so no special output needed here)

  // Ensure server-only env vars are never bundled to the client
  serverExternalPackages: ["@google/generative-ai"],
};

module.exports = nextConfig;
