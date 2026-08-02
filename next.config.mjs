/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
