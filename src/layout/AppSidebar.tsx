"use client";
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import {
  createEntitlementSnapshot,
  hasAnyFeature,
  hasAnyModule,
  normalizeEntitlementValues,
} from "@/lib/entitlements";
import {
  BoltIcon,
  ChevronDownIcon,
  FileIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PlugInIcon,
  UserCircleIcon,
  VideoIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  requiredModules?: string[];
  requiredFeatures?: string[];
  requiredRoles?: string[];
  subItems?: {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    external?: boolean;
  }[];
};

const navItems: NavItem[] = [
  {
    name: "AI Tools",
    icon: <FileIcon />,
    subItems: [{ name: "Content Prompts", path: "/chat-gpt", pro: false }],
  },
  {
    name: "AI Agent",
    icon: <BoltIcon />,
    requiredModules: ["custom_ai_agent"],
    subItems: [
      { name: "Leads",    path: "/ai-leads" },
      { name: "Settings", path: "/ai-agent-settings" },
    ],
  },
  {
    name: "Google Business",
    icon: <PlugInIcon />,
    path: "/google-business",
    requiredModules: ["google_business_management"],
  },
  {
    name: "Marketing",
    icon: <PageIcon />,
    requiredModules: ["google_ads_optimization"],
    subItems: [
      { name: "Performance", path: "/marketing" },
      { name: "Ad Requests", path: "/marketing/requests" },
      { name: "Workflow Runs", path: "/marketing/workflow-runs" },
      { name: "Content", path: "/marketing/content" },
    ],
  },
  {
    icon: <VideoIcon />,
    name: "Assets",
    path: "/assets",
  },
  {
    icon: <UserCircleIcon />,
    name: "Tenants",
    path: "/tenants",
    requiredRoles: ["admin", "platform_admin"],
  },
  {
    icon: <ListIcon />,
    name: "Payment Config",
    path: "/payment-config",
    requiredRoles: [
      "admin",
      "platform_admin",
      "tenant_owner",
      "tenant_manager",
    ],
  },
  {
    icon: <ListIcon />,
    name: "Onboarding",
    path: "/onboarding",
    requiredRoles: ["admin", "platform_admin"],
  },
  {
    name: "Site Content",
    icon: <PageIcon />,
    subItems: [
      { name: "Built-in Pages", path: "/built-in-pages", pro: false },
      { name: "Managed Pages", path: "/managed-pages", pro: false },
      { name: "Custom Pages", path: "/main-page", pro: false },
      { name: "Location Pages", path: "/location-pages", pro: false },
      { name: "Branding", path: "/branding", pro: false },
      { name: "Global Site Settings", path: "/site-settings", pro: false },
      { name: "Testimonials", path: "/content-testimonials", pro: false },
      { name: "FAQ Content", path: "/content-faq", pro: false },
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin?next=/admin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const SUBMENU_STORAGE_KEY = "sidebar_open_submenu";

const AppSidebar = ({}) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [websiteId, setWebsiteId] = useState<number | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);
  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getSession().then((user) => {
      const u = user as {
        website_id?: number;
        enabledModules?: string[];
        enabledFeatures?: string[];
        role?: string;
      } | null;
      if (u?.website_id) setWebsiteId(u.website_id);
      if (Array.isArray(u?.enabledModules)) {
        setEnabledModules(normalizeEntitlementValues(u.enabledModules));
      }
      if (Array.isArray(u?.enabledFeatures)) {
        setEnabledFeatures(normalizeEntitlementValues(u.enabledFeatures));
      }
      if (u?.role) {
        setCurrentRole(u.role);
      }
    });
  }, []);

  const entitlementSnapshot = createEntitlementSnapshot(
    enabledModules,
    enabledFeatures,
  );

  const shouldShowNavItem = useCallback(
    (item: NavItem): boolean => {
      const hasEntitlementPayload =
        (enabledModules && enabledModules.length > 0) ||
        (enabledFeatures && enabledFeatures.length > 0);

      // Keep backward-compatible behavior while backend entitlement payloads are rolling out.
      if (!hasEntitlementPayload) {
        if (item.requiredRoles?.length) {
          return currentRole ? item.requiredRoles.includes(currentRole) : false;
        }
        return true;
      }

      const roleAllowed = item.requiredRoles?.length
        ? currentRole
          ? item.requiredRoles.includes(currentRole)
          : false
        : true;

      return (
        roleAllowed &&
        hasAnyModule(entitlementSnapshot, item.requiredModules) &&
        hasAnyFeature(entitlementSnapshot, item.requiredFeatures)
      );
    },
    [currentRole, enabledModules, enabledFeatures, entitlementSnapshot],
  );

  const computedNavItems = useMemo(
    () =>
      navItems
        .filter((item) => shouldShowNavItem(item))
        .map((item) => {
          if (item.name === "Site Content") {
            return {
              ...item,
              subItems: [
                ...(item.subItems || []),
                ...(websiteId
                  ? [
                      {
                        name: "Landing Page",
                        path: `/sites/${websiteId}`,
                        pro: false,
                        new: false,
                        external: true,
                      },
                    ]
                  : []),
              ],
            };
          }

          return item;
        }),
    [shouldShowNavItem, websiteId],
  );

  const computedOthersItems = useMemo(
    () => othersItems.filter((item) => shouldShowNavItem(item)),
    [shouldShowNavItem],
  );

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others",
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "text-brand-500 rotate-180"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 ml-9 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                      target={subItem.external ? "_blank" : undefined}
                      rel={subItem.external ? "noopener noreferrer" : undefined}
                    >
                      {subItem.name}
                      <span className="ml-auto flex items-center gap-1">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  // Restore from localStorage before first paint so the height effect fires
  // via a real state transition (lazy initializer skips the effect).
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(SUBMENU_STORAGE_KEY);
      if (stored) setOpenSubmenu(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Persist submenu open state across navigation
  useEffect(() => {
    try {
      if (openSubmenu === null) {
        localStorage.removeItem(SUBMENU_STORAGE_KEY);
      } else {
        localStorage.setItem(SUBMENU_STORAGE_KEY, JSON.stringify(openSubmenu));
      }
    } catch {
      // ignore storage errors
    }
  }, [openSubmenu]);

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    let matchedSubmenu: { type: "main" | "others"; index: number } | null = null;
    // If a submenu item matches the current route, open its parent.
    // When no match is found we leave the current state alone so the
    // user’s manually opened section persists across navigation.
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? computedNavItems : computedOthersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (!matchedSubmenu && isActive(subItem.path)) {
              matchedSubmenu = {
                type: menuType as "main" | "others",
                index,
              };
            }
          });
        }
      });
    });

    if (!matchedSubmenu) {
      return;
    }

    const targetSubmenu: { type: "main" | "others"; index: number } =
      matchedSubmenu;

    setOpenSubmenu((currentOpenSubmenu) => {
      if (
        currentOpenSubmenu?.type === targetSubmenu.type &&
        currentOpenSubmenu?.index === targetSubmenu.index
      ) {
        return currentOpenSubmenu;
      }

      return targetSubmenu;
    });
  }, [computedNavItems, computedOthersItems, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(computedNavItems, "main")}
            </div>

            {computedOthersItems.length > 0 ? (
              <div>
                <h2
                  className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Others"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(computedOthersItems, "others")}
              </div>
            ) : null}
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
