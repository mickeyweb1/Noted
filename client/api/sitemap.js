export default async function handler(_request, response) {
  const apiBase = (process.env.SEO_API_URL || process.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) {
    response.status(503).send("SEO_API_URL or VITE_API_URL must point to the deployed Noted API.");
    return;
  }

  try {
    const upstream = await fetch(`${apiBase}/seo/sitemap.xml`, {
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.text();
    response
      .status(upstream.status)
      .setHeader("Content-Type", upstream.headers.get("content-type") || "application/xml; charset=utf-8")
      .setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
      .send(body);
  } catch (error) {
    console.error("Unable to retrieve the Noted sitemap:", error);
    response.status(502).send("The sitemap service is temporarily unavailable.");
  }
}
