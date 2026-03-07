/**
 * Test implementation for the image upload functionality
 * This demonstrates how to use the enhanced page creation with images
 */

import React, { useState } from 'react';
import { usePageWithImages, type ImageUploadData } from '@/hooks/usePageWithImages';
import type { PageCreationData } from '@/types/page';

interface TestImageUploadProps {
  websiteId: number;
}

export default function TestImageUpload({ websiteId }: TestImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  
  const { handleSubmitWithImages } = usePageWithImages(websiteId);

  const testPageCreationWithImages = async () => {
    setIsLoading(true);
    setResult('');

    // Example page data
    const pageData: PageCreationData = {
      page_type: 'main-page',
      template_type: 'standard',
      title: 'Test Page with Images',
      slug: 'test-page-with-images',
      is_main_nav: false,
      meta_description: 'A test page created with image upload functionality',
      meta_keywords: 'test, page, images, upload',
      content: '# Test Page\n\nThis is a test page created with the enhanced image upload functionality.',
    };

    // Example image data (you would get this from actual uploaded files)
    const imageData: ImageUploadData[] = [
      {
        url: 'https://example.com/image1.jpg',
        alt_text: 'Test image 1',
        caption: 'This is the first test image'
      },
      {
        url: 'https://example.com/image2.jpg', 
        alt_text: 'Test image 2',
        caption: 'This is the second test image'
      }
    ];

    try {
      const uploadResult = await handleSubmitWithImages(
        pageData,
        imageData,
        (successResult) => {
          setResult(`✅ Success! Page ID: ${successResult.pageId}, Image IDs: ${successResult.imageIds.join(', ')}`);
        },
        (error) => {
          console.error('❌ Error callback triggered:', error);
          setResult(`❌ Error: ${error}`);
        }
      );

      if (uploadResult.success) {
        setResult(prev => prev + `\n\nFinal result: Page created with ID ${uploadResult.pageId}`);
        if (uploadResult.imageIds && uploadResult.imageIds.length > 0) {
          setResult(prev => prev + `, Images uploaded with IDs: ${uploadResult.imageIds!.join(', ')}`);
        }
      }

    } catch (error) {
      console.error('Test failed:', error);
      setResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testPageCreationOnly = async () => {
    setIsLoading(true);
    setResult('');

    const pageData: PageCreationData = {
      page_type: 'main-page',
      template_type: 'standard', 
      title: 'Test Page Without Images',
      slug: 'test-page-no-images',
      is_main_nav: false,
      meta_description: 'A test page created without images',
      content: '# Test Page (No Images)\n\nThis page was created without any images.',
    };

    try {
      const uploadResult = await handleSubmitWithImages(pageData); // No images provided

      if (uploadResult.success) {
        setResult(`✅ Page-only creation successful! Page ID: ${uploadResult.pageId}`);
      } else {
        setResult(`❌ Page creation failed: ${uploadResult.error}`);
      }

    } catch (error) {
      console.error('Test failed:', error);
      setResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Image Upload Test Component</h2>
      <p className="text-gray-600 mb-6">Website ID: {websiteId}</p>
      
      <div className="space-y-4">
        <button
          onClick={testPageCreationWithImages}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Page Creation WITH Images'}
        </button>

        <button
          onClick={testPageCreationOnly}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Page Creation WITHOUT Images'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Test Result:</h3>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p><strong>Note:</strong> This test uses example image URLs. In a real implementation, you would:</p>
        <ul className="list-disc ml-4 mt-2">
          <li>Upload actual files to S3 using MultipleFileInputExample</li>
          <li>Get real image URLs from the upload process</li>
          <li>Provide actual alt text and captions from user input</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Usage example in a parent component:
 * 
 * import TestImageUpload from './TestImageUpload';
 * import { useSidebar } from '@/context/SidebarContext';
 * 
 * function MyPage() {
 *   const { selectedClient } = useSidebar();
 *   
 *   if (!selectedClient?.website_id) {
 *     return <div>Please select a client first</div>;
 *   }
 *   
 *   return <TestImageUpload websiteId={selectedClient.website_id} />;
 * }
 */
