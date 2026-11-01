import express from 'express';
import { buildSitemapXml, getAdditionalPublicPaths, getSiteUrl, PUBLIC_SEO_PAGES } from '../config/seo.js';

const router = express.Router();

router.get('/sitemap.xml', (_req, res, next) => {
  try {
    const pages = [...PUBLIC_SEO_PAGES, ...getAdditionalPublicPaths()];
    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
      .send(buildSitemapXml(getSiteUrl(), pages));
  } catch (error) {
    next(error);
  }
});

export default router;
