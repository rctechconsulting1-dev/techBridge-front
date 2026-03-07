"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchUser } from "../../hooks/useSearchUser";


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
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  searchValue,
  isOpen,
  onClose,
  inputRef,
  onHandleSearchChosen,
}) => {
  // Context 
  const dropdownRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);


  // Hooks
  const { data } = useSearchUser(searchValue);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : prev
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

  const showResults = searchValue.trim().length > 0;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCtaClick = (user: any) => {
    onHandleSearchChosen(user);
    onClose();
  }
  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto dark:bg-gray-900 dark:border-gray-700"
    >
      {showResults && (data?.length ?? 0) > 0 && (
        <div className="p-2">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
            Search Results
          </div>
          {data?.map((result, index) => (
            <div
              key={result.id}
              onClick={() => handleCtaClick(result)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                index === selectedIndex
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {/* <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                {result.icon}
              </div> */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{result.name}</div>
                <div className="text-sm text-gray-500 truncate dark:text-gray-400">
                  {result.email}
                </div>
              </div>
              {/* <div className="text-xs text-gray-400 dark:text-gray-500">
                {result.category}
              </div> */}
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
