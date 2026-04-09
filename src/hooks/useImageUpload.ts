import { useCallback } from 'react';
import { mutateUpdate } from './useMutateUpdate';
import type { Database } from '../../database.types';
import { getActiveTenantId } from '@/lib/auth-context';

type ImageData = {
  url: string;
  alt_text?: string | null;
  caption?: string | null;
  scope?: string | null;
  category?: string | null;
};

type ImageInsert = Database['public']['Tables']['image']['Insert'];
type PageImageInsert = Database['public']['Tables']['page_image']['Insert'];

export const useImageUpload = () => {
  
  const uploadImagesForPage = useCallback(async (
    pageId: number, 
    imageData: ImageData[]
  ) => {
    if (!pageId || !imageData || imageData.length === 0) {
      return { success: true, imageIds: [] };
    }

    const tenantId = getActiveTenantId() ?? null;

    try {
      // Step 1: Create image entries in the image table
      const imagePayload: ImageInsert[] = imageData.map(img => ({
        url: img.url,
        alt_text: img.alt_text || null,
        caption: img.caption || null,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(img.scope ? { scope: img.scope } : {}),
        ...(img.category ? { category: img.category } : {}),
      }));

      const imageResponse = await mutateUpdate({
        path: "/image",
        method: "POST",
        payload: imagePayload,
        additionalHeaders: {
          Prefer: "return=representation",
        },
      });

      if (imageResponse.error) {
        console.error("Error creating images:", imageResponse.error);
        throw new Error(`Failed to create images: ${imageResponse.error}`);
      }

      // Step 2: Create page_image relationships with order
      if (imageResponse.response && Array.isArray(imageResponse.response)) {
        const createdImages = imageResponse.response as Array<{ id: number }>;
        
        const pageImagePayload: PageImageInsert[] = createdImages.map((img, index) => ({
          page_id: pageId,
          image_id: img.id,
          order: index,
        }));

        const relationshipResponse = await mutateUpdate({
          path: "/page_image",
          method: "POST",
          payload: pageImagePayload,
          additionalHeaders: {
            Prefer: "return=representation",
          },
        });

        if (relationshipResponse.error) {
          console.error("Error creating page-image relationships:", relationshipResponse.error);
          throw new Error(`Failed to create page-image relationships: ${relationshipResponse.error}`);
        }

        return {
          success: true,
          imageIds: createdImages.map(img => img.id),
          images: createdImages,
          relationships: relationshipResponse.response
        };
      } else {
        console.error('Unexpected image response format:', imageResponse.response);
        throw new Error('Invalid response format from image creation');
      }

    } catch (error) {
      console.error('Image upload process failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        imageIds: []
      };
    }
  }, []);

  /**
   * Get the last inserted page ID from the page table
   * @param websiteId - The website ID to filter pages
   * @returns Promise with the last page ID
   */
  const getLastPageId = useCallback(async (websiteId?: number) => {
    try {
      const path = websiteId ? `/page?website_id=${websiteId}` : '/page';

      const response = await mutateUpdate({
        path,
        method: "GET",
      });

      if (response.error) {
        console.error("Error getting last page ID:", response.error);
        throw new Error(`Failed to get last page ID: ${response.error}`);
      }

      const pages = response.response as Array<{ id: number }>;
      
      if (pages && pages.length > 0) {
        const lastPageId = pages[0].id;
        return lastPageId;
      } else {
        throw new Error('No pages found');
      }

    } catch (error) {
      console.error('Failed to get last page ID:', error);
      throw error;
    }
  }, []);

  return {
    uploadImagesForPage,
    getLastPageId
  };
};
