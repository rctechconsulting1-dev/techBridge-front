import type { BuiltInThemePack } from "@/lib/cms-types";

type HomeThemePackStyles = {
  heroBackground: string;
  softBackground: string;
  mutedBackground: string;
  cardBackground: string;
  darkSurface: string;
  badgeSurface: string;
  buttonRadiusClass: string;
  panelRadiusClass: string;
};

const HOME_THEME_PACK_STYLES: Record<BuiltInThemePack, HomeThemePackStyles> = {
  modern_service: {
    heroBackground: "#F8F2EA",
    softBackground: "#FAF6F0",
    mutedBackground: "#F7F3ED",
    cardBackground: "#FFFFFF",
    darkSurface: "#111827",
    badgeSurface: "#FFFFFF",
    buttonRadiusClass: "rounded-full",
    panelRadiusClass: "rounded-[2rem]",
  },
  professional_authority: {
    heroBackground: "#F3EEE7",
    softBackground: "#F7F2EB",
    mutedBackground: "#EEE7DE",
    cardBackground: "#FCFAF7",
    darkSurface: "#0F172A",
    badgeSurface: "#F8F5F0",
    buttonRadiusClass: "rounded-xl",
    panelRadiusClass: "rounded-[1.75rem]",
  },
  warm_local: {
    heroBackground: "#FFEFD5",
    softBackground: "#FFF5E6",
    mutedBackground: "#FFE8C0",
    cardBackground: "#FFFAF2",
    darkSurface: "#5C3B24",
    badgeSurface: "#FFF4E0",
    buttonRadiusClass: "rounded-2xl",
    panelRadiusClass: "rounded-[2rem]",
  },
  high_contrast_conversion: {
    heroBackground: "#FFF2E8",
    softBackground: "#FFF7F1",
    mutedBackground: "#FFE7D6",
    cardBackground: "#FFFFFF",
    darkSurface: "#111827",
    badgeSurface: "#FFF1E5",
    buttonRadiusClass: "rounded-lg",
    panelRadiusClass: "rounded-[1.5rem]",
  },
};

export const getHomeThemePackStyles = (themePack: BuiltInThemePack) => {
  return HOME_THEME_PACK_STYLES[themePack] ?? HOME_THEME_PACK_STYLES.modern_service;
};