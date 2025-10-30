/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true
  },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ManAIger',
    NEXT_PUBLIC_TAGLINE: process.env.NEXT_PUBLIC_TAGLINE || 'Your AI Manager for Streamers and Creators.'
  },
  async headers() {
    // Get API URL from environment, fallback to localhost for development
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const isProduction = process.env.NODE_ENV === 'production';

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.tiktok.com https://business-api.tiktok.com https://accounts.google.com https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net https://r.wdfl.co",
              // Be more permissive with connect-src to ensure API calls work
              isProduction
                ? `connect-src 'self' ${apiUrl} https: wss: https://analytics.tiktok.com https://business-api.tiktok.com https://accounts.google.com https://api.stripe.com`
                : `connect-src 'self' http: https: ws: wss: https://analytics.tiktok.com https://business-api.tiktok.com`,
              "img-src 'self' data: https: https://analytics.tiktok.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://accounts.google.com https://js.stripe.com https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;