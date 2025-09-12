import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated appDir setting
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), 'src'),
    }
    // Exclude native argon2 bindings from the webpack bundle
    config.externals.push({ '@node-rs/argon2': 'commonjs @node-rs/argon2' })
    return config
  },
}

export default nextConfig
