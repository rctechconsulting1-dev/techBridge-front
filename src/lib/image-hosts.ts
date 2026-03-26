const DEFAULT_REMOTE_IMAGE_HOSTS = [
  "techconsulting-rc.s3.us-west-1.amazonaws.com",
  "images.pexels.com",
];

const parseRemoteImageHosts = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
};

export const REMOTE_IMAGE_HOSTS = Array.from(
  new Set([
    ...DEFAULT_REMOTE_IMAGE_HOSTS,
    ...parseRemoteImageHosts(process.env.NEXT_PUBLIC_IMAGE_HOSTS),
    ...parseRemoteImageHosts(process.env.IMAGE_REMOTE_HOSTS),
  ]),
);

export const getRemoteImagePatterns = () =>
  REMOTE_IMAGE_HOSTS.map((hostname) => ({
    protocol: "https" as const,
    hostname,
    port: "",
    pathname: "/**",
  }));

export const isAllowedRemoteImageUrl = (src: string): boolean => {
  try {
    const { hostname, protocol } = new URL(src);
    if (protocol !== "https:" && protocol !== "http:") {
      return false;
    }

    return REMOTE_IMAGE_HOSTS.includes(hostname.toLowerCase());
  } catch {
    return false;
  }
};
