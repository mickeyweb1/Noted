import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(scriptDirectory, "..");
let siteUrl = (process.env.VITE_SITE_URL || "https://usenotedai.com").replace(/\/+$/, "");
let googleSiteVerification = process.env.VITE_GOOGLE_SITE_VERIFICATION || "";
const routes = [
  { path: "/", module: "/src/pages/marketing/LandingPage.jsx" },
  { path: "/about", module: "/src/pages/marketing/AboutPage.jsx" },
  { path: "/school", module: "/src/pages/marketing/SchoolPage.jsx" },
  { path: "/student", module: "/src/pages/marketing/StudentPage.jsx" },
  { path: "/personal", module: "/src/pages/marketing/PersonalPage.jsx" },
  { path: "/contact", module: "/src/pages/marketing/ContactPage.jsx" },
  { path: "/pricing", module: "/src/pages/PricingPage.jsx" },
];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function renderHead(template, pathname, metadata) {
  const canonical = new URL(metadata.canonical || pathname, `${siteUrl}/`).href;
  const image = new URL(metadata.image || "/favicon.svg", `${siteUrl}/`).href;
  const tags = [];
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);

  const addMeta = (attribute, key, content) => {
    const matcher = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(key)}["'])[^>]*>`, "gi");
    html = html.replace(matcher, "");
    if (!content) return;
    tags.push(`<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`);
  };
  const removeLink = (rel) => {
    const matcher = new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapeRegExp(rel)}["'])[^>]*>`, "gi");
    html = html.replace(matcher, "");
  };

  addMeta("name", "description", metadata.description);
  addMeta("name", "robots", metadata.robots || "index,follow");
  addMeta("name", "google-site-verification", googleSiteVerification);
  addMeta("name", "keywords", metadata.keywords);
  addMeta("property", "og:type", metadata.type || "website");
  addMeta("property", "og:title", metadata.title);
  addMeta("property", "og:description", metadata.description);
  addMeta("property", "og:url", canonical);
  addMeta("property", "og:image", image);
  addMeta("property", "og:site_name", "Noted");
  addMeta("name", "twitter:card", "summary_large_image");
  addMeta("name", "twitter:title", metadata.title);
  addMeta("name", "twitter:description", metadata.description);
  addMeta("name", "twitter:image", image);
  removeLink("canonical");
  tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  for (const { language, url } of metadata.alternates || []) {
    tags.push(`<link rel="alternate" hreflang="${escapeHtml(language)}" href="${escapeHtml(new URL(url, `${siteUrl}/`).href)}" />`);
  }
  for (const [relation, url] of [["prev", metadata.previousPage], ["next", metadata.nextPage]]) {
    if (url) tags.push(`<link rel="${relation}" href="${escapeHtml(new URL(url, `${siteUrl}/`).href)}" />`);
  }

  const websiteSchema = metadata.searchAction
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Noted",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: new URL(metadata.searchAction, `${siteUrl}/`).href.replace(/%7B/gi, "{").replace(/%7D/gi, "}"),
          },
          "query-input": "required name=search_term_string",
        },
      }
    : { "@context": "https://schema.org", "@type": "WebSite", name: "Noted", url: siteUrl };
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Noted",
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
    },
    websiteSchema,
  ];
  const customSchemas = metadata.structuredData
    ? Array.isArray(metadata.structuredData) ? metadata.structuredData : [metadata.structuredData]
    : [];
  schemas.push(...customSchemas);
  if (metadata.breadcrumbs?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: metadata.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: new URL(crumb.url, `${siteUrl}/`).href,
      })),
    });
  }
  tags.push(`<script id="noted-seo-jsonld" type="application/ld+json">${JSON.stringify(schemas).replace(/</g, "\\u003c")}</script>`);

  return html.replace("</head>", `${tags.join("\n    ")}\n  </head>`);
}

const vite = await createServer({
  configFile: path.join(clientDirectory, "vite.config.js"),
  mode: "production",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const seoModule = await vite.ssrLoadModule("/src/components/SEO.jsx");
  const { PUBLIC_PAGES, SITE_URL, GOOGLE_SITE_VERIFICATION, SEOProvider } = seoModule;
  siteUrl = SITE_URL;
  googleSiteVerification = GOOGLE_SITE_VERIFICATION;
  const { UserContextProvider } = await vite.ssrLoadModule("/src/context/userContext.jsx");
  const template = await readFile(path.join(clientDirectory, "dist/index.html"), "utf8");

  for (const route of routes) {
    const metadata = PUBLIC_PAGES[route.path];
    if (!metadata) throw new Error(`Missing SEO metadata for ${route.path}`);
    const pageModule = await vite.ssrLoadModule(route.module);
    const { default: Page } = pageModule;
    const pageMetadata = {
      ...metadata,
      ...(pageModule.seoStructuredData ? { structuredData: pageModule.seoStructuredData } : {}),
    };
    const page = React.createElement(
      StaticRouter,
      { location: route.path },
      React.createElement(
        SEOProvider,
        null,
        React.createElement(
          UserContextProvider,
          null,
          React.createElement(Page),
        ),
      ),
    );
    const markup = renderToString(page);
    const html = renderHead(template, route.path, pageMetadata)
      .replace(
        '<div id="root"></div>',
        `<div id="root" data-noted-prerendered="true">${markup}</div>`,
      );
    const outputDirectory = path.join(clientDirectory, "dist", route.path.replace(/^\//, ""));
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, "index.html"), html);
    console.log(`Pre-rendered ${route.path}`);
  }
} finally {
  await vite.close();
}
