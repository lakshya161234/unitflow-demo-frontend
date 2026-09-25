/** @type {import('next').NextConfig} */
const nextConfig = {
  // API_BASE_URL is safe to expose to browser code; it is a public API origin,
  // not a credential. Next normally only exposes NEXT_PUBLIC_* variables.
  env: {
    API_BASE_URL: process.env.API_BASE_URL || "http://localhost:4000",
  },
};

export default nextConfig;
