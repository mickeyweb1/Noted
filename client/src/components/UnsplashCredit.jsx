const CREDIT_URL = "https://unsplash.com/license";

export default function UnsplashCredit({ className = "", plural = false }) {
  return (
    <a
      href={CREDIT_URL}
      target="_blank"
      rel="noreferrer"
      className={`text-xs underline underline-offset-2 transition-colors hover:text-foreground ${className}`}
    >
      {plural ? "Photos" : "Photo"} via Unsplash
    </a>
  );
}
