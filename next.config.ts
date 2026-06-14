import type {NextConfig} from 'next';

function parseHostnameFromUrl(value: string): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value.trim()).hostname;
  } catch {
    return null;
  }
}

function uniqueHosts(hosts: Array<string | null>): string[] {
  return [...new Set(hosts.filter((host): host is string => Boolean(host)))];
}

const supabaseImageHost = parseHostnameFromUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
);

const r2EndpointHost = parseHostnameFromUrl(process.env.R2_ENDPOINT || '');

const r2PublicHosts = uniqueHosts([
  parseHostnameFromUrl(process.env.R2_PUBLIC_URL || ''),
  parseHostnameFromUrl(process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''),
  parseHostnameFromUrl(process.env.CDN_BASE_URL || ''),
  parseHostnameFromUrl(process.env.NEXT_PUBLIC_CDN_BASE_URL || ''),
]);

function remotePatternForHost(hostname: string, pathname = '/**') {
  return {
    protocol: 'https' as const,
    hostname,
    port: '',
    pathname,
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Disabled: parallel worker caused intermittent manifest ENOENT on Windows.
    webpackBuildWorker: false,
    cpus: 1,
  },
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
   typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      remotePatternForHost('picsum.photos'),
      ...(supabaseImageHost
        ? [remotePatternForHost(supabaseImageHost, '/storage/v1/object/public/**')]
        : []),
      ...r2PublicHosts.map((hostname) => remotePatternForHost(hostname)),
      ...(r2EndpointHost ? [remotePatternForHost(r2EndpointHost)] : []),
      remotePatternForHost('imagedelivery.net'),
      // Cloudflare Images delivery subdomains
      remotePatternForHost('*.imagedelivery.net'),
      // R2 public bucket URLs: https://pub-<hash>.r2.dev/<key>
      remotePatternForHost('*.r2.dev'),
      // R2 S3 API endpoint (path-style or account subdomain)
      remotePatternForHost('*.r2.cloudflarestorage.com'),
    ],
    localPatterns: [
      { pathname: '/api/account/avatar/**', search: '?**' },
      { pathname: '/api/public/assets/**', search: '?**' },
      { pathname: '/**', search: '?**' },
      { pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  transpilePackages: ['motion'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        ioredis: false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        dns: false,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;