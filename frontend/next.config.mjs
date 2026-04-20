/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "*.scdn.co" },
      { protocol: "https", hostname: "*.spotifycdn.com" },
    ],
  },
};

export default nextConfig;
