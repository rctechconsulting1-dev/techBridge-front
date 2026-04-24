import type { FooterNavLink, Page, PageNavigationAssignment, SiteSettings } from "@/lib/cms-types";

export type NavigationPlacement = "header" | "footer";

export type NavigationItem =
  | { type: "link"; label: string; href: string }
  | {
      type: "dropdown";
      label: string;
      href: string;
      children: Array<{ label: string; href: string }>;
    };

type ResolvedNavigationAssignment = Pick<
  PageNavigationAssignment,
  "placement" | "style" | "parent_page_id" | "label" | "sort_order" | "is_active"
>;

const HEADER_FALLBACK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const FOOTER_FALLBACK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const BUILT_IN_ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/services": "Services",
  "/about": "About",
  "/shop": "Shop",
};

const anchorAliases: Record<string, string> = {
  "#why-us": "#services",
  "#reviews": "#testimonials",
};

const normalizePath = (value: string | null | undefined) => {
  if (!value) {
    return "/";
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;
  return normalized.replace(/\/+$/, "") || "/";
};

const resolveHref = (websiteId: string | number, href: string) => {
  const base = `/sites/${websiteId}`;
  if (!href) return base;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/sites/")) return href;
  if (href.startsWith("#")) {
    const normalizedAnchor = anchorAliases[href.toLowerCase()] ?? href;
    return `${base}${normalizedAnchor}`;
  }
  if (href === "/") return base;
  return `${base}${href.startsWith("/") ? href : `/${href}`}`;
};

const isBuiltInRoute = (href: string) => {
  const normalized = normalizePath(href.split(/[?#]/)[0]);
  return normalized in BUILT_IN_ROUTE_LABELS;
};

const sanitizeConfiguredLinks = (
  links: FooterNavLink[] | null | undefined,
  placement: NavigationPlacement,
  ecommerceEnabled: boolean,
) => {
  return (links ?? [])
    .filter((link) => !!link?.label && !!link?.href)
    .filter((link) => ecommerceEnabled || !String(link.href).includes("/shop"))
    .filter((link) =>
      placement === "header"
        ? link.location !== "footer"
        : link.location !== "header",
    )
    .map((link) => ({
      label: String(link.label),
      href: String(link.href),
    }));
};

const getFallbackLinks = (
  placement: NavigationPlacement,
  ecommerceEnabled: boolean,
) => {
  const source = placement === "header" ? HEADER_FALLBACK_LINKS : FOOTER_FALLBACK_LINKS;
  return source.filter((link) => ecommerceEnabled || link.href !== "/shop");
};

const getAssignmentsForPlacement = (
  page: Page,
  placement: NavigationPlacement,
): ResolvedNavigationAssignment[] => {
  if (Array.isArray(page.navigation_assignments) && page.navigation_assignments.length > 0) {
    return page.navigation_assignments
      .filter((assignment) => assignment.placement === placement)
      .filter((assignment) => assignment.is_active !== false)
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  }

  if ((page.nav_placement ?? (page.is_main_nav ? "header" : "hidden")) !== placement) {
    return [];
  }

  return [
    {
      placement,
      style: page.nav_style ?? (page.parent_id ? "dropdown_child" : "direct"),
      parent_page_id: page.nav_parent_id ?? null,
      label: page.nav_label ?? null,
      sort_order: page.nav_order ?? page.sort_order ?? 0,
      is_active: page.is_enabled ?? true,
    },
  ];
};

export function buildNavigationItems({
  websiteId,
  settings,
  pages,
  placement,
}: {
  websiteId: string | number;
  settings: SiteSettings | null;
  pages?: Page[] | null;
  placement: NavigationPlacement;
}): NavigationItem[] {
  const ecommerceEnabled = settings?.ecommerce_enabled ?? false;
  const configuredLinks = sanitizeConfiguredLinks(
    placement === "header"
      ? settings?.header_nav_links
      : settings?.footer_nav_links,
    placement,
    ecommerceEnabled,
  );

  const pageAssignments = (pages ?? [])
    .filter((page) => page.is_published && (page.is_enabled ?? true))
    .flatMap((page) =>
      getAssignmentsForPlacement(page, placement).map((assignment) => ({ page, assignment })),
    )
    .sort((left, right) => (left.assignment.sort_order ?? 0) - (right.assignment.sort_order ?? 0));

  const itemByPath = new Map<string, NavigationItem>();
  for (const { page, assignment } of pageAssignments) {
    const pagePath = normalizePath(page.path || `/${page.slug}`);
    const label = assignment.label || page.title || page.slug;
    const style = assignment.style;

    if (style === "dropdown_child") {
      continue;
    }

    if (placement === "header" && style === "dropdown_parent") {
      const children = pageAssignments
        .filter((candidate) => candidate.assignment.style === "dropdown_child")
        .filter((candidate) => (candidate.assignment.parent_page_id ?? candidate.page.parent_id) === page.id)
        .map((candidate) => ({
          label: candidate.assignment.label || candidate.page.title || candidate.page.slug,
          href: resolveHref(websiteId, candidate.page.path || `/${candidate.page.slug}`),
        }));

      itemByPath.set(
        pagePath,
        children.length > 0
          ? {
              type: "dropdown",
              label,
              href: resolveHref(websiteId, pagePath),
              children,
            }
          : {
              type: "link",
              label,
              href: resolveHref(websiteId, pagePath),
            },
      );
      continue;
    }

    itemByPath.set(pagePath, {
      type: "link",
      label,
      href: resolveHref(websiteId, pagePath),
    });
  }

  const orderedItems: NavigationItem[] = [];
  const seenHrefs = new Set<string>();
  const pushItem = (item: NavigationItem | null) => {
    if (!item || seenHrefs.has(item.href)) {
      return;
    }
    seenHrefs.add(item.href);
    orderedItems.push(item);
  };

  const scaffold = configuredLinks.length > 0 ? configuredLinks : getFallbackLinks(placement, ecommerceEnabled);

  for (const link of scaffold) {
    const normalizedPath = normalizePath(link.href.split(/[?#]/)[0]);

    if (isBuiltInRoute(link.href)) {
      pushItem({
        type: "link",
        label: link.label || BUILT_IN_ROUTE_LABELS[normalizedPath],
        href: resolveHref(websiteId, normalizedPath),
      });
      continue;
    }

    const pageItem = itemByPath.get(normalizedPath);
    if (pageItem) {
      pushItem(pageItem);
      continue;
    }

    pushItem({
      type: "link",
      label: link.label,
      href: resolveHref(websiteId, link.href),
    });
  }

  for (const item of itemByPath.values()) {
    pushItem(item);
  }

  return orderedItems;
}