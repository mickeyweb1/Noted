import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWebVitals } from "../hooks/useWebVitals";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://usenotedai.com").replace(/\/+$/, "");
const DEFAULT_TITLE = "Noted | AI-Powered Study Tools for Students";
const DEFAULT_DESCRIPTION = "Turn class notes into clear summaries, quizzes, flashcards, and audio lessons with Noted's AI-powered learning platform.";
const DEFAULT_METADATA = { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, robots: "noindex,nofollow" };
export const PUBLIC_PAGES = {
  "/": {
    title: "Noted | AI Study Tools for Smarter Learning",
    description: "Turn class notes into clear summaries, quizzes, flashcards, and audio lessons with Noted's AI-powered learning platform.",
    robots: "index,follow",
  },
  "/about": {
    title: "About Noted | AI-Powered Learning Platform",
    description: "Meet Noted, a learning platform built to help students study with clearer notes, interactive practice, and focused learning tools.",
    robots: "index,follow",
  },
  "/school": {
    title: "AI Quiz and Learning Tools for Schools | Noted",
    description: "Help teachers create classroom quizzes and give schools practical tools for assessments, student learning, and progress insights.",
    robots: "index,follow",
  },
  "/student": {
    title: "Study Smarter with AI Study Tools for Students | Noted",
    description: "Turn your class notes into summaries, quizzes, audio lessons, and revision practice with Noted's AI study tools for students.",
    robots: "index,follow",
  },
  "/personal": {
    title: "Personal AI Study Planner and Note Tools | Noted",
    description: "Organize your notes, build revision routines, and practice with AI-generated summaries, flashcards, and quizzes.",
    robots: "index,follow",
  },
  "/pricing": {
    title: "Noted Plans and Pricing | Study and School Tools",
    description: "Compare Noted plans for teachers, schools, and independent learners. Choose the study and assessment tools that fit your needs.",
    robots: "index,follow",
  },
  "/contact": {
    title: "Contact Noted | Learning Platform Support",
    description: "Contact the Noted team about school partnerships, student learning tools, account questions, or product support.",
    robots: "index,follow",
  },
};

const SEOContext = createContext(null);
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Noted",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
};
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Noted",
  url: SITE_URL,
};

const setMeta = (selector, attribute, key, content) => {
  let element = document.head.querySelector(selector);
  if (content === undefined || content === null || content === "") {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.setAttribute("content", content);
};

const absoluteUrl = (value, fallback) => new URL(value || fallback, `${SITE_URL}/`).href;

function SEOHead({ metadata, pathname }) {
  const {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    canonical = pathname,
    image = "/favicon.svg",
    type = "website",
    robots = "noindex,nofollow",
    keywords,
    structuredData = [],
    breadcrumbs,
    alternates = [],
    previousPage,
    nextPage,
    searchAction,
    googleSiteVerification,
  } = metadata;

  useEffect(() => {
    const canonicalUrl = absoluteUrl(canonical, "/");
    const imageUrl = absoluteUrl(image, "/favicon.svg");
    const websiteSchema = searchAction
      ? {
          ...WEBSITE_SCHEMA,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: absoluteUrl(searchAction, "/").replace(/%7B/gi, "{").replace(/%7D/gi, "}"),
            },
            "query-input": "required name=search_term_string",
          },
        }
      : WEBSITE_SCHEMA;
    const additionalSchemas = Array.isArray(structuredData) ? structuredData : [structuredData];
    const schemas = [ORGANIZATION_SCHEMA, websiteSchema, ...additionalSchemas];

    if (breadcrumbs?.length) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.url, "/"),
        })),
      });
    }

    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", robots);
    setMeta('meta[name="google-site-verification"]', "name", "google-site-verification", googleSiteVerification || import.meta.env.VITE_GOOGLE_SITE_VERIFICATION);
    setMeta('meta[name="keywords"]', "name", "keywords", keywords);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", "Noted");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);

    let canonicalElement = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalElement) {
      canonicalElement = document.createElement("link");
      canonicalElement.rel = "canonical";
      document.head.append(canonicalElement);
    }
    canonicalElement.href = canonicalUrl;

    document.head.querySelectorAll('link[data-noted-hreflang="true"]').forEach((link) => link.remove());
    alternates.forEach(({ language, url }) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = language;
      link.href = absoluteUrl(url, "/");
      link.dataset.notedHreflang = "true";
      document.head.append(link);
    });

    document.head.querySelectorAll('link[rel="prev"], link[rel="next"]').forEach((link) => link.remove());
    if (previousPage) {
      const link = document.createElement("link");
      link.rel = "prev";
      link.href = absoluteUrl(previousPage, "/");
      document.head.append(link);
    }
    if (nextPage) {
      const link = document.createElement("link");
      link.rel = "next";
      link.href = absoluteUrl(nextPage, "/");
      document.head.append(link);
    }

    const schemaElement = document.getElementById("noted-seo-jsonld") || document.createElement("script");
    schemaElement.id = "noted-seo-jsonld";
    schemaElement.type = "application/ld+json";
    schemaElement.textContent = JSON.stringify(schemas).replace(/</g, "\\u003c");
    document.head.append(schemaElement);
  }, [
    alternates,
    breadcrumbs,
    canonical,
    description,
    googleSiteVerification,
    image,
    keywords,
    nextPage,
    pathname,
    previousPage,
    robots,
    searchAction,
    structuredData,
    title,
    type,
  ]);

  return null;
}

export function SEOProvider({ children }) {
  const { pathname } = useLocation();
  const [registeredPage, setRegisteredPage] = useState(null);
  useWebVitals();

  const setPageMetadata = useCallback((pageMetadata) => {
    setRegisteredPage(pageMetadata ? { pathname, metadata: pageMetadata } : null);
  }, [pathname]);
  const pageMetadata = registeredPage?.pathname === pathname ? registeredPage.metadata : null;

  const metadata = useMemo(
    () => ({ ...DEFAULT_METADATA, ...(PUBLIC_PAGES[pathname] || {}), ...pageMetadata }),
    [pageMetadata, pathname],
  );

  return (
    <SEOContext.Provider value={setPageMetadata}>
      <SEOHead metadata={metadata} pathname={pathname} />
      {children}
    </SEOContext.Provider>
  );
}

export default function SEO(options) {
  const setPageMetadata = useContext(SEOContext);
  if (!setPageMetadata) throw new Error("SEO must be rendered inside SEOProvider.");

  const signature = JSON.stringify(options);
  useEffect(() => {
    setPageMetadata(JSON.parse(signature));
    return () => setPageMetadata(null);
  }, [setPageMetadata, signature]);

  return null;
}
