import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    allowedDevOrigins: [
      '6000-firebase-studio-1748943657178.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev',
    ],
  },
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', 'handlebars', '@opentelemetry/sdk-node'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
