import type { BuiltInThemePack, SiteSettings, TeamMember } from "@/lib/cms-types";
import { getHomeThemePackStyles } from "@/components/built-in/home/themePack";

interface Props {
  variant: string;
  themePack: BuiltInThemePack;
  team: TeamMember[];
  settings: SiteSettings | null;
}

export default function AboutTeamVariants({ variant, themePack, team, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";
  const theme = getHomeThemePackStyles(themePack);

  if (team.length === 0) {
    return null;
  }

  if (variant === "credibility_row") {
    return (
      <section id="team" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Team Credibility
            </p>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">The people behind the work</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {team.slice(0, 3).map((member) => (
              <div key={member.id} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}22` }}>
                <h3 className="text-2xl font-semibold text-gray-900">{member.name}</h3>
                {member.title ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>{member.title}</p> : null}
                {member.bio ? <p className="mt-4 text-sm leading-relaxed text-gray-600">{member.bio}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "founder_focus") {
    const lead = team[0];
    return (
      <section id="team" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.softBackground }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={`border p-8 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}22` }}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>Lead Voice</p>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">{lead.name}</h2>
              {lead.title ? <p className="mt-2 text-sm text-gray-500">{lead.title}</p> : null}
              {lead.bio ? <p className="mt-6 text-base leading-relaxed text-gray-600">{lead.bio}</p> : null}
            </div>
            <div className="grid gap-4">
              {team.slice(1, 4).map((member) => (
                <div key={member.id} className={`border p-5 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.cardBackground, borderColor: `${primary}18` }}>
                  <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                  {member.title ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>{member.title}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="team" className="scroll-mt-20 py-20" style={{ backgroundColor: theme.cardBackground }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>Team Profiles</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Meet the people doing the work</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {team.map((member) => (
            <div key={member.id} className={`border p-6 ${theme.panelRadiusClass}`} style={{ backgroundColor: theme.softBackground, borderColor: `${primary}22` }}>
              <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
              {member.title ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>{member.title}</p> : null}
              {member.bio ? <p className="mt-4 text-sm leading-relaxed text-gray-600">{member.bio}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}