import type { BlogListSectionVariant } from '@/components/sections/sectionVariants';

interface BlogListVariantPreviewProps {
  variant: BlogListSectionVariant;
  className?: string;
}

const samplePosts = [
  {
    eyebrow: 'Featured',
    title: 'How to plan a trust-building local content rhythm',
    summary: 'Lead with the strongest article, then keep the next posts obvious and easy to scan.',
  },
  {
    eyebrow: 'Guide',
    title: 'What homeowners compare before they contact you',
    summary: 'Turn common objections into compact, readable article previews.',
  },
  {
    eyebrow: 'Checklist',
    title: 'The service-area page details that improve conversion',
    summary: 'Use short summaries that signal useful detail without wall-of-text previews.',
  },
];

export default function BlogListVariantPreview({
  variant,
  className = '',
}: BlogListVariantPreviewProps) {
  if (variant === 'featured_stack') {
    return (
      <div className={`rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 ${className}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">Preview</p>
            <h4 className="mt-1 text-sm font-semibold text-slate-900">Featured Stack</h4>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700 shadow-sm">Lead article first</span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 h-24 rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-slate-600" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">Featured Post</p>
            <h5 className="mt-2 text-sm font-semibold text-slate-900">{samplePosts[0].title}</h5>
            <p className="mt-2 text-xs leading-5 text-slate-600">{samplePosts[0].summary}</p>
          </div>
          <div className="space-y-3">
            {samplePosts.slice(1).map((post) => (
              <div key={post.title} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{post.eyebrow}</p>
                <h5 className="mt-1 text-xs font-semibold text-slate-900">{post.title}</h5>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">{post.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact_rows') {
    return (
      <div className={`rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 ${className}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Preview</p>
            <h4 className="mt-1 text-sm font-semibold text-slate-900">Compact Rows</h4>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm">Scan-first layout</span>
        </div>
        <div className="space-y-2">
          {samplePosts.map((post, index) => (
            <div key={post.title} className="grid items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm md:grid-cols-[36px_1fr_auto]">
              <span className="text-xs font-semibold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h5 className="text-xs font-semibold text-slate-900">{post.title}</h5>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">{post.summary}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Read</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700">Preview</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900">Editorial Grid</h4>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-sky-700 shadow-sm">Balanced default</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {samplePosts.map((post) => (
          <div key={post.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-20 bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500" />
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">{post.eyebrow}</p>
              <h5 className="mt-1 text-xs font-semibold text-slate-900">{post.title}</h5>
              <p className="mt-2 text-[11px] leading-5 text-slate-600">{post.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}