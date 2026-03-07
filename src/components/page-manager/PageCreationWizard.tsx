import React, { useState, useEffect } from 'react';
import { PageType, TemplateType, PageCreationData } from '@/types/page';
import Button from '@/components/ui/button/Button';
import Label from '@/components/form/Label';
import Input from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import TextArea from '@/components/form/input/TextArea';
import { useContentAgent } from '@/hooks/useContentAgent';

// Types for AI content generation
interface ContentItem {
  idea: string;
  keywordTargets?: string[];
}

interface ContentAgentData {
  content?: string;
  markdownContent?: string;
  metadata?: {
    title: string;
    description: string;
    keywords: string[];
  } | string;
  competitorAnalysis?: string;
  ideas?: ContentItem[];
  content_ideas?: ContentItem[];
  contentIdeas?: ContentItem[];
  role?: string;
  step?: string;
  message?: string;
  conversationHistory?: Record<string, unknown>[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  data?: ContentAgentData;
  timestamp: Date;
  isIdeaSelection?: boolean;
  ideas?: ContentItem[];
}

interface PageCreationWizardProps {
  onCreatePage: (data: PageCreationData & { content?: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  enableAIContent?: boolean; // New prop to enable AI content generation
}

const pageTypeOptions = [
  { value: 'main-page', label: 'Main Navigation Page' },
  { value: 'service', label: 'Service Page' },
  { value: 'blog-post', label: 'Blog Post' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'legal', label: 'Legal Page' },
  { value: 'custom', label: 'Custom Page' },
];

const templateTypeOptions: Record<PageType, { value: TemplateType; label: string }[]> = {
  'main-page': [
    { value: 'home', label: 'Homepage Template' },
    { value: 'standard', label: 'Standard Page' },
    { value: 'contact', label: 'Contact Page' },
  ],
  'service': [
    { value: 'service', label: 'Service Template' },
    { value: 'standard', label: 'Standard Template' },
  ],
  'blog-post': [
    { value: 'blog-post', label: 'Blog Post Template' },
  ],
  'blog-category': [
    { value: 'blog-list', label: 'Blog List Template' },
  ],
  'gallery': [
    { value: 'gallery', label: 'Gallery Template' },
  ],
  'landing': [
    { value: 'landing', label: 'Landing Page Template' },
  ],
  'legal': [
    { value: 'standard', label: 'Standard Template' },
  ],
  'custom': [
    { value: 'standard', label: 'Standard Template' },
  ],
};

// Helper: parse ideas from OpenAI response
function parseIdeas(data: ContentAgentData): ContentItem[] {
  try {
    if (data?.ideas && Array.isArray(data.ideas)) {
      return data.ideas;
    }
    
    const content = typeof data?.content === "string" ? JSON.parse(data.content) : data?.content;
    if (Array.isArray(content)) {
      return content.map((item: ContentItem | string) => 
        typeof item === 'string' ? { idea: item, keywordTargets: [] } : item
      );
    }
    if (content?.ideas) return content.ideas;
    if (content?.content_ideas) return content.content_ideas;
    if (content?.contentIdeas) return content.contentIdeas;
    return [];
  } catch {
    return [];
  }
}

const PageCreationWizard: React.FC<PageCreationWizardProps> = ({
  onCreatePage,
  onCancel,
  isLoading = false,
  enableAIContent = false,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PageCreationData>>({
    page_type: 'main-page',
    template_type: 'standard',
    is_main_nav: false,
  });

  // AI Content Generation state
  const [aiFormData, setAiFormData] = useState({
    ourUrl: "",
    city: "",
    industry: "",
    keyword: "",
    competitor1Url: "",
    competitor2Url: "",
    service: "",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [generatedMetadata, setGeneratedMetadata] = useState<{
    title?: string;
    description?: string;
    keywords?: string[];
  }>({});

  const { trigger, data, error, isLoading: isAILoading } = useContentAgent();

  // Effect to handle AI content agent responses
  useEffect(() => {
    if (data && !isAILoading) {
      const ideas = parseIdeas(data);
      const messageId = Date.now().toString();
      
      if (ideas.length > 0 && data.step === 'ideas_generated') {
        setChatMessages(prev => [...prev, {
          id: messageId,
          type: 'assistant',
          content: data.message || 'Here are some content ideas for your page:',
          data,
          timestamp: new Date(),
          isIdeaSelection: true,
          ideas
        }]);
      } else if (data.step === 'complete_workflow') {
        const content = data.markdownContent || data.content || '';
        setSelectedContent(content);
        
        // Extract metadata if available
        if (data.metadata) {
          const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
          setGeneratedMetadata({
            title: metadata.title,
            description: metadata.description,
            keywords: metadata.keywords,
          });
          
          // Auto-populate form fields with AI-generated metadata
          setFormData(prev => ({
            ...prev,
            title: metadata.title || prev.title,
            meta_description: metadata.description || prev.meta_description,
            meta_keywords: metadata.keywords?.join(', ') || prev.meta_keywords,
            slug: prev.slug || generateSlug(metadata.title || ''),
          }));
        }
        
        let chatContent = `**✅ Content Strategy Complete!**\n\n`;
        chatContent += `**📝 Content Outline:**\n${data.content}\n\n`;
        if (data.markdownContent) {
          chatContent += `**📄 Full Markdown Content Generated**\n\n`;
        }
        if (data.competitorAnalysis) {
          chatContent += `**🔍 Competitor Analysis:**\n${data.competitorAnalysis}\n\n`;
        }
        if (data.metadata) {
          const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
          chatContent += `**🏷️ SEO Metadata:**\n`;
          chatContent += `• **Title:** ${metadata.title}\n`;
          chatContent += `• **Description:** ${metadata.description}\n`;
          chatContent += `• **Keywords:** ${metadata.keywords.join(', ')}\n\n`;
        }
        chatContent += `*Page details have been automatically filled. You can review and create your page!*`;
        
        setChatMessages(prev => [...prev, {
          id: messageId,
          type: 'assistant',
          content: chatContent,
          data,
          timestamp: new Date()
        }]);
        
        // Move to step 3 (page details) after content generation
        setStep(3);
      }
    }
    
    if (error && !isAILoading) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Error: ${error.message || String(error)}`,
        timestamp: new Date()
      }]);
    }
  }, [data, error, isAILoading]);

  // AI Content Generation Handlers
  const handleAIFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAiFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateIdeas = (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = `Starting content generation for ${aiFormData.industry} business in ${aiFormData.city}, targeting "${aiFormData.keyword}"`;
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    
    trigger(aiFormData);
  };

  const handleChooseIdea = (idea: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: `I choose this idea: "${idea}"\n\nPlease continue with competitor analysis and content development.`,
      timestamp: new Date()
    }]);
    
    trigger({ ...aiFormData, userChosenIdea: idea });
  };

  const handleInputChange = (field: keyof PageCreationData, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePageTypeChange = (pageType: PageType) => {
    const defaultTemplate = templateTypeOptions[pageType][0]?.value || 'standard';
    setFormData(prev => ({
      ...prev,
      page_type: pageType,
      template_type: defaultTemplate,
      is_main_nav: pageType === 'main-page',
    }));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const canProceedToStep2 = formData.page_type && formData.template_type;
  const canSubmit = !!(formData.title && formData.slug && canProceedToStep2);

  const handleSubmit = () => {
    if (canSubmit && formData.page_type && formData.template_type && formData.title && formData.slug) {
      const pageData: PageCreationData & { content?: string } = {
        page_type: formData.page_type,
        template_type: formData.template_type,
        title: formData.title,
        slug: formData.slug,
        parent_id: formData.parent_id || null,
        is_main_nav: formData.is_main_nav || false,
        meta_description: formData.meta_description,
        meta_keywords: formData.meta_keywords,
      };
      
      // Add AI-generated content if available
      if (selectedContent) {
        pageData.content = selectedContent;
      }
      
      onCreatePage(pageData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create New Page</h3>
        <div className="flex gap-2">
          <span className={`text-sm px-2 py-1 rounded ${step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            1. Type & Template
          </span>
          {enableAIContent && (
            <span className={`text-sm px-2 py-1 rounded ${step === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              2. AI Content
            </span>
          )}
          <span className={`text-sm px-2 py-1 rounded ${step === (enableAIContent ? 3 : 2) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {enableAIContent ? '3' : '2'}. Page Details
          </span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Page Type</Label>
            <Select
              options={pageTypeOptions}
              defaultValue={formData.page_type || ''}
              onChange={(value) => handlePageTypeChange(value as PageType)}
              placeholder="Select page type"
            />
            <p className="text-sm text-gray-500 mt-1">
              Choose the type of page based on its purpose and content
            </p>
          </div>

          {formData.page_type && (
            <div>
              <Label>Template</Label>
              <Select
                options={templateTypeOptions[formData.page_type]}
                defaultValue={formData.template_type || ''}
                onChange={(value) => handleInputChange('template_type', value as TemplateType)}
                placeholder="Select template"
              />
              <p className="text-sm text-gray-500 mt-1">
                Choose the layout template for this page
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={() => setStep(2)} 
              disabled={!canProceedToStep2}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {enableAIContent && step === 2 && (
        <div className="space-y-6">
          {/* AI Content Generation Form */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold">AI Content Generation (Optional)</h4>
            <p className="text-sm text-gray-600">
              Generate AI-powered content and SEO metadata for your page
            </p>
            
            <form onSubmit={handleGenerateIdeas} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Your Website URL</Label>
                  <Input 
                    type="text" 
                    name="ourUrl" 
                    value={aiFormData.ourUrl} 
                    onChange={handleAIFormChange}
                    placeholder="https://yoursite.com"
                  />
                </div>
                <div>
                  <Label>City/Location</Label>
                  <Input 
                    type="text" 
                    name="city" 
                    value={aiFormData.city} 
                    onChange={handleAIFormChange}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input 
                    type="text" 
                    name="industry" 
                    value={aiFormData.industry} 
                    onChange={handleAIFormChange}
                    placeholder="Digital Marketing"
                  />
                </div>
                <div>
                  <Label>Target Keyword</Label>
                  <Input 
                    type="text" 
                    name="keyword" 
                    value={aiFormData.keyword} 
                    onChange={handleAIFormChange}
                    placeholder="SEO services"
                  />
                </div>
                <div>
                  <Label>Competitor #1 URL</Label>
                  <Input 
                    type="text" 
                    name="competitor1Url" 
                    value={aiFormData.competitor1Url} 
                    onChange={handleAIFormChange}
                    placeholder="https://competitor1.com"
                  />
                </div>
                <div>
                  <Label>Competitor #2 URL</Label>
                  <Input 
                    type="text" 
                    name="competitor2Url" 
                    value={aiFormData.competitor2Url} 
                    onChange={handleAIFormChange}
                    placeholder="https://competitor2.com"
                  />
                </div>
              </div>
              
              <div>
                <Label>Service/Topic</Label>
                <Input 
                  type="text" 
                  name="service" 
                  value={aiFormData.service} 
                  onChange={handleAIFormChange}
                  placeholder="Web Design Services"
                />
              </div>
              
              <Button type="submit" disabled={isAILoading}>
                {isAILoading ? 'Generating Ideas...' : '🤖 Generate Content Ideas'}
              </Button>
            </form>
          </div>

          {/* Chat Interface */}
          {chatMessages.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-md font-semibold">AI Content Assistant</h4>
              <div className="max-h-96 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3/4 p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-gray-700 border'
                    }`}>
                      {message.type === 'assistant' && message.ideas && message.ideas.length > 0 ? (
                        <div>
                          <p className="mb-3 font-medium">Here are content ideas for your page:</p>
                          <div className="space-y-2">
                            {message.ideas.map((idea, idx) => (
                              <button
                                key={idx}
                                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 border border-transparent transition-all duration-200"
                                onClick={() => handleChooseIdea(idea.idea)}
                              >
                                <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                                  💡 Idea #{idx + 1} - Click to Select
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                  {idea.idea}
                                </div>
                                {idea.keywordTargets && idea.keywordTargets.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {idea.keywordTargets.slice(0, 3).map((keyword, kidx) => (
                                      <span key={kidx} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs">
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      <div className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isAILoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600 dark:text-gray-300">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={() => setStep(3)}
            >
              {selectedContent ? 'Review & Finalize' : 'Skip AI Content'}
            </Button>
          </div>
        </div>
      )}

      {((!enableAIContent && step === 2) || (enableAIContent && step === 3)) && (
        <div className="space-y-4">
          <div>
            <Label>Page Title</Label>
            <Input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter page title"
            />
            {generatedMetadata.title && (
              <p className="text-sm text-green-600 mt-1">
                ✨ Auto-filled by AI: {generatedMetadata.title}
              </p>
            )}
          </div>

          <div>
            <Label>URL Slug</Label>
            <Input
              type="text"
              value={formData.slug || ''}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              placeholder="page-url-slug"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL-friendly version of the title (lowercase, hyphens instead of spaces)
            </p>
          </div>

          {formData.page_type !== 'main-page' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mainNav"
                checked={formData.is_main_nav || false}
                onChange={(e) => handleInputChange('is_main_nav', e.target.checked)}
              />
              <Label htmlFor="mainNav">Show in main navigation</Label>
            </div>
          )}

          <div>
            <Label>Meta Description (SEO)</Label>
            <TextArea
              value={formData.meta_description || ''}
              onChange={(value) => handleInputChange('meta_description', value)}
              placeholder="Brief description for search engines (150-160 characters)"
              rows={3}
            />
            {generatedMetadata.description && (
              <p className="text-sm text-green-600 mt-1">
                ✨ Auto-filled by AI: {generatedMetadata.description.substring(0, 100)}...
              </p>
            )}
          </div>

          <div>
            <Label>Meta Keywords (SEO)</Label>
            <Input
              type="text"
              value={formData.meta_keywords || ''}
              onChange={(e) => handleInputChange('meta_keywords', e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
            />
            {generatedMetadata.keywords && (
              <p className="text-sm text-green-600 mt-1">
                ✨ Auto-filled by AI: {generatedMetadata.keywords.slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          {/* Show AI Generated Content Preview */}
          {selectedContent && (
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-green-600">🤖 AI Generated Content Preview</h4>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {selectedContent.substring(0, 500)}
                    {selectedContent.length > 500 && '...'}
                  </pre>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  ✅ This content will be added to your page automatically
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(enableAIContent ? 2 : 1)}>
              Back
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageCreationWizard;
