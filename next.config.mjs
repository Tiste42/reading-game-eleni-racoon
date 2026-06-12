import { APP_VERSION } from './scripts/write-version.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Baked into the client so VersionWatcher can compare against the live build.
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  async headers() {
    return [
      {
        // The version probe must never be cached, or the app can't tell it updated.
        source: '/version.json',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
