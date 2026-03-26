import Image from "next/image";
import { isAllowedRemoteImageUrl } from "@/lib/image-hosts";

interface Props {
  src: string | null | undefined;
  alt: string | null | undefined;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  placeholder?: string;
}

export default function EditableImage({
  src,
  alt,
  width = 800,
  height = 600,
  className = "",
  fill = false,
  priority = false,
  placeholder = "/images/placeholder.svg",
}: Props) {
  const resolvedSrc = src || placeholder;
  const resolvedAlt = alt || "";
  // Use unoptimized for external CMS images from unknown domains to avoid
  // next.config.ts remotePatterns violations. Add more hosts there as needed.
  const unoptimized =
    typeof resolvedSrc === "string" &&
    resolvedSrc.startsWith("http") &&
    !isAllowedRemoteImageUrl(resolvedSrc);

  if (fill) {
    return (
      <Image
        src={resolvedSrc}
        alt={resolvedAlt}
        fill
        unoptimized={unoptimized}
        className={`object-cover ${className}`}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={resolvedAlt}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={className}
      priority={priority}
    />
  );
}
