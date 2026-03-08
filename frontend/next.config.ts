import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent XSS attacks
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Strict referrer policy
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions policy — restrict browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // XSS protection (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Strict transport security
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),

  // ── Security Headers ──────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // ── Image Optimization ────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [

      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Deny overly large images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // ── Production Build Optimization ──────────────────────────────────
  reactStrictMode: true,
  poweredByHeader: false, // Remove "X-Powered-By: Next.js" for security

  // ── Webpack — fix pdfjs-dist topLevelAwait runtime crash ─────────────
  webpack: (config) => {
    // pdfjs-dist uses top-level await; enable the experiment so webpack
    // actually supports it at runtime (prevents "Cannot read properties
    // of undefined (reading 'call')" crash).
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    return config;
  },

  // ── Experimental Performance Flags ────────────────────────────────
  experimental: {
    optimizeCss: false, // Enable if critters is installed
    scrollRestoration: true,
  },
};

export default nextConfig;
