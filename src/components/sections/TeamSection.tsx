import EditableImage from "@/components/ui/EditableImage";
import type { TeamMember, SiteSettings } from "@/lib/cms-types";

interface Props {
  team: TeamMember[];
  settings: SiteSettings | null;
}

export default function TeamSection({ team, settings }: Props) {
  const primary = settings?.primary_color ?? "#CD7F32";

  if (team.length === 0) return null;

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
