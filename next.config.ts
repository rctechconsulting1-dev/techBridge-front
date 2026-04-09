import type { NextConfig } from "next";
import { getRemoteImagePatterns } from "./src/lib/image-hosts";

// Minimal, stable Next.js 15 config. Avoids custom chunking that can break
// client-reference manifests and route transitions. See docs:
// https://nextjs.org/docs/app/building-your-application/configuring
const nextConfig: NextConfig = {
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!rawApiUrl || !/^https?:\/\//i.test(rawApiUrl)) {
      return [];
    }

    const normalized = rawApiUrl.replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${normalized}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: getRemoteImagePatterns(),
  },
  webpack(config) {
    // High-priority SVGR loader for all SVG imports
    // This transforms `import Icon from './icon.svg'` into a React component
    // and avoids the default JS parser trying to parse raw SVG.
    // Insert at the very beginning for precedence.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.module.rules as any[]).unshift({
      test: /\.svg$/i,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: true,
            svgoConfig: {
              plugins: [
                {
                  name: "preset-default",
                  params: { overrides: { removeViewBox: false } },
                },
              ],
            },
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
