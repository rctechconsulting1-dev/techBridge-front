/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { Database } from "../../database.types";

type SidebarContextType = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  user: Database["public"]["Tables"]["user"]["Row"] | null;
  selectedClient: any | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
  setSelectedClient: (client: any) => void;
  setActiveUser: (user: any | null) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [user, setUser] = useState<Database["public"]["Tables"]["user"]["Row"] | null>(null);
  const [selectedClient, setClient] = useState<any>(null);

  useEffect(() => {
    try {
      const storedClient = localStorage.getItem("selected_client");
      if (storedClient) {
        setClient(JSON.parse(storedClient));
      }
    } catch {
      localStorage.removeItem("selected_client");
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedClient) {
        localStorage.setItem("selected_client", JSON.stringify(selectedClient));
      } else {
        localStorage.removeItem("selected_client");
      }
    } catch {
      // Ignore storage errors to avoid breaking UI state updates.
    }
  }, [selectedClient]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const toggleSubmenu = (item: string) => {
    setOpenSubmenu((prev) => (prev === item ? null : item));
  };

  const setSelectedClient = (client: any | null) => {
    setClient(client);
  };

  const setActiveUser = (user: Database["public"]["Tables"]["user"]["Row"] | null) => {
    setUser(user);
  };

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobileOpen,
        isHovered,
        activeItem,
        openSubmenu,
        user, // Placeholder for user data
        selectedClient,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
        setActiveItem,
        toggleSubmenu,
        setSelectedClient,
        setActiveUser,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
