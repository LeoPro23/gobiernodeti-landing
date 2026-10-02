/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera .next/standalone (server.js + solo las dependencias que se usan) para la imagen Docker
  output: 'standalone',
}

export default nextConfig
