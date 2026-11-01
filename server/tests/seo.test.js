import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemapXml, getAdditionalPublicPaths } from '../config/seo.js';

test('builds a sitemap from public routes using the canonical origin', () => {
  const xml = buildSitemapXml('https://usenotedai.com', [
    { path: '/', priority: '1.0' },
    { path: '/study/biology', priority: '0.6' },
  ]);

  assert.match(xml, /<loc>https:\/\/usenotedai\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/usenotedai\.com\/study\/biology<\/loc>/);
  assert.match(xml, /<priority>1\.0<\/priority>/);
});

test('supports additional public routes without including query strings', () => {
  assert.deepEqual(
    getAdditionalPublicPaths(JSON.stringify(['/study/cell-biology', '/articles/revision'])),
    [
      { path: '/study/cell-biology', priority: '0.6' },
      { path: '/articles/revision', priority: '0.6' },
    ],
  );
  assert.throws(() => getAdditionalPublicPaths(JSON.stringify(['/study/cell-biology?answer=1'])));
  assert.throws(() => getAdditionalPublicPaths(JSON.stringify(['https://example.com/private'])));
});

test('escapes XML control characters in sitemap URLs', () => {
  const xml = buildSitemapXml('https://usenotedai.com', [
    { path: '/study/biology&chemistry', priority: '0.6' },
  ]);
  assert.match(xml, /biology&amp;chemistry/);
});
