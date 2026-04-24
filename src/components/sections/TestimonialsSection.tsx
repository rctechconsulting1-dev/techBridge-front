import EditableImage from "@/components/ui/EditableImage";
import type { Testimonial, SiteSettings } from "@/lib/cms-types";
import type { TestimonialsSectionVariant } from "@/components/sections/sectionVariants";

interface Props {
  testimonials: Testimonial[];
  settings: SiteSettings | null;
  variant?: TestimonialsSectionVariant;
}

export default function TestimonialsSection({ testimonials, settings, variant = "review_grid" }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";

  if (testimonials.length === 0) return null;

  if (variant === "featured_quote") {
    const featured = testimonials[0];

    return (
      <section id="testimonials" className="scroll-mt-20 bg-[#FBF6F0] py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Featured Review
            </p>
            <blockquote className="mt-6 text-3xl font-light italic leading-relaxed text-gray-900 sm:text-4xl">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              {featured.author_name}
              {featured.author_title ? `, ${featured.author_title}` : ""}
            </p>
          </div>
          <div className="space-y-4">
            {testimonials.slice(1, 4).map((testimonial) => (
              <div key={testimonial.id} className="rounded-[1.5rem] border border-gray-200 bg-white p-6">
                <p className="text-sm leading-relaxed text-gray-700">&ldquo;{testimonial.quote}&rdquo;</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{testimonial.author_name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "stacked_cards") {
    return (
      <section id="testimonials" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Client Stories
            </p>
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">Proof written in the client’s own words</h2>
          </div>
          <div className="space-y-5">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="rounded-[1.75rem] border border-gray-200 bg-[#FCFAF7] p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex gap-1" role="img" aria-label={`${testimonial.star_rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <svg key={index} aria-hidden="true" className="h-4 w-4" fill={index < testimonial.star_rating ? primary : "#e5e7eb"} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-lg font-light italic leading-relaxed text-gray-700">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <p className="mt-5 font-semibold text-gray-900">{testimonial.author_name}</p>
                {testimonial.author_title ? <p className="text-sm text-gray-500">{testimonial.author_title}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="testimonials"
      className="scroll-mt-20 bg-white py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: primary }}
          >
            Client Stories
          </p>
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            What Our Clients Say
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px border border-gray-100 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="flex flex-col bg-white p-10"
            >
              {/* Stars */}
              <div
                className="mb-6 flex gap-1"
                role="img"
                aria-label={`${t.star_rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill={i < t.star_rating ? primary : "#e5e7eb"}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <blockquote className="mb-8 flex-1 text-lg font-light italic leading-relaxed text-gray-700">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4">
                {t.avatar_url ? (
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full">
                    <EditableImage
                      src={t.avatar_url}
                      alt={t.author_name}
                      fill
                    />
                  </div>
                ) : (
                  <div
                    aria-label={t.author_name}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {t.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{t.author_name}</p>
                  {t.author_title && (
                    <p className="text-sm text-gray-500">{t.author_title}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
