import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated appDir setting
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), 'src'),
    }
    config.module.rules.push({
      test: /\.node$/,
      use: { loader: 'node-loader' },
    })
    return config
  },
}

export default nextConfig
