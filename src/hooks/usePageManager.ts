import { useState, useCallback } from 'react';
import { Page, FormData, ImageUploadLocation, PageType, TemplateType, PageCreationData } from '@/types/page';
import { mutateUpdate } from '@/hooks/useMutateUpdate';
import { useGetPages } from '@/hooks/usePages';
import { useGetSeo } from '@/hooks/useSeo';

interface UsePageManagerProps {
  websiteId: number | null;
  onSuccess?: () => void;
}

export const usePageManager = ({ websiteId, onSuccess }: UsePageManagerProps) => {
  const [selectedPage, setSelectedPage] = useState<Page | undefined>(undefined);
  const [content, setContent] = useState("");
  const [imageUploadLocation, setImageUploadLocation] = useState<ImageUploadLocation>({ table: "", id: 0 });
  const [creationMode, setCreationMode] = useState(false);
  const [pageCreationData, setPageCreationData] = useState<Partial<PageCreationData>>({});

  const { pages } = useGetPages(websiteId);
  const { seoData } = useGetSeo(selectedPage?.id || null);

  // Organize pages by hierarchy (using type casting for enhanced fields)
  const enhancedPages = pages as Page[];
  
  const mainNavPages = enhancedPages.filter(page => 
    page.is_main_nav || page.type === 'main'
  );
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

  const selectPage = useCallback((pageId: number) => {
    const page = enhancedPages.find((p) => p.id === pageId);
    setSelectedPage(page);
    setCreationMode(false);
  }, [enhancedPages]);

  const startPageCreation = useCallback((pageType: PageType, templateType: TemplateType) => {
    setCreationMode(true);
    setSelectedPage(undefined);
    setPageCreationData({
      page_type: pageType,
      template_type: templateType,
      is_main_nav: pageType === 'main-page',
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
      is_main_nav: data.is_main_nav,
      meta_description: data.meta_description || null,
      meta_keywords: data.meta_keywords || null,
      website_id: websiteId,
      content: data.content || content, // Use provided content or default content state
      is_published: false, // Draft by default
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

  const savePage = useCallback(async (formData: FormData, websiteId?: number | null ) => {
    if (!websiteId) return null;

    const pagePayload = {
      title: formData.title,
      slug: formData.slug,
      content: content,
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
  }, [content, onSuccess]);

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
    mainNavPages,
    servicePages,
    blogPosts,
    galleryPages,
    customPages,
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
    setPageCreationData,
  };
};
