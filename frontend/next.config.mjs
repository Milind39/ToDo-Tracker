/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "opnozxmkzpqvbiijuzsm.supabase.co",
        pathname: "/storage/**",
      },
    ],
    unoptimized: true, // disables image optimization globally
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
