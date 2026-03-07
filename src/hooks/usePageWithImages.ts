import { useCallback } from 'react';
import { mutateUpdate } from './useMutateUpdate';
import { useImageUpload } from './useImageUpload';
import type { Database } from '../../database.types';

export type PageCreationData = {
  page_type: string;
  template_type: string;
  title: string;
  slug: string;
  parent_id?: number | null;
  is_main_nav?: boolean;
  meta_description?: string | null;
  meta_keywords?: string | null;
  content?: string;
};

export type ImageUploadData = {
  url: string;
  alt_text?: string | null;
  caption?: string | null;
};

type PageInsert = Database['public']['Tables']['page']['Insert'];

export const usePageWithImages = (websiteId?: number | null) => {
  const { uploadImagesForPage, getLastPageId } = useImageUpload();

  /**
   * Enhanced handleSubmit function that creates a page and uploads associated images
   * @param pageData - Page creation data
   * @param imageData - Array of image data to upload (optional)
   * @param onSuccess - Success callback
   * @param onError - Error callback
   */
  const handleSubmitWithImages = useCallback(async (
    pageData: PageCreationData & { content?: string },
    imageData?: ImageUploadData[],
    onSuccess?: (result: { pageId: number; imageIds: number[] }) => void,
    onError?: (error: string) => void
  ) => {
    try {
      if (!websiteId) {
        const errorMsg = 'No websiteId provided for page creation';
        console.error(errorMsg);
        if (onError) onError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Step 1: Create the page
      const pagePayload: PageInsert = {
        page_type: pageData.page_type,
        template_type: pageData.template_type,
        title: pageData.title,
        slug: pageData.slug,
        parent_id: pageData.parent_id || null,
        is_main_nav: pageData.is_main_nav || false,
        meta_description: pageData.meta_description || null,
        meta_keywords: pageData.meta_keywords || null,
        website_id: websiteId,
        content: pageData.content || null,
        is_published: false, // Draft by default
        sort_order: 0,
      };

      const pageResult = await mutateUpdate({
        path: "/page",
        method: "POST",
        payload: pagePayload,
        additionalHeaders: {
          Prefer: "return=representation",
        },
      });

      if (pageResult.error) {
        const errorMsg = `Failed to create page: ${pageResult.error}`;
        console.error(errorMsg);
        if (onError) onError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Get the created page ID
      let pageId: number;
      
      if (pageResult.response && Array.isArray(pageResult.response) && pageResult.response.length > 0) {
        // If the response contains the created page with ID
        const firstPage = pageResult.response[0] as Record<string, unknown>;
        if (firstPage && typeof firstPage.id === 'number') {
          pageId = firstPage.id;
        } else {
          console.warn('Page object does not have valid ID, using fallback method');
          // Fallback: get the last inserted page ID
          pageId = await getLastPageId(websiteId);
        }
      } else {
        // Fallback: get the last inserted page ID
        pageId = await getLastPageId(websiteId);
      }

      // Step 2: Upload images if provided
      let imageIds: number[] = [];
      
      if (imageData && imageData.length > 0) {
        const imageUploadResult = await uploadImagesForPage(pageId, imageData);
        
        if (!imageUploadResult.success) {
          const errorMsg = `Page created but image upload failed: ${imageUploadResult.error}`;
          console.error(errorMsg);
          if (onError) onError(errorMsg);
          return { 
            success: false, 
            error: errorMsg, 
            pageId,
            partialSuccess: true 
          };
        }
        
        imageIds = imageUploadResult.imageIds;
      }

      // Step 3: Success callback
      const result = { pageId, imageIds };
      if (onSuccess) onSuccess(result);
      
      return { 
        success: true, 
        pageId, 
        imageIds,
        pageResult: pageResult.response,
        imageResult: imageIds.length > 0 ? imageIds : null
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Page creation with images failed:', error);
      if (onError) onError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [websiteId, uploadImagesForPage, getLastPageId]);

  /**
   * Simple page creation without images (for backward compatibility)
   */
  const createPageOnly = useCallback(async (pageData: PageCreationData & { content?: string }) => {
    return handleSubmitWithImages(pageData);
  }, [handleSubmitWithImages]);

  return {
    handleSubmitWithImages,
    createPageOnly
  };
};
