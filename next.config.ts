import type { NextConfig } from "next";

// In production (Vercel), set BACKEND_URL to your FastAPI Cloud deployment URL
// (e.g., https://your-backend.fastapicloud.dev).
// In development, it defaults to local backend http://127.0.0.1:5000.
const rawBackend =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000";

// Strip trailing /api or slash to prevent double /api in rewrite destination
const BACKEND_URL = rawBackend.replace(/\/api\/?$/, "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
