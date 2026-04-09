import type { BuiltInThemePack, SiteSettings, TeamMember } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  title: string | null;
  body: string | null;
  settings: SiteSettings | null;
  team: TeamMember[];
}

export default function AboutHeroVariants({ variant, themePack, title, body, settings, team }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);
  const leadMember = team[0] ?? null;
  const resolvedTitle = title ?? "About Us";

  if (variant === "centered_statement") {
    return (
      <section className="border-b border-gray-100 py-20 text-center" style={{ backgroundColor: theme.heroBackground }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
            Our Story
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
          {body ? <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
        </div>
      </section>
    );
  }

  if (variant === "credential_split") {
    return (
      <section className="border-b border-gray-100 py-20" style={{ backgroundColor: theme.heroBackground }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.9fr] lg:px-8">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
              Credibility First
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
            {body ? <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Team size</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">{team.length || 1}</p>
            </div>
            <div className={`p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground }}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Positioning</p>
              <p className="mt-3 text-lg font-semibold text-gray-900">Built for trust, clarity, and visible expertise.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-gray-100 py-20" style={{ backgroundColor: theme.heroBackground }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: primary }}>
            Founder Story
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">{resolvedTitle}</h1>
          {body ? <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">{body}</p> : null}
        </div>
        <div className={`border p-7 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}24` }}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Founder focus</p>
          <p className="mt-4 text-2xl font-semibold text-gray-900">{leadMember?.name ?? "Your lead expert"}</p>
          {leadMember?.title ? <p className="mt-2 text-sm text-gray-600">{leadMember.title}</p> : null}
          {leadMember?.bio ? <p className="mt-4 text-sm leading-relaxed text-gray-600">{leadMember.bio}</p> : null}
        </div>
      </div>
    </section>
  );
}