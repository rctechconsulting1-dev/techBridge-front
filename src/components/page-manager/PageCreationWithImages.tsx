import React, { useState, useRef, useCallback } from 'react';
import { PageCreationData } from '@/types/page';
import Button from '@/components/ui/button/Button';
import MultipleFileInputExample, { MultipleFileInputRef } from '@/components/form/form-elements/MultipleFileInputExample';
import PageCreationWizardEnhanced from './PageCreationWizardEnhanced';

interface PageCreationWithImagesProps {
  onCreatePage: (data: PageCreationData) => Promise<unknown>;
  onCancel: () => void;
  isLoading?: boolean;
  enableAIContent?: boolean;
  initialPageDraft?: { slug: string; title: string; is_published?: boolean };
  suggestedSlugs?: string[];
  websiteId?: number;
}

const PageCreationWithImages: React.FC<PageCreationWithImagesProps> = ({
  onCreatePage,
  onCancel,
  isLoading = false,
  enableAIContent = false,
  initialPageDraft,
  suggestedSlugs,
  websiteId,
}) => {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [createdPageId, setCreatedPageId] = useState<number | null>(null);
  const imageUploadRef = useRef<MultipleFileInputRef>(null);

  const handlePageCreation = useCallback(async (data: PageCreationData) => {
    try {
      const result = await onCreatePage(data);
      
      // Extract page ID from the result
      let pageId: number | null = null;
      
      if (result && typeof result === 'object') {
        const resultObj = result as Record<string, unknown>;
        
        // Check if response is an array with page objects
        if (Array.isArray(resultObj.response) && resultObj.response.length > 0) {
          const firstItem = resultObj.response[0] as Record<string, unknown>;
          if (typeof firstItem.id === 'number') {
            pageId = firstItem.id;
          }
        }
        // Check other possible response structures
        else if (resultObj.response && typeof resultObj.response === 'object') {
          const response = resultObj.response as Record<string, unknown>;
          if (typeof response.id === 'number') {
            pageId = response.id;
          }
          if (response.page && typeof response.page === 'object') {
            const page = response.page as Record<string, unknown>;
            if (typeof page.id === 'number') {
              pageId = page.id;
            }
          }
        }
        else if (resultObj.page && typeof resultObj.page === 'object') {
          const page = resultObj.page as Record<string, unknown>;
          if (typeof page.id === 'number') {
            pageId = page.id;
          }
        }
        else if (typeof resultObj.id === 'number') {
          pageId = resultObj.id;
        }
      }
      
      if (pageId) {
        setCreatedPageId(pageId);
        setShowImageUpload(true);
      } else {
        // If backend response shape is unexpected, do not leave user stuck in wizard.
        onCancel();
      }
      
      return result;
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  }, [onCreatePage, onCancel]);

  const handleImageUploadComplete = useCallback(async () => {
    if (imageUploadRef.current && createdPageId) {
      try {
        await imageUploadRef.current.handleSaveImages();
        setShowImageUpload(false);
        setCreatedPageId(null);
        onCancel();
      } catch (error) {
        console.error('Error uploading images:', error);
      }
    }
  }, [createdPageId, onCancel]);

  const handleSkipImages = useCallback(() => {
    setShowImageUpload(false);
    setCreatedPageId(null);
    onCancel();
  }, [onCancel]);

  if (showImageUpload && createdPageId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload Images for Your Page</h3>
          <Button variant="outline" onClick={handleSkipImages}>
            Skip Images
          </Button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            Your page has been created successfully! You can now upload images that will be associated with this page.
          </p>
        </div>

        <MultipleFileInputExample
          ref={imageUploadRef}
          imageUploadLocation={{ table: '/page_image', id: createdPageId }}
          idFieldName="page_id"
          websiteId={websiteId}
        />

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleSkipImages}>
            Skip Images
          </Button>
          <Button onClick={handleImageUploadComplete}>
            Upload Images & Finish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageCreationWizardEnhanced
      onCreatePage={handlePageCreation}
      onCancel={onCancel}
      isLoading={isLoading}
      enableAIContent={enableAIContent}
      initialPageDraft={initialPageDraft}
      suggestedSlugs={suggestedSlugs}
    />
  );
};

export default PageCreationWithImages;
