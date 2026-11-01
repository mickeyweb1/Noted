# SEO system

Noted uses a small React SEO layer rather than a head-management dependency. `SEOProvider` owns document metadata and is mounted inside `BrowserRouter` in `src/main.jsx`. It selects the metadata for known public routes and marks unknown routes `noindex,nofollow`. Protected routes are also marked noindex in the page head.

## What is included

- Route-specific title, description, canonical, Open Graph, and Twitter metadata.
- Organization and WebSite JSON-LD on public pages, with optional per-page schema and breadcrumbs.
- Hreflang and pagination-link support for future translated or paginated content.
- A production prerender step for the current marketing pages. `npm run build` renders their HTML and head tags into `dist/<route>/index.html`; React hydrates that markup on the client.
- `robots.txt` and a dynamic sitemap at `/sitemap.xml`. The Vercel function proxies the sitemap request to the API's `/seo/sitemap.xml` endpoint.
- A `noted:web-vital` browser event reporting LCP, CLS, and INP measurements. Consumers can subscribe to this event or call `useWebVitals(onMetric)` with a memoized callback.

The site has no public study-set, note, or quiz-detail routes today. User libraries and access-code quizzes are private, so they are intentionally excluded from the sitemap and marked noindex. Do not list a resource until it has an actual public route and an explicit publish/visibility check.

## Add SEO to a page

Known marketing routes (`/`, `/about`, `/school`, `/student`, `/personal`, `/pricing`, and `/contact`) get route-specific titles and descriptions and are prerendered during the production build. Use the reusable component for new or dynamic pages. Canonicals are absolute URLs on `VITE_SITE_URL`; the default canonical uses the current pathname and omits query/filter parameters.

```jsx
import SEO from "../components/SEO";

export default function StudySetPage({ studySet }) {
  const url = `/study/${studySet.slug}`;
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: studySet.title,
    description: studySet.description,
    learningResourceType: "Study set",
    url: `https://usenotedai.com${url}`,
    inLanguage: "en",
  };

  return (
    <>
      <SEO
        title={`${studySet.title} study set | Noted`}
        description={studySet.description}
        canonical={url}
        image={studySet.socialImage}
        structuredData={learningResource}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Study sets", url: "/study" },
          { name: studySet.title, url },
        ]}
      />
      <main>
        <h1>{studySet.title}</h1>
        {/* Render the public study material here. */}
      </main>
    </>
  );
}
```

For a quiz, use a `LearningResource` schema and publish only information intended to be public:

```jsx
<SEO
  title={`${quiz.title} practice quiz | Noted`}
  description={quiz.description}
  canonical={`/quizzes/${quiz.slug}`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: quiz.title,
    description: quiz.description,
    learningResourceType: "Quiz",
    educationalLevel: quiz.educationalLevel,
    inLanguage: "en",
  }}
/>
```

For a blog or editorial article:

```jsx
<SEO
  title={`${article.title} | Noted`}
  description={article.summary}
  canonical={`/articles/${article.slug}`}
  type="article"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.authorName },
    mainEntityOfPage: `https://usenotedai.com/articles/${article.slug}`,
  }}
/>
```

For an article, include truthful authorship and publication dates. For an actual school detail page, use `EducationalOrganization` only for public institution information:

```jsx
<SEO
  title={`${school.name} | Noted`}
  description={school.publicDescription}
  canonical={`/schools/${school.slug}`}
  type="article"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.name,
    url: `https://usenotedai.com/schools/${school.slug}`,
    description: school.publicDescription,
  }}
/>
```

The homepage metadata is provided automatically for `/`; its global JSON-LD identifies Noted as an `Organization` and `WebSite`. `PricingPage` is an additional live example: its FAQ schema is generated from the same visible FAQ data as the page.

`SEO` also accepts `type`, `robots`, `keywords`, `alternates`, `previousPage`, `nextPage`, `googleSiteVerification`, and one or more `structuredData` objects. For article pages, pass an `Article` or `BlogPosting` schema with accurate author and publication dates. Use `FAQPage` only when the same questions and answers are visible on the page. A course page can pass a `Course` schema; a quiz or other learning activity can use `LearningResource`. Structured data helps search engines understand a page but does not guarantee a rich result.

For private or thin pages, set `robots="noindex,nofollow"`. For filtered and paginated pages, choose a canonical that matches the actual content; do not canonicalize every page to page one. `rel=prev/next` is available for compatibility, though Google no longer uses it as a pagination indexing signal.

Create URL slugs with `src/utils/slugify.js`. Check the generated slug for collisions before saving it; the helper normalizes text but does not provide uniqueness.

## Publish a public URL to the sitemap

The sitemap endpoint rebuilds its XML on each request from the public route list in `server/config/seo.js`. Additional already-published paths can be supplied as a JSON array in the server's `SEO_PUBLIC_PATHS` environment variable, for example:

```text
SEO_PUBLIC_PATHS=["/study/biology-revision","/articles/how-to-revise"]
```

Only add canonical, publicly accessible paths that return useful page content. The current platform does not yet have a public-content publishing workflow, so its sitemap includes the existing marketing routes only. When adding a publishing workflow, update the sitemap provider to read only published records from that workflow and add those routes to `client/scripts/prerender.js` if they should be statically rendered. Never include a user's private note, quiz, school, or study set based only on its existence in the database.

The sitemap is served through `client/api/sitemap.js`. Configure `SEO_API_URL` in the Vercel project to the same API base used by `VITE_API_URL` (including its `/api` path), or expose `VITE_API_URL` to the serverless function runtime. Set `SEO_SITE_URL` on the API and `VITE_SITE_URL` on the client to the canonical production origin. Update `public/robots.txt` if the canonical domain changes.

## Structured data and search

The global schemas identify Noted as an `Organization` and `WebSite`. Page-level JSON-LD is added with the shared component. The component supports `SearchAction`, but Noted currently has no functioning site-search results URL, so the sitelinks search schema is intentionally omitted rather than advertising a broken search. Google retired the sitelinks search box visual feature in 2024; a `SearchAction` is not a ranking guarantee.

There are no translated pages today. Add an `alternates` entry for each equivalent language version only after translated routes are available. Configure Search Console by setting `VITE_GOOGLE_SITE_VERIFICATION`; submit `/sitemap.xml` in Search Console after deployment.

## Rendering and performance

The current app is a client-rendered Vite SPA. Public marketing routes are now statically prerendered at build time and hydrated by React, so their main content and metadata are available without client-side JavaScript. Dynamic public pages should be added to the same prerender route list. For pages that need request-time personalized or database content, use server-side rendering with React 19 and the existing Express/Vercel deployment, while keeping private content noindex and out of sitemaps.

Marketing images already provide descriptive alt text and lazy loading for below-the-fold content; keep above-the-fold hero images eager/high-priority and avoid layout shifts by reserving image dimensions. Use the `noted:web-vital` event to feed a first-party analytics endpoint if desired; no user or page content is sent by this hook.
