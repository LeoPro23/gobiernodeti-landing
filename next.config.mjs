/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera .next/standalone (server.js + solo las dependencias que se usan) para la imagen Docker
  output: 'standalone',
  allowedDevOrigins: ['192.168.100.35', 'localhost:3000'],
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
}

export default nextConfig
