"use client";
import React, { useState, useEffect, useRef } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUser } from "../../hooks/useSearchUser";
import { useTenants, Tenant } from "../../hooks/useTenants";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  icon?: React.ReactNode;
}

interface SearchDropdownProps {
  searchValue: string;
  isOpen: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHandleSearchChosen: (user: any) => void;
  onHandleTenantChosen: (tenant: Tenant) => void;
  fetchAll?: boolean;
  isAdmin?: boolean;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  searchValue,
  isOpen,
  onClose,
  inputRef,
  onHandleSearchChosen,
  onHandleTenantChosen,
  fetchAll = false,
  isAdmin = false,
}) => {
  // Context
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [filteredResults, _setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounced search value – avoids firing an API request on every keystroke
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // Hooks
  const { data } = useSearchUser(debouncedSearchValue, fetchAll);
  const { data: tenants } = useTenants(isAdmin);

  const filteredTenants = tenants?.filter((t) => {
    if (!searchValue.trim()) return true;
    const q = searchValue.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.slug?.toLowerCase().includes(q) ||
      t.owner_email?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0 && filteredResults[selectedIndex]) {
            // Handle navigation or action
            window.location.href = filteredResults[selectedIndex].url;
          }
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredResults, onClose, inputRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, inputRef]);

  if (!isOpen) return null;

  const showResults = fetchAll || searchValue.trim().length > 0;
  const showTenants = isAdmin && (filteredTenants?.length ?? 0) > 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCtaClick = (user: any) => {
    onHandleSearchChosen(user);
    onClose();
  };

  const handleTenantClick = (tenant: Tenant) => {
    onHandleTenantChosen(tenant);
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      {showTenants && (
        <div className="p-2">
          <div className="px-3 py-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Clients
          </div>
          {filteredTenants?.map((tenant) => (
            <div
              key={tenant.id}
              onClick={() => handleTenantClick(tenant)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <div className="bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {tenant.name?.charAt(0).toUpperCase() ?? "T"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{tenant.name}</div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {tenant.owner_email ?? tenant.slug}
                </div>
              </div>
              {tenant.status && (
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    tenant.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {tenant.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {showTenants && showResults && (data?.length ?? 0) > 0 && (
        <div className="mx-2 border-t border-gray-100 dark:border-gray-800" />
      )}
      {showResults && (data?.length ?? 0) > 0 && (
        <div className="p-2">
          <div className="px-3 py-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Users
          </div>
          {data?.map((result, index) => (
            <div
              key={result.id}
              onClick={() => handleCtaClick(result)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                index === selectedIndex
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{result.name}</div>
                <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                  {result.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/*
      {showQuickActions && (
        <div className="p-2">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
            {searchValue.trim() ? "Quick Actions" : "Recent"}
          </div>
          {(searchValue.trim() ? quickActions : searchData.slice(0, 4)).map((item, index) => (
            <Link
              key={item.id}
              href={item.url}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                index === selectedIndex
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-sm text-gray-500 truncate dark:text-gray-400">
                  {item.description}
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {item.category}
              </div>
            </Link>
          ))}
        </div>
      )} */}

      {/* {showResults && filteredResults.length === 0 && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.485 0-4.735.907-6.47 2.408.364-.215.751-.406 1.157-.571A8 8 0 1120.723 18.33z" />
          </svg>
          <div className="font-medium">No results found</div>
          <div className="text-sm">Try adjusting your search terms</div>
        </div>
      )} */}

      {/* <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default SearchDropdown;
