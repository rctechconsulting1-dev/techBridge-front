import EditableImage from "@/components/ui/EditableImage";
import type { TeamMember, SiteSettings } from "@/lib/cms-types";
import type { TeamSectionVariant } from "@/components/sections/sectionVariants";

interface Props {
  team: TeamMember[];
  settings: SiteSettings | null;
  variant?: TeamSectionVariant;
}

export default function TeamSection({ team, settings, variant = "portrait_grid" }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";

  if (team.length === 0) return null;

  if (variant === "editorial_list") {
    return (
      <section id="team" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Team
            </p>
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">Put real people in front of the trust story</h2>
          </div>
          <div className="space-y-8">
            {team.map((member) => (
              <div key={member.id} className="grid gap-6 rounded-[2rem] border border-gray-200 bg-[#FCFAF7] p-6 sm:p-8 lg:grid-cols-[220px_1fr] lg:items-center">
                <div className="relative h-52 overflow-hidden rounded-[1.5rem] bg-gray-100">
                  {member.photo_url ? (
                    <EditableImage src={member.photo_url} alt={member.name} fill className="object-cover" />
                  ) : (
                    <div aria-label={member.name} className="flex h-full w-full items-center justify-center text-4xl font-bold text-white" style={{ backgroundColor: primary }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">{member.name}</h3>
                  {member.title ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>{member.title}</p> : null}
                  {member.bio ? <p className="mt-4 text-base leading-relaxed text-gray-600">{member.bio}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "compact_cards") {
    return (
      <section id="team" className="scroll-mt-20 bg-[#F8F2EA] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: primary }}>
              Meet the Team
            </p>
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">Real people, clearer credibility</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div key={member.id} className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-sm">
                <div className="relative mb-4 aspect-square overflow-hidden rounded-[1.25rem] bg-gray-100">
                  {member.photo_url ? (
                    <EditableImage src={member.photo_url} alt={member.name} fill className="object-cover" />
                  ) : (
                    <div aria-label={member.name} className="flex h-full w-full items-center justify-center text-4xl font-bold text-white" style={{ backgroundColor: primary }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                {member.title ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: primary }}>{member.title}</p> : null}
                {member.bio ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{member.bio}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="team" className="scroll-mt-20 bg-[#FDF8F3] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: primary }}
          >
            The People
          </p>
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Meet the Team
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {team.map((member) => (
            <div key={member.id} className="text-center">
              {/* Photo */}
              <div className="relative mx-auto mb-5 h-44 w-44 overflow-hidden">
                {member.photo_url ? (
                  <EditableImage
                    src={member.photo_url}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    aria-label={member.name}
                    className="flex h-full w-full items-center justify-center text-4xl font-bold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <h3 className="mb-1 text-lg font-bold text-gray-900">
                {member.name}
              </h3>
              {member.title && (
                <p
                  className="mb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: primary }}
                >
                  {member.title}
                </p>
              )}
              {member.bio && (
                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                  {member.bio}
                </p>
              )}
              {member.linkedin_url && (
                <a
                  href={member.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name}'s LinkedIn profile (opens in new tab)`}
                  className="text-xs font-semibold uppercase tracking-wide underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: primary }}
                >
                  LinkedIn
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
