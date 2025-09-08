import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The 'remotePatterns' property is the new, recommended way to allow external images.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // Added for our placeholder images
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'spgrqmcoyppdabtqqqnr.supabase.co',
      },
    ],
  },
};

export default nextConfig;