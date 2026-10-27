import { AudioLines } from "lucide-react";
import { Link } from "react-router-dom";

export default function SiginFirstSection() {
  return (
    <section className="group relative isolate flex min-h-[400px] w-full flex-col justify-between overflow-hidden bg-slate-950 p-6 text-white sm:p-8 md:min-h-screen md:w-2/5 md:p-10 lg:p-14">
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=85"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 -z-10 bg-slate-950/65" />

      <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-soft">
          <AudioLines className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">Noted</span>
      </Link>

      <div className="relative z-10 my-10 max-w-xl md:my-auto">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
          Learn at your pace
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          Make learning make sense.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
          Turn class notes into clear summaries, audio lessons, and practice tools that fit the way you study.
        </p>
      </div>

      <a
        href="https://unsplash.com/license"
        target="_blank"
        rel="noreferrer"
        className="relative z-10 w-fit text-xs text-white/75 underline underline-offset-2 transition-colors hover:text-white"
      >
        Photo via Unsplash
      </a>
    </section>
  );
}