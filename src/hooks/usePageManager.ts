import { useState, useCallback, useMemo } from 'react';
import { Page, FormData, ImageUploadLocation, PageType, TemplateType, PageCreationData, PagePresentation } from '@/types/page';
import { mutateUpdate } from '@/hooks/useMutateUpdate';
import { useGetPages } from '@/hooks/usePages';
import { useGetSeo } from '@/hooks/useSeo';

interface UsePageManagerProps {
  websiteId: number | null;
  onSuccess?: () => void;
}

interface SavePageOptions {
  content?: string;
  presentation?: PagePresentation;
}

const getLegacyMainNavFlag = (values: {
  nav_placement?: Page['nav_placement'] | PageCreationData['nav_placement'] | null;
  nav_style?: Page['nav_style'] | PageCreationData['nav_style'] | null;
  parent_id?: number | null;
  is_main_nav?: boolean;
}) => {
  if (values.nav_placement || values.nav_style || values.parent_id) {
    return values.nav_placement === 'header'
      && values.nav_style !== 'dropdown_child'
      && !values.parent_id;
  }

  return values.is_main_nav ?? false;
};

export const usePageManager = ({ websiteId, onSuccess }: UsePageManagerProps) => {
  const [selectedPage, setSelectedPage] = useState<Page | undefined>(undefined);
  const [content, setContent] = useState("");
  const [imageUploadLocation, setImageUploadLocation] = useState<ImageUploadLocation>({ table: "", id: 0 });
  const [creationMode, setCreationMode] = useState(false);
  const [pageCreationData, setPageCreationData] = useState<Partial<PageCreationData>>({});

  const { pages, refreshPages } = useGetPages(websiteId);
  const { seoData } = useGetSeo(selectedPage?.id || null);

  // Organize pages by hierarchy (using type casting for enhanced fields)
  const enhancedPages = useMemo(() => pages as Page[], [pages]);
  const getAssignmentsForPlacement = useCallback((page: Page, placement: 'header' | 'footer') => {
    if (Array.isArray(page.navigation_assignments) && page.navigation_assignments.length > 0) {
      return page.navigation_assignments.filter((assignment) => assignment.placement === placement);
    }

    const fallbackPlacement = page.nav_placement ?? (getLegacyMainNavFlag(page) ? 'header' : 'hidden');
    if (fallbackPlacement !== placement) {
      return [];
    }

    return [{
      placement,
      style: page.nav_style ?? (page.parent_id ? 'dropdown_child' : 'direct'),
      parent_page_id: page.nav_parent_id ?? null,
      sort_order: page.nav_order ?? page.sort_order ?? 0,
      label: page.nav_label ?? page.title,
    }];
  }, []);
  const getPrimaryHeaderAssignment = useCallback(
    (page: Page) => getAssignmentsForPlacement(page, 'header')[0] ?? null,
    [getAssignmentsForPlacement],
  );
  const getNavPlacement = useCallback(
    (page: Page) => getPrimaryHeaderAssignment(page)?.placement ?? page.nav_placement ?? (getLegacyMainNavFlag(page) ? 'header' : 'hidden'),
    [getPrimaryHeaderAssignment],
  );
  const getNavStyle = useCallback(
    (page: Page) => getPrimaryHeaderAssignment(page)?.style ?? page.nav_style ?? (page.parent_id ? 'dropdown_child' : 'direct'),
    [getPrimaryHeaderAssignment],
  );
  const {
    parentPages,
    childPages,
    headerPages,
    headerDirectPages,
    dropdownParentPages,
    dropdownChildPages,
    standaloneParentPages,
    hiddenChildPages,
    servicePages,
    blogPosts,
    galleryPages,
    customPages,
    customParentPages,
  } = useMemo(() => {
    const parentPages = enhancedPages.filter(page => !page.parent_id);
    const childPages = enhancedPages.filter(page => !!page.parent_id);
    const headerPages = enhancedPages.filter((page) => getNavPlacement(page) === 'header');
    const headerDirectPages = headerPages.filter((page) => !page.parent_id && getNavStyle(page) === 'direct');
    const dropdownParentPages = headerPages.filter((page) => !page.parent_id && getNavStyle(page) === 'dropdown_parent');
    const dropdownChildPages = headerPages.filter((page) => getNavStyle(page) === 'dropdown_child');
    const standaloneParentPages = parentPages.filter((page) => getNavPlacement(page) !== 'header');
    const hiddenChildPages = childPages.filter((page) => getNavPlacement(page) !== 'header');
    const servicePages = enhancedPages.filter(page => 
      page.page_type === 'service' || page.type === 'service'
    );
    const blogPosts = enhancedPages.filter(page => 
      page.page_type === 'blog-post' || page.type === 'blog'
    );
    const galleryPages = enhancedPages.filter(page => 
      page.page_type === 'gallery' || page.type === 'gallery'
    );
    const customPages = enhancedPages.filter(page => 
      page.page_type === 'custom' || (!page.type || page.type === 'custom')
    );
    const customParentPages = customPages.filter(page => !page.parent_id);

    return {
      parentPages,
      childPages,
      headerPages,
      headerDirectPages,
      dropdownParentPages,
      dropdownChildPages,
      standaloneParentPages,
      hiddenChildPages,
      servicePages,
      blogPosts,
      galleryPages,
      customPages,
      customParentPages,
    };
  }, [enhancedPages, getNavPlacement, getNavStyle]);

  const selectPage = useCallback((pageId: number) => {
    const page = enhancedPages.find((p) => p.id === pageId);
    setSelectedPage(page);
    setContent(page?.content || "");
    setCreationMode(false);
  }, [enhancedPages]);

  const startPageCreation = useCallback((pageType: PageType, templateType: TemplateType) => {
    setCreationMode(true);
    setSelectedPage(undefined);
    setPageCreationData({
      page_type: pageType,
      template_type: templateType,
      is_enabled: true,
      nav_placement: pageType === 'main-page' ? 'header' : 'hidden',
      nav_style: 'direct',
      is_main_nav: getLegacyMainNavFlag({
        nav_placement: pageType === 'main-page' ? 'header' : 'hidden',
        nav_style: 'direct',
        parent_id: null,
      }),
      navigation_assignments: pageType === 'main-page'
        ? [{ placement: 'header', style: 'direct', sort_order: 0, is_active: true }]
        : [],
    });
    setContent("");
  }, []);

  const createNewPage = useCallback(async (data: PageCreationData & { content?: string }) => {
    if (!websiteId) {
      console.error('No websiteId provided to createNewPage');
      return;
    }

    // Filter out fields that don't exist in the database schema
    const pageData = {
      page_type: data.page_type,
      template_type: data.template_type,
      title: data.title,
      slug: data.slug,
      parent_id: data.parent_id || null,
      is_main_nav: getLegacyMainNavFlag({
        nav_placement: data.nav_placement ?? (data.is_main_nav ? 'header' : 'hidden'),
        nav_style: data.nav_style ?? (data.parent_id ? 'dropdown_child' : 'direct'),
        parent_id: data.parent_id || null,
        is_main_nav: data.is_main_nav,
      }),
      is_enabled: data.is_enabled ?? data.is_published ?? true,
      is_required: data.is_required ?? false,
      nav_placement: data.nav_placement ?? (data.is_main_nav ? 'header' : 'hidden'),
      nav_style: data.nav_style ?? (data.parent_id ? 'dropdown_child' : 'direct'),
      nav_parent_id: data.nav_parent_id || null,
      nav_order: data.nav_order ?? 0,
      nav_label: data.nav_label ?? data.title,
      is_external_link: data.is_external_link ?? false,
      navigation_assignments: data.navigation_assignments ?? (
        data.nav_placement && data.nav_placement !== 'hidden'
          ? [{
              placement: data.nav_placement,
              style: data.nav_style ?? (data.parent_id ? 'dropdown_child' : 'direct'),
              parent_page_id: data.nav_parent_id || null,
              sort_order: data.nav_order ?? 0,
              label: data.nav_label ?? data.title,
              is_active: data.is_enabled ?? true,
            }]
          : []
      ),
      meta_description: data.meta_description || null,
      meta_keywords: data.meta_keywords || null,
      presentation: data.presentation || {},
      website_id: websiteId,
      content: data.content || content, // Use provided content or default content state
      is_published: data.is_published ?? false,
      sort_order: 0,
    };

    const result = await mutateUpdate({
      path: "/page",
      method: "POST",
      payload: pageData,
      additionalHeaders: {
        Prefer: "return=representation",
      },
    });

    if (result.response && onSuccess) {
      onSuccess();
      setCreationMode(false);
      setPageCreationData({});
    }

    return result;
  }, [websiteId, content, onSuccess]);

  const savePage = useCallback(async (formData: FormData, websiteId?: number | null, options?: SavePageOptions) => {
    if (!websiteId) return null;

    const nextContent = options?.content ?? content;

    if (selectedPage?.id) {
      const pagePayload = {
        title: formData.title,
        slug: formData.slug,
        content: nextContent,
        website_id: websiteId,
        page_type: selectedPage.page_type,
        parent_id: selectedPage.parent_id,
        is_main_nav: getLegacyMainNavFlag(selectedPage),
        is_enabled: selectedPage.is_enabled ?? true,
        is_required: selectedPage.is_required ?? false,
        nav_placement: selectedPage.nav_placement ?? 'hidden',
        nav_style: selectedPage.nav_style ?? (selectedPage.parent_id ? 'dropdown_child' : 'direct'),
        nav_parent_id: selectedPage.nav_parent_id ?? null,
        nav_order: selectedPage.nav_order ?? selectedPage.sort_order ?? 0,
        nav_label: selectedPage.nav_label ?? selectedPage.title,
        is_external_link: selectedPage.is_external_link ?? false,
        navigation_assignments: selectedPage.navigation_assignments ?? [],
        template_type: selectedPage.template_type,
        presentation: options?.presentation ?? selectedPage.presentation ?? {},
        meta_description: formData.seoDescription || null,
        meta_keywords: formData.seoKeywords || null,
        is_published: selectedPage.is_published,
        sort_order: selectedPage.sort_order ?? 0,
      };

      const result = await mutateUpdate({
        path: `/page/${selectedPage.id}`,
        method: "PUT",
        payload: pagePayload,
        additionalHeaders: {
          Prefer: "return=representation",
        },
      });

      if (result.response) {
        const updatedPage = result.response as Page;
        setSelectedPage(updatedPage);
        setContent(updatedPage.content || nextContent || "");
        await refreshPages();
        onSuccess?.();
        return updatedPage.id;
      }

      return null;
    }

    const pagePayload = {
      title: formData.title,
      slug: formData.slug,
      content: nextContent,
      website_id: websiteId,
    };

    const result = await mutateUpdate({
      path: "/page",
      method: "POST",
      payload: pagePayload,
      additionalHeaders: {
        Prefer: "return=representation",
      },
    });

    if (result) {
      const responseData = result.response as { id: number } | { id: number }[];
      const pageId = Array.isArray(responseData) ? responseData[0]?.id : responseData?.id;

      if (!pageId) {
        return null;
      }
      
      await mutateUpdate({
        path: "/seo_metadata",
        method: "POST",
        payload: {
          meta_title: formData.seoTitle,
          meta_description: formData.seoDescription,
          keywords: formData.seoKeywords,
          page_id: pageId,
        },
      });

      setImageUploadLocation({
        table: "/page_image",
        id: pageId,
      });

      onSuccess?.();
      return pageId;
    }

    return null;
  }, [content, onSuccess, refreshPages, selectedPage]);

  const resetPageState = useCallback(() => {
    setContent("");
    setSelectedPage(undefined);
    setImageUploadLocation({ table: "", id: 0 });
    setCreationMode(false);
    setPageCreationData({});
  }, []);

  return {
    pages,
    selectedPage,
    seoData,
    content,
    imageUploadLocation,
    // Organized page lists
    headerPages,
    headerDirectPages,
    dropdownParentPages,
    dropdownChildPages,
    hiddenChildPages,
    standaloneParentPages,
    parentPages,
    childPages,
    servicePages,
    blogPosts,
    galleryPages,
    customPages,
    customParentPages,
    // State
    creationMode,
    pageCreationData,
    // Actions
    setContent,
    selectPage,
    savePage,
    resetPageState,
    startPageCreation,
    createNewPage,
    refreshPages,
    setPageCreationData,
  };
};
