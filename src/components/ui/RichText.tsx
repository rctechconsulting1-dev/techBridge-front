interface Props {
  html: string | null | undefined;
  className?: string;
}

export default function RichText({ html, className = "" }: Props) {
  if (!html) return null;
  return (
    <div
      className={`prose prose-gray max-w-none ${className}`}
      // Content comes from our own CMS — we control what's stored

      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
