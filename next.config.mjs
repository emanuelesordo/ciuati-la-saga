/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include Markdown memory files in the serverless narrator bundle.
  // These are read from disk by app/api/narratore/route.ts at request time.
  outputFileTracingIncludes: {
    '/api/narratore': [
      './lore/personaggi/**/*.md',
      './lore/fonti/**/*.md',
      './lore/ambientazione/**/*.md',
      './lore/trame/**/*.md',
    ],
  },
};
export default nextConfig;
