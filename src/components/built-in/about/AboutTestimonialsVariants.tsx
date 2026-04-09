import type { BuiltInThemePack, SiteSettings, Testimonial } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  testimonials: Testimonial[];
  settings: SiteSettings | null;
}

export default function AboutTestimonialsVariants({ variant, themePack, testimonials, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (testimonials.length === 0) {
    return null;
  }

  const featured = testimonials[0];

  if (variant === "featured_quote") {
    return (
      <section id="testimonials" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className={`border p-8 text-center ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}20` }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>Featured Quote</p>
            <blockquote className="mt-6 text-3xl font-light italic leading-relaxed text-gray-900">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {featured.author_name}
              {featured.author_title ? `, ${featured.author_title}` : ""}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "review_strip") {
    return (
      <section id="testimonials" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {testimonials.slice(0, 3).map((testimonial) => (
            <div key={testimonial.id} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}20` }}>
              <p className="text-sm leading-relaxed text-gray-700">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>{testimonial.author_name}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.softBackground }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>Social Proof</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Clients trust the team behind the brand</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.slice(0, 3).map((testimonial) => (
            <div key={testimonial.id} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}20` }}>
              <p className="text-sm leading-relaxed text-gray-700">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>{testimonial.author_name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}