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
    <section id="team" className="scroll-mt-16 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Meet the Team
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {team.map((member) => (
            <div key={member.id} className="text-center">
              {/* Photo */}
              <div className="relative mx-auto mb-4 h-40 w-40 overflow-hidden rounded-full shadow-md">
                {member.photo_url ? (
                  <EditableImage
                    src={member.photo_url}
                    alt={member.name}
                    fill
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
                  className="mb-3 text-sm font-medium"
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
                  className="inline-flex items-center gap-1 rounded-sm text-sm font-medium transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: primary }}
                >
                  LinkedIn
                  <svg
                    aria-hidden="true"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
