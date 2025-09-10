/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Silence workspace root warning by explicitly setting tracing root to this project
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      // Serve favicon from public/rocket.svg
      { source: '/favicon.ico', destination: '/rocket.svg' },
    ];
  },
};

module.exports = nextConfig;
