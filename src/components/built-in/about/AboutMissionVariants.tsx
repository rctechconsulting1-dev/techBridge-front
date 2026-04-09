import type { BuiltInThemePack, SiteSettings } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  title: string | null;
  body: string | null;
  settings: SiteSettings | null;
}

const toParagraphs = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

export default function AboutMissionVariants({ variant, themePack, title, body, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (!body) {
    return null;
  }

  const paragraphs = toParagraphs(body);

  if (variant === "values_grid") {
    const blocks = (paragraphs.length > 0 ? paragraphs : [body]).slice(0, 3);
    return (
      <section className="py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Mission and Values
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">{title ?? "Our Mission"}</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {blocks.map((block, index) => (
              <div key={`${index}-${block.slice(0, 20)}`} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}22` }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">0{index + 1}</p>
                <p className="mt-4 text-sm leading-relaxed text-gray-700">{block}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "timeline_story") {
    const blocks = (paragraphs.length > 0 ? paragraphs : [body]).slice(0, 3);
    return (
      <section className="py-20" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Mission Timeline
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">{title ?? "Our Mission"}</h2>
          <div className="mt-10 space-y-6">
            {blocks.map((block, index) => (
              <div key={`${index}-${block.slice(0, 20)}`} className="grid gap-4 md:grid-cols-[80px_1fr]">
                <div className="text-sm font-semibold text-gray-400">0{index + 1}</div>
                <div className={`border p-5 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}18` }}>
                  <p className="text-sm leading-relaxed text-gray-700">{block}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20" style={{ backgroundColor: theme.cardBackground }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className={`border p-8 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}20` }}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
            Story Focus
          </p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">{title ?? "Our Mission"}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
            {(paragraphs.length > 0 ? paragraphs : [body]).map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}