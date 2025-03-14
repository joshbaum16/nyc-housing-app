/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'photos.zillowstatic.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    STREETEASY_API_KEY: process.env.STREETEASY_API_KEY,
  },
}

module.exports = nextConfig 