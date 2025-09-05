/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  // PDFファイルの配信設定
  async headers() {
    return [
      {
        source: '/tmp/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/pdf',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
