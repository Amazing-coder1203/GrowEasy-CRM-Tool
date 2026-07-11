/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is the default in Next.js 13+
  reactStrictMode: true,

  // Output standalone for optimized Docker builds
  output: "standalone",

  // Ensure server-only env vars are never bundled to the client
  serverExternalPackages: ["@google/generative-ai"],
};

module.exports = nextConfig;
