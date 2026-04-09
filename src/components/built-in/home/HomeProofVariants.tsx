import type {
  BuiltInThemePack,
  SiteSettings,
  TeamMember,
  Testimonial,
  Service,
} from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  settings: SiteSettings | null;
  services: Service[];
  testimonials: Testimonial[];
  team: TeamMember[];
}

type ProofItem = {
  label: string;
  value: string;
};

const buildProofItems = (
  services: Service[],
  testimonials: Testimonial[],
  team: TeamMember[],
): ProofItem[] => {
  const items: ProofItem[] = [];

  if (services.length > 0) {
    items.push({ label: "Services", value: String(services.length) });
  }
  if (testimonials.length > 0) {
    items.push({ label: "Testimonials", value: String(testimonials.length) });
  }
  if (team.length > 0) {
    items.push({ label: "Team Members", value: String(team.length) });
  }

  return items;
};

const STAR_FILLED = "★";
const STAR_EMPTY = "☆";

const renderStars = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return [
    ...Array(full).fill(STAR_FILLED),
    ...Array(half).fill("✭"),
    ...Array(empty).fill(STAR_EMPTY),
  ].join("");
};

export default function HomeProofVariants({
  variant,
  themePack,
  settings,
  services,
  testimonials,
  team,
}: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";
  const theme = getHomeThemePackStyles(themePack);
  const items = buildProofItems(services, testimonials, team);

  // star_rating_bar renders from SiteSettings data, not from computed items
  if (variant === "star_rating_bar") {
    const rating = settings?.average_rating ?? null;
    const count = settings?.review_count ?? null;
    // If no review signals configured yet, fall through to items-based rendering
    // so the proof section still shows something in draft preview
    if (!rating && !count) {
      // intentional fall-through — handled by items-based variants below
    } else {
    const displayRating = rating ? rating.toFixed(1) : null;
    const displayCount = count ? count.toLocaleString() : null;
    return (
      <section
        className="border-b py-4"
        style={{ backgroundColor: theme.cardBackground, borderColor: `${accent}12` }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 sm:px-6 lg:px-8">
          {displayRating ? (
            <div className="flex items-center gap-2">
              <span
                className="text-xl tracking-tight"
                style={{ color: primary }}
                aria-label={`${displayRating} out of 5 stars`}
              >
                {renderStars(Number(displayRating))}
              </span>
              <span className="text-sm font-bold text-gray-900">{displayRating}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                / 5
              </span>
            </div>
          ) : null}
          {displayCount ? (
            <span className="text-sm font-semibold text-gray-700">
              {displayCount}{" "}
              <span className="font-normal text-gray-500">Google Reviews</span>
            </span>
          ) : null}
          {settings?.contact_phone ? (
            <a
              href={`tel:${settings.contact_phone}`}
              className="text-sm font-semibold"
              style={{ color: primary }}
            >
              {settings.contact_phone}
            </a>
          ) : null}
        </div>
      </section>
    );
    } // end else (has rating/count data)
  } // end star_rating_bar block

  if (items.length === 0) {
    return null;
  }

  if (variant === "stats_bar") {
    return (
      <section className="bg-[#111827] py-10 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-3xl font-bold">{item.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "logo_and_badge_row") {
    return (
      <section className="bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 sm:px-6 lg:px-8">
          {items.map((item) => (
            <span
              key={item.label}
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700"
              style={{ borderColor: `${primary}55` }}
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "review_strip") {
    return (
      <section className="py-12" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {items.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14" style={{ backgroundColor: theme.cardBackground }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border px-6 py-7 text-center"
            style={{ borderColor: `${accent}14`, backgroundColor: `${primary}10` }}
          >
            <p className="text-3xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-600">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}