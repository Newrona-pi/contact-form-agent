import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated appDir setting
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), 'src'),
    }
    if (isServer) {
      config.externals = config.externals || []
      // Exclude all @node-rs/argon2 variants so Next.js loads them at runtime
      config.externals.push(/^@node-rs\/argon2.*$/)
    }
    return config
  },
}

export default nextConfig
