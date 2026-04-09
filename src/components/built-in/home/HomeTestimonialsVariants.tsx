import type { BuiltInThemePack, SiteSettings, Testimonial } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  testimonials: Testimonial[];
  settings: SiteSettings | null;
}

export default function HomeTestimonialsVariants({
  variant,
  themePack,
  testimonials,
  settings,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (testimonials.length === 0) {
    return null;
  }

  const featured = testimonials[0];

  if (variant === "review_cards") {
    return (
      <section id="testimonials" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.mutedBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Testimonials
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">Clients already trust the process</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.slice(0, 3).map((testimonial) => (
              <div key={testimonial.id} className="rounded-3xl p-6 shadow-sm" style={{ backgroundColor: theme.cardBackground }}>
                <p className="text-sm leading-relaxed text-gray-700">&ldquo;{testimonial.quote}&rdquo;</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {testimonial.author_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "single_featured_quote") {
    return (
      <section id="testimonials" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Featured Review
          </p>
          <blockquote className="mt-6 text-3xl font-light italic leading-relaxed text-gray-900 sm:text-4xl">
            &ldquo;{featured.quote}&rdquo;
          </blockquote>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-600">
            {featured.author_name}
            {featured.author_title ? `, ${featured.author_title}` : ""}
          </p>
        </div>
      </section>
    );
  }

  if (variant === "featured_quote") {
    return (
      <section id="testimonials" className="scroll-mt-20 py-24" style={{ backgroundColor: theme.mutedBackground }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
          <div className="rounded-[2rem] p-8 shadow-sm sm:p-10" style={{ backgroundColor: theme.cardBackground }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Client Confidence
            </p>
            <blockquote className="mt-6 text-2xl font-light italic leading-relaxed text-gray-900 sm:text-3xl">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-semibold text-gray-700">
              {featured.author_name}
              {featured.author_title ? `, ${featured.author_title}` : ""}
            </p>
          </div>
          <div className="space-y-4">
            {testimonials.slice(1, 4).map((testimonial) => (
              <div key={testimonial.id} className="rounded-3xl border border-gray-200 p-5" style={{ backgroundColor: theme.cardBackground }}>
                <p className="text-sm leading-relaxed text-gray-700">&ldquo;{testimonial.quote}&rdquo;</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {testimonial.author_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        {testimonials.slice(0, 3).map((testimonial) => (
          <div key={testimonial.id} className="rounded-3xl border border-gray-200 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: primary }}>
              {testimonial.author_name}
            </p>
            <p className="mt-4 text-lg italic leading-relaxed text-gray-800">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}