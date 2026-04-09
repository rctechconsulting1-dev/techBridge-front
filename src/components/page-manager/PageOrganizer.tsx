import React from 'react';
import { Page } from '@/types/page';
import Button from '@/components/ui/button/Button';

interface PageOrganizerProps {
  headerDirectPages: Page[];
  dropdownParentPages: Page[];
  dropdownChildPages: Page[];
  standaloneParentPages: Page[];
  hiddenChildPages: Page[];
  parentPages: Page[];
  servicePages: Page[];
  blogPosts: Page[];
  galleryPages: Page[];
  customPages: Page[];
  onSelectPage: (pageId: number) => void;
  onCreatePage: () => void;
  selectedPageId?: number;
}

const PageOrganizer: React.FC<PageOrganizerProps> = ({
  headerDirectPages,
  dropdownParentPages,
  dropdownChildPages,
  standaloneParentPages,
  hiddenChildPages,
  parentPages,
  servicePages,
  blogPosts,
  galleryPages,
  customPages,
  onSelectPage,
  onCreatePage,
  selectedPageId,
}) => {
  const pageById = new Map(parentPages.map((page) => [page.id, page]));

  const PageGroup = ({ 
    title, 
    pages, 
    emptyMessage,
    icon 
  }: { 
    title: string; 
    pages: Page[]; 
    emptyMessage: string;
    icon: string;
  }) => (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h4 className="font-medium text-gray-800 dark:text-white">{title}</h4>
        <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {pages.length}
        </span>
      </div>
      
      {pages.length === 0 ? (
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={`w-full text-left p-2 rounded border transition-colors ${
                selectedPageId === page.id
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                  : 'hover:bg-gray-50 border-gray-200 dark:hover:bg-gray-800 dark:border-gray-700'
              }`}
            >
              <div className="font-medium text-sm">{page.title || 'Untitled'}</div>
              <div className="text-xs text-gray-500">/{page.slug}</div>
              {page.parent_id ? (
                <div className="text-xs text-gray-500">
                  Child of {pageById.get(page.parent_id)?.title || 'Parent page'}
                </div>
              ) : null}
              {'is_published' in page && page.is_published === false && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">Draft</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Page Organization</h3>
        <Button size="sm" onClick={onCreatePage}>
          Create New Page
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PageGroup
          title="Header Direct Pages"
          pages={headerDirectPages}
          emptyMessage="No direct header pages. Enable pages and place them directly in the header."
          icon="🏠"
        />

        <PageGroup
          title="Header Dropdown Parents"
          pages={dropdownParentPages}
          emptyMessage="No dropdown parent pages. Create a parent page and assign dropdown children to it."
          icon="▾"
        />

        <PageGroup
          title="Header Dropdown Children"
          pages={dropdownChildPages}
          emptyMessage="No dropdown child pages. Add child pages and assign them under a header dropdown."
          icon="↳"
        />

        <PageGroup
          title="Standalone Parent Pages"
          pages={standaloneParentPages}
          emptyMessage="No standalone parent pages. Create top-level pages like Blog, Resources, or Reviews."
          icon="🧭"
        />

        <PageGroup
          title="Hidden Child Pages"
          pages={hiddenChildPages}
          emptyMessage="No hidden child pages. Use these for detail pages that should not appear in header navigation."
          icon="↳"
        />
        
        <PageGroup
          title="Services"
          pages={servicePages}
          emptyMessage="No service pages. Create pages for your business services."
          icon="⚙️"
        />
        
        <PageGroup
          title="Blog Posts"
          pages={blogPosts}
          emptyMessage="No blog posts. Start creating content for your blog."
          icon="📝"
        />
        
        <PageGroup
          title="Galleries"
          pages={galleryPages}
          emptyMessage="No gallery pages. Create photo galleries to showcase your work."
          icon="🖼️"
        />
        
        <PageGroup
          title="Custom Pages"
          pages={customPages}
          emptyMessage="No custom pages."
          icon="📄"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Page Structure Guide</h4>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p><strong>Header Direct Pages:</strong> Top-level pages shown directly in the header, such as Contact or Reviews</p>
          <p><strong>Header Dropdown Parents:</strong> Top-level pages that exist to group child pages in a header dropdown</p>
          <p><strong>Header Dropdown Children:</strong> Pages assigned under a dropdown parent and shown inside that header menu</p>
          <p><strong>Standalone Parent Pages:</strong> Top-level custom hubs like Blog, Resources, or Campaigns that do not need to be in the header</p>
          <p><strong>Hidden Child Pages:</strong> Nested pages like blog posts, support articles, or detail pages that stay out of header navigation</p>
          <p><strong>Services:</strong> Individual service pages that can be organized under Services</p>
          <p><strong>Blog Posts:</strong> Articles, news, and content pieces</p>
          <p><strong>Galleries:</strong> Photo collections and portfolio showcases</p>
          <p><strong>Custom:</strong> Any other type of page with custom functionality</p>
        </div>
      </div>
    </div>
  );
};

export default PageOrganizer;
