"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { type MDXEditorMethods } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import Link from "next/link";

import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import SeoMetadata from "@/components/form/form-elements/SeoMetadata";
import Alert from "@/components/ui/alert/Alert";
import PageOrganizer from "@/components/page-manager/PageOrganizer";
import PageCreationWithImages from "@/components/page-manager/PageCreationWithImages";
import EditorSection from "@/components/page-manager/EditorSection";

import { useSidebar } from "@/context/SidebarContext";
import { useFormValidation } from "@/hooks/useFormValidation";
import { usePageManager } from "@/hooks/usePageManager";
import { PageCreationData } from "@/types/page";
import PageBreadcrumb from "../../../../../components/common/PageBreadCrumb";
import { getApiBaseUrl } from "@/lib/api";
import { getActiveTenantId } from "@/lib/auth-context";

const DEFAULT_MARKDOWN = `
Enter Content Here,
Open ChatGPT and ask it to write down the content you want to add here.
Ex.
Give me content using SEO best practices. For company [Name] for the service []
`;

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const activeTenantId = getActiveTenantId();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { "x-tenant-id": String(activeTenantId) } : {}),
  };
};

export default function FormMain() {
  // Context
  const { selectedClient } = useSidebar();
  
  // State
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [viewMode, setViewMode] = useState<'organizer' | 'editor'>('organizer');
  const [requiredNavSlugs, setRequiredNavSlugs] = useState<string[]>([]);
  const [selectedMissingSlug, setSelectedMissingSlug] = useState<string>("");
  const [initialPageDraft, setInitialPageDraft] = useState<
    { slug: string; title: string; is_published?: boolean } | undefined
  >(undefined);
  
  // Refs
  const editorRef = useRef<MDXEditorMethods>(null);
  
  // Custom hooks
  const { formData, errors, handleInputChange, validateAllFields, resetForm, updateFormData } = useFormValidation();
  
  const { 
    selectedPage,
    seoData,
    content,
    mainNavPages,
    servicePages,
    blogPosts,
    galleryPages,
    customPages,
    setContent,
    selectPage,
    savePage,
    createNewPage,
    refreshPages,
  } = usePageManager({
    websiteId: selectedClient?.website_id || null,
    onSuccess: handleSaveSuccess,
  });

  const loadNavRequirements = useCallback(async () => {
    const websiteId = selectedClient?.website_id;
    if (!websiteId) {
      setRequiredNavSlugs([]);
      return;
    }

    const builtInPaths = new Set(["/", "/services", "/about", "/shop"]);

    const toSlugFromHref = (href: string): string | null => {
      const trimmed = href.trim().toLowerCase();
      if (!trimmed) return null;
      if (trimmed.startsWith("#")) return null;
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return null;
      }
      if (!trimmed.startsWith("/")) return null;
      if (builtInPaths.has(trimmed)) return null;
      const [pathOnly] = trimmed.split(/[?#]/);
      const clean = pathOnly.replace(/^\/+|\/+$/g, "");
      if (!clean || clean.includes("/")) return null;
      return clean;
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/site-settings/${websiteId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setRequiredNavSlugs([]);
        return;
      }

      const settings = (await res.json()) as {
        header_nav_links?: Array<{ href?: string }> | null;
        footer_nav_links?: Array<{ href?: string; location?: string }> | null;
      } | null;

      if (!settings) {
        setRequiredNavSlugs([]);
        return;
      }

      const headerLinks = Array.isArray(settings.header_nav_links)
        ? settings.header_nav_links
        : [];

      const legacyHeaderLinks = Array.isArray(settings.footer_nav_links)
        ? settings.footer_nav_links.filter((l) => l.location === "header")
        : [];

      const sourceLinks =
        headerLinks.length > 0 ? headerLinks : legacyHeaderLinks;

      const slugs = Array.from(
        new Set(
          sourceLinks
            .map((l) => toSlugFromHref(l.href ?? ""))
            .filter((s): s is string => !!s),
        ),
      );

      setRequiredNavSlugs(slugs);
    } catch {
      setRequiredNavSlugs([]);
    }
  }, [selectedClient?.website_id]);

  // Update form data when SEO data changes
  useEffect(() => {
    loadNavRequirements();
  }, [loadNavRequirements]);

  useEffect(() => {
    if (showAlert) {
      void loadNavRequirements();
    }
  }, [showAlert, loadNavRequirements]);

  useEffect(() => {
    if (seoData) {
      updateFormData({
        seoTitle: seoData.meta_title || "",
        seoKeywords: seoData.keywords || "",
        seoDescription: seoData.meta_description || "",
        title: selectedPage?.title || "",
        slug: selectedPage?.slug || "",
      });
    }
  }, [seoData, selectedPage, updateFormData]);

  // Handlers
  const handleCreatePage = useCallback(() => {
    setInitialPageDraft(undefined);
    setShowCreationWizard(true);
    setViewMode('editor');
  }, []);

  const toTitleFromSlug = useCallback((slug: string) => {
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, []);

  const handleCreateMissingPage = useCallback(() => {
    if (!selectedMissingSlug) return;
    setInitialPageDraft({
      slug: selectedMissingSlug,
      title: toTitleFromSlug(selectedMissingSlug),
      is_published: true,
    });
    setShowCreationWizard(true);
    setViewMode("editor");
  }, [selectedMissingSlug, toTitleFromSlug]);

  const handleCreatePageSubmit = useCallback(async (data: PageCreationData & { content?: string }) => {
    try {
      const result = await createNewPage(data);
      
      if (result?.response) {
        await refreshPages();
        await loadNavRequirements();

        let createdPageId: number | null = null;
        if (Array.isArray(result.response) && result.response.length > 0) {
          createdPageId = Number((result.response[0] as { id?: number }).id || 0) || null;
        } else if (typeof result.response === "object" && result.response !== null) {
          const responseObj = result.response as { id?: number; page?: { id?: number } };
          createdPageId = Number(responseObj.id || responseObj.page?.id || 0) || null;
        }

        if (createdPageId) {
          selectPage(createdPageId);
          setViewMode("editor");
        }

        // Don't hide creation wizard immediately - let PageCreationWithImages handle its own lifecycle
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        
        // If AI content was used, switch to editor view with the new page
        if (data.content) {
          setViewMode('editor');
        }
        
        return result;
      } else {
        console.error('Failed to create page - no response:', result);
        return result;
      }
    } catch (error) {
      console.error('Error in handleCreatePageSubmit:', error);
      throw error;
    }
  }, [createNewPage, refreshPages, loadNavRequirements, selectPage]);

  const handlePageSelect = useCallback((pageId: number) => {
    selectPage(pageId);
    setViewMode('editor');
  }, [selectPage]);

  const handleDescriptionChange = useCallback((value: string) => {
    handleInputChange("seoDescription", value);
  }, [handleInputChange]);

  function handleSaveSuccess() {
    resetForm();
    setContent("");
    setShowAlert(true);
    
    if (editorRef.current) {
      editorRef.current.setMarkdown(DEFAULT_MARKDOWN);
    }
  }

  const handleSavePage = useCallback(async () => {
    const isValid = validateAllFields();
    const isContentValid = content.trim().length > 0;
    
    if (isValid && isContentValid) {
      await savePage(formData, selectedClient?.website_id);
    } else {
      console.error("Form validation failed", errors);
    }
  }, [validateAllFields, content, savePage, formData, selectedClient?.website_id, errors]);

  const shouldShowSeoMetadata = showCreationWizard || !!seoData;
  const allPages = [
    ...mainNavPages,
    ...servicePages,
    ...blogPosts,
    ...galleryPages,
    ...customPages,
  ];

  const pageBySlug = new Map(
    allPages
      .filter((p) => !!p.slug)
      .map((p) => [String(p.slug).toLowerCase(), p]),
  );

  const missingNavPages = requiredNavSlugs.filter((slug) => !pageBySlug.has(slug));
  const unpublishedNavPages = requiredNavSlugs.filter((slug) => {
    const page = pageBySlug.get(slug);
    return !!page && !page.is_published;
  });
  const resolvedNavPages = requiredNavSlugs.filter((slug) => {
    const page = pageBySlug.get(slug);
    return !!page && !!page.is_published;
  });

  useEffect(() => {
    if (missingNavPages.length === 0) {
      setSelectedMissingSlug("");
      return;
    }
    if (!selectedMissingSlug || !missingNavPages.includes(selectedMissingSlug)) {
      setSelectedMissingSlug(missingNavPages[0]);
    }
  }, [missingNavPages, selectedMissingSlug]);

  return (
    <div>
      {showAlert && (
        <div className="fixed top-4 right-4 z-50">
          <Alert
            variant="success"
            title="Insert was successful"
            message="Your changes have been saved."
            timeout={5000}
            onClose={() => setShowAlert(false)}
          />
        </div>
      )}
      
      <PageBreadcrumb pageTitle="Custom Pages" />
      
      {/* View Toggle */}
      <div className="mb-6 flex gap-4">
        <Button
          variant={viewMode === 'organizer' ? 'primary' : 'outline'}
          onClick={() => setViewMode('organizer')}
        >
          Page Organizer
        </Button>
        <Button
          variant={viewMode === 'editor' ? 'primary' : 'outline'}
          onClick={() => setViewMode('editor')}
        >
          Page Editor
        </Button>
      </div>

      <ComponentCard title="Custom Nav Page Coverage">
        {requiredNavSlugs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No custom /slug links found in Header Navigation. Add links like /why-us in Global Site Settings to track required custom pages here.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadNavRequirements()}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Refresh From Global Site Settings
              </button>
              <Link
                href="/site-settings"
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open Global Site Settings
              </Link>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              These custom header links require a published page to avoid 404s. Built-in routes like /, /services, /about, and /shop are handled separately.
            </p>
            <div className="flex flex-wrap gap-2">
              {requiredNavSlugs.map((slug) => {
                const isMissing = missingNavPages.includes(slug);
                const isUnpublished = unpublishedNavPages.includes(slug);
                const statusClass = isMissing || isUnpublished
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800";
                const statusText = isMissing
                  ? "Missing"
                  : isUnpublished
                    ? "Draft"
                    : "Ready";

                return (
                  <span
                    key={slug}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    /{slug} - {statusText}
                  </span>
                );
              })}
            </div>
            {(missingNavPages.length > 0 || unpublishedNavPages.length > 0) && (
              <p className="text-xs text-gray-500">
                Missing or draft pages detected. Create/select those slugs below and publish them to remove 404s.
              </p>
            )}
            {missingNavPages.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-amber-800">
                    Missing slug to create
                  </label>
                  <select
                    className="rounded border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900"
                    value={selectedMissingSlug}
                    onChange={(e) => setSelectedMissingSlug(e.target.value)}
                  >
                    {missingNavPages.map((slug) => (
                      <option key={slug} value={slug}>
                        /{slug}
                      </option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={handleCreateMissingPage}>
                  Create Selected Custom Page
                </Button>
              </div>
            )}
            {resolvedNavPages.length === requiredNavSlugs.length && requiredNavSlugs.length > 0 && (
              <p className="text-xs text-emerald-700">
                All custom header links are backed by published custom pages.
              </p>
            )}
          </div>
        )}
      </ComponentCard>

      <ComponentCard title="Built-in Versus Custom Pages">
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Use <strong>Built-in Pages</strong> for the platform-managed routes: <strong>/</strong>, <strong>/services</strong>, <strong>/about</strong>, and <strong>/shop</strong>.
          </p>
          <p>
            Use <strong>Custom Pages</strong> here for extra client-specific slugs such as <strong>/why-us</strong>, <strong>/financing</strong>, or <strong>/service-area</strong>.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/built-in-pages"
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Open Built-in Pages
            </Link>
            <Link
              href="/site-settings"
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Open Global Site Settings
            </Link>
          </div>
        </div>
      </ComponentCard>

      {viewMode === 'organizer' ? (
        <PageOrganizer
          mainNavPages={mainNavPages}
          servicePages={servicePages}
          blogPosts={blogPosts}
          galleryPages={galleryPages}
          customPages={customPages}
          onSelectPage={handlePageSelect}
          onCreatePage={handleCreatePage}
          selectedPageId={selectedPage?.id}
        />
      ) : (
        <div className={`grid grid-cols-1 gap-6 ${!showCreationWizard ? 'xl:grid-cols-2' : ''}`}>
          <div className="space-y-6">
            <ComponentCard title="Page Management">
              <div className="space-y-6">
                {showCreationWizard ? (
                  <PageCreationWithImages
                    onCreatePage={handleCreatePageSubmit}
                    onCancel={() => {
                      setInitialPageDraft(undefined);
                      setShowCreationWizard(false);
                      setViewMode('organizer');
                    }}
                    enableAIContent={true}
                    initialPageDraft={initialPageDraft}
                    suggestedSlugs={requiredNavSlugs}
                    websiteId={selectedClient?.website_id || undefined}
                  />
                ) : (
                  <>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={handleCreatePage}
                      >
                        Create New Page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewMode('organizer')}
                      >
                        Back to Organizer
                      </Button>
                    </div>
                    
                    {shouldShowSeoMetadata && (
                      <SeoMetadata 
                        formData={formData} 
                        handleInputChange={handleInputChange} 
                        errors={errors} 
                        handleDescriptionChange={handleDescriptionChange} 
                      />
                    )}
                  </>
                )}
              </div>
            </ComponentCard>
          </div>

          {!showCreationWizard && (
            <div className="space-y-6">
              <ComponentCard title="Content Editor">
                {selectedPage ? (
                  <div className="border rounded-lg overflow-hidden">
                    <EditorSection
                      editorRef={editorRef}
                      markdown={selectedPage.content || ""}
                      showControls={false}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">Select a page from the organizer or create a new page to start editing</p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewMode('organizer')}
                      >
                        Go to Page Organizer
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreatePage}
                      >
                        Create New Page
                      </Button>
                    </div>
                  </div>
                )}
              </ComponentCard>

              {selectedPage && (
                <Button 
                  size="sm" 
                  className="bg-green-500" 
                  onClick={handleSavePage} 
                  disabled={selectedClient?.id === 0}
                >
                  Save Page
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

