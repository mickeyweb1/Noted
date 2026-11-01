export function getSiteUrl() {
  return (process.env.SEO_SITE_URL || process.env.CLIENT_URL || 'https://usenotedai.com').replace(/\/+$/, '');
}

export const PUBLIC_SEO_PAGES = [
  { path: '/', priority: '1.0' },
  { path: '/student', priority: '0.9' },
  { path: '/school', priority: '0.9' },
  { path: '/personal', priority: '0.8' },
  { path: '/pricing', priority: '0.8' },
  { path: '/about', priority: '0.6' },
  { path: '/contact', priority: '0.5' },
];

export function getAdditionalPublicPaths(rawPaths = process.env.SEO_PUBLIC_PATHS) {
  if (!rawPaths) return [];
  const paths = JSON.parse(rawPaths);
  if (!Array.isArray(paths) || paths.some((path) => (
    typeof path !== 'string'
    || !path.startsWith('/')
    || path.startsWith('//')
    || path.includes('?')
    || path.includes('#')
    || path.split('/').includes('..')
  ))) {
    throw new Error('SEO_PUBLIC_PATHS must be a JSON array of public URL paths.');
  }
  return paths.map((path) => ({ path, priority: '0.6' }));
}

export function buildSitemapXml(siteUrl = getSiteUrl(), pages = PUBLIC_SEO_PAGES) {
  const uniquePages = new Map(pages.map((page) => [page.path, page]));
  const urls = [...uniquePages.values()].map(({ path, priority }) => {
    const loc = new URL(path, `${siteUrl}/`).href
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `  <url><loc>${loc}</loc><priority>${priority}</priority></url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n');
}
