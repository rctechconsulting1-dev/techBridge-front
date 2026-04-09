import React, { useState, useEffect } from 'react';
import { InitialPageDraft, Page, PageType, TemplateType, PageCreationData } from '@/types/page';
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
  ideaType?: string;
  intentMatchScore?: number;
  whyMatch?: string;
  localMatchScore?: number;
}

type InferredPageIntent = {
  pageIntent: string;
  pageGoal: string;
  service: string;
  primaryCta: string;
  mustInclude: string;
  mustAvoid: string;
};

const MIN_IDEA_CONFIDENCE = 65;

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
  enableAIContent?: boolean;
  initialPageDraft?: InitialPageDraft;
  suggestedSlugs?: string[];
  availableParentPages?: Page[];
}

const pageTypeOptions = [
  { value: 'main-page', label: 'Top-Level Parent Page' },
  { value: 'service', label: 'Service Page' },
  { value: 'blog-category', label: 'Blog Parent Page' },
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

function splitCsvToList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function inferIntentFromSlug(slug?: string): InferredPageIntent {
  const normalized = (slug || '').toLowerCase();

  if (normalized.includes('price') || normalized.includes('cost') || normalized.includes('pricing')) {
    return {
      pageIntent: 'pricing',
      pageGoal: 'Help customers understand pricing ranges and request a quote',
      service: 'Pricing and Cost Guide',
      primaryCta: 'Request a quote',
      mustInclude: 'Typical price ranges, factors that affect cost, what is included, CTA to request quote',
      mustAvoid: 'Irrelevant blog topics, generic industry history',
    };
  }

  if (normalized.includes('faq')) {
    return {
      pageIntent: 'faq',
      pageGoal: 'Answer top objections and reduce friction before contact',
      service: 'Frequently Asked Questions',
      primaryCta: 'Contact us for a custom answer',
      mustInclude: 'Top customer questions, concise answers, trust signals, CTA',
      mustAvoid: 'Long narrative content that does not answer questions',
    };
  }

  if (normalized.includes('why') || normalized.includes('choose')) {
    return {
      pageIntent: 'trust',
      pageGoal: 'Build trust and explain why this business is the right choice',
      service: 'Why Choose Us',
      primaryCta: 'Schedule service',
      mustInclude: 'Differentiators, guarantees, social proof, CTA',
      mustAvoid: 'Unsubstantiated claims and fluff',
    };
  }

  return {
    pageIntent: 'general',
    pageGoal: 'Create an informative page aligned with user intent',
    service: 'Service Overview',
    primaryCta: 'Contact us',
    mustInclude: '',
    mustAvoid: '',
  };
}

function scoreIdeaRelevance(idea: ContentItem, context: { pageIntent: string; pageGoal: string; slug: string }): number {
  const haystack = `${idea.idea} ${idea.ideaType || ''} ${(idea.keywordTargets || []).join(' ')} ${context.pageGoal}`.toLowerCase();
  const slugTerms = context.slug.split('-').filter(Boolean);
  let score = 50;

  const intent = context.pageIntent.toLowerCase();
  if (intent === 'pricing' && /(price|pricing|cost|quote|estimate)/.test(haystack)) score += 25;
  if (intent === 'faq' && /(faq|question|answer|common)/.test(haystack)) score += 25;
  if (intent === 'trust' && /(why choose|trust|testimonial|guarantee|proof)/.test(haystack)) score += 25;

  const slugHits = slugTerms.reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0);
  score += Math.min(15, slugHits * 7);

  if (/(blog post|news|history of|ultimate guide)/.test(haystack) && intent === 'pricing') score -= 20;

  const aiScore = Number(idea.intentMatchScore || 0);
  if (aiScore > 0) {
    score = Math.round((score * 0.45) + (aiScore * 0.55));
  }

  return Math.max(0, Math.min(100, score));
}

function getLegacyMainNavFlag(values: {
  nav_placement?: PageCreationData['nav_placement'] | null;
  nav_style?: PageCreationData['nav_style'] | null;
  parent_id?: number | null;
  is_main_nav?: boolean;
}) {
  if (values.nav_placement || values.nav_style || values.parent_id) {
    return values.nav_placement === 'header'
      && values.nav_style !== 'dropdown_child'
      && !values.parent_id;
  }

  return values.is_main_nav ?? false;
}

const PageCreationWizard: React.FC<PageCreationWizardProps> = ({
  onCreatePage,
  onCancel,
  isLoading = false,
  enableAIContent = false,
  initialPageDraft,
  suggestedSlugs = [],
  availableParentPages = [],
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PageCreationData>>({
    page_type: 'main-page',
    template_type: 'standard',
    is_main_nav: false,
    is_enabled: true,
    is_published: false,
    nav_placement: 'hidden',
    nav_style: 'direct',
    nav_parent_id: null,
    parent_id: null,
  });

  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Content Generation state
  const [aiFormData, setAiFormData] = useState({
    ourUrl: "",
    city: "",
    industry: "",
    keyword: "",
    competitor1Url: "",
    competitor2Url: "",
    service: "",
    pageIntent: "general",
    pageGoal: "",
    targetAudience: "",
    primaryCta: "",
    mustInclude: "",
    mustAvoid: "",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [generatedMetadata, setGeneratedMetadata] = useState<{
    title?: string;
    description?: string;
    keywords?: string[];
  }>({});

  const { trigger, data, error, isLoading: isAILoading } = useContentAgent();

  useEffect(() => {
    if (!initialPageDraft) return;
    const inferred = inferIntentFromSlug(initialPageDraft.slug);
    setFormData((prev) => ({
      ...prev,
      title: prev.title || initialPageDraft.title,
      slug: prev.slug || initialPageDraft.slug,
      page_type: prev.page_type || initialPageDraft.page_type || "custom",
      template_type: prev.template_type || initialPageDraft.template_type || "standard",
      is_published: initialPageDraft.is_published ?? prev.is_published ?? false,
      is_main_nav: getLegacyMainNavFlag({
        nav_placement: initialPageDraft.nav_placement ?? prev.nav_placement ?? 'hidden',
        nav_style: initialPageDraft.nav_style ?? prev.nav_style ?? 'direct',
        parent_id: initialPageDraft.parent_id ?? prev.parent_id ?? null,
        is_main_nav: initialPageDraft.is_main_nav ?? prev.is_main_nav ?? false,
      }),
      is_enabled: initialPageDraft.is_enabled ?? prev.is_enabled ?? true,
      nav_placement: initialPageDraft.nav_placement ?? prev.nav_placement ?? 'hidden',
      nav_style: initialPageDraft.nav_style ?? prev.nav_style ?? 'direct',
      nav_parent_id: initialPageDraft.nav_parent_id ?? prev.nav_parent_id ?? null,
      parent_id: initialPageDraft.parent_id ?? prev.parent_id ?? null,
    }));

    setAiFormData((prev) => ({
      ...prev,
      service: prev.service || inferred.service,
      pageIntent: inferred.pageIntent,
      pageGoal: prev.pageGoal || inferred.pageGoal,
      primaryCta: prev.primaryCta || inferred.primaryCta,
      mustInclude: prev.mustInclude || inferred.mustInclude,
      mustAvoid: prev.mustAvoid || inferred.mustAvoid,
    }));

    if (!enableAIContent) {
      setStep(2);
    }
  }, [initialPageDraft, enableAIContent]);

  // Effect to handle AI content agent responses
  useEffect(() => {
    if (data && !isAILoading) {
      const ideas = parseIdeas(data);
      const messageId = Date.now().toString();
      
      if (ideas.length > 0 && data.step === 'ideas_generated') {
        const slug = String(formData.slug || '').toLowerCase();
        const rankedIdeas = ideas.map((idea) => ({
          ...idea,
          localMatchScore: scoreIdeaRelevance(idea, {
            pageIntent: aiFormData.pageIntent,
            pageGoal: aiFormData.pageGoal,
            slug,
          }),
        }));

        setChatMessages(prev => [...prev, {
          id: messageId,
          type: 'assistant',
          content: data.message || 'Here are some content ideas for your page:',
          data,
          timestamp: new Date(),
          isIdeaSelection: true,
          ideas: rankedIdeas
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
  }, [data, error, isAILoading, aiFormData.pageGoal, aiFormData.pageIntent, formData.slug]);

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
    
    trigger({
      mode: 'page_nav_copy',
      ...aiFormData,
      pageSlug: formData.slug || '',
      pageTitle: formData.title || '',
      mustInclude: splitCsvToList(aiFormData.mustInclude),
      mustAvoid: splitCsvToList(aiFormData.mustAvoid),
    });
  };

  const handleChooseIdea = (idea: ContentItem) => {
    const confidence = Number(idea.localMatchScore ?? idea.intentMatchScore ?? 0);
    if (confidence < MIN_IDEA_CONFIDENCE) {
      const shouldContinue = window.confirm(
        `This idea has a low match confidence (${confidence}%). Continue anyway?`,
      );
      if (!shouldContinue) {
        return;
      }
    }

    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: `I choose this idea: "${idea.idea}"\n\nPlease continue with competitor analysis and content development.`,
      timestamp: new Date()
    }]);
    
    trigger({
      mode: 'page_nav_copy',
      ...aiFormData,
      userChosenIdea: idea.idea,
      pageSlug: formData.slug || '',
      pageTitle: formData.title || '',
      mustInclude: splitCsvToList(aiFormData.mustInclude),
      mustAvoid: splitCsvToList(aiFormData.mustAvoid),
    });
  };

  const handleInputChange = (field: keyof PageCreationData, value: string | boolean | number | null) => {
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
      is_enabled: true,
      nav_placement: pageType === 'main-page' ? 'header' : 'hidden',
      nav_style: pageType === 'main-page' ? 'direct' : 'direct',
      nav_parent_id: null,
      parent_id: pageType === 'main-page' ? null : prev.parent_id ?? null,
    }));
  };

  const parentPageOptions = availableParentPages
    .filter((page) => !!page.id && !!page.slug)
    .map((page) => ({
      value: String(page.id),
      label: `${page.title || 'Untitled'} (/${page.slug})`,
    }));

  const selectedParentPage = availableParentPages.find(
    (page) => page.id === Number(formData.parent_id || 0),
  );
  const dropdownParentOptions = availableParentPages
    .filter((page) => !page.parent_id)
    .map((page) => ({
      value: String(page.id),
      label: `${page.title || 'Untitled'} (/${page.slug})`,
    }));

  const showInHeader = formData.nav_placement === 'header';
  const selectedNavStyle = formData.nav_style || (formData.parent_id ? 'dropdown_child' : 'direct');
  const selectedDropdownParent = availableParentPages.find(
    (page) => page.id === Number(formData.nav_parent_id || 0),
  );

  const canHaveParent = formData.page_type !== 'main-page';

  const handleParentPageChange = (value: string) => {
    const parentId = value ? Number(value) : null;
    setFormData((prev) => ({
      ...prev,
      parent_id: parentId,
      nav_style: parentId && prev.nav_placement === 'header' ? 'dropdown_child' : prev.nav_style,
      nav_parent_id: parentId && prev.nav_placement === 'header'
        ? prev.nav_parent_id ?? parentId
        : prev.nav_style === 'dropdown_child'
          ? prev.nav_parent_id
          : null,
    }));
  };

  const handleEnabledChange = (enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_enabled: enabled,
      is_published: enabled ? prev.is_published : false,
    }));
  };

  const handleHeaderVisibilityChange = (showHeader: boolean) => {
    setFormData((prev) => {
      const nextPlacement = showHeader ? 'header' : 'hidden';
      const nextStyle = showHeader
        ? prev.parent_id
          ? 'dropdown_child'
          : prev.nav_style === 'dropdown_parent' || prev.nav_style === 'dropdown_child'
            ? prev.nav_style
            : 'direct'
        : 'direct';

      return {
        ...prev,
        nav_placement: nextPlacement,
        nav_style: nextStyle,
        nav_parent_id: showHeader && nextStyle === 'dropdown_child'
          ? prev.nav_parent_id ?? prev.parent_id ?? null
          : null,
      };
    });
  };

  const handleNavStyleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      nav_style: value as PageCreationData['nav_style'],
      nav_parent_id: value === 'dropdown_child'
        ? prev.nav_parent_id ?? prev.parent_id ?? null
        : null,
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

  const handleSuggestedSlugSelect = (slug: string) => {
    if (!slug) return;
    const suggestedTitle = slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    setFormData((prev) => ({
      ...prev,
      slug,
      title: prev.title || suggestedTitle,
      page_type: prev.page_type || 'custom',
      template_type: prev.template_type || 'standard',
    }));
    const inferred = inferIntentFromSlug(slug);
    setAiFormData((prev) => ({
      ...prev,
      service: prev.service || inferred.service,
      pageIntent: inferred.pageIntent,
      pageGoal: prev.pageGoal || inferred.pageGoal,
      primaryCta: prev.primaryCta || inferred.primaryCta,
      mustInclude: prev.mustInclude || inferred.mustInclude,
      mustAvoid: prev.mustAvoid || inferred.mustAvoid,
    }));
  };

  const canProceedToStep2 = formData.page_type && formData.template_type;
  const canSubmit = formData.title && formData.slug && canProceedToStep2;
  const canReviewAndFinalize = Boolean(selectedContent) && !isAILoading;
  const selectedSuggestedSlug =
    typeof formData.slug === 'string' && suggestedSlugs.includes(formData.slug)
      ? formData.slug
      : '';

  const handleSubmit = async () => {
    if (canSubmit && formData.page_type && formData.template_type && formData.title && formData.slug) {
      setIsSubmitting(true);
      
      try {
        const pageData: PageCreationData = {
          page_type: formData.page_type,
          template_type: formData.template_type,
          title: formData.title,
          slug: formData.slug,
          parent_id: formData.parent_id || null,
          is_main_nav: getLegacyMainNavFlag({
            nav_placement: formData.nav_placement || 'hidden',
            nav_style: formData.nav_style || 'direct',
            parent_id: formData.parent_id || null,
            is_main_nav: formData.is_main_nav,
          }),
          is_enabled: formData.is_enabled ?? true,
          nav_placement: formData.nav_placement || 'hidden',
          nav_style: formData.nav_style || 'direct',
          nav_parent_id: formData.nav_style === 'dropdown_child' ? formData.nav_parent_id || null : null,
          nav_order: formData.nav_order || 0,
          nav_label: formData.title,
          is_external_link: false,
          navigation_assignments: formData.nav_placement && formData.nav_placement !== 'hidden'
            ? [{
                placement: formData.nav_placement,
                style: formData.nav_style || 'direct',
                parent_page_id: formData.nav_style === 'dropdown_child' ? formData.nav_parent_id || null : null,
                sort_order: formData.nav_order || 0,
                label: formData.title,
                is_active: formData.is_enabled ?? true,
              }]
            : [],
          is_published: formData.is_published || false,
          meta_description: formData.meta_description,
          meta_keywords: formData.meta_keywords,
          content: selectedContent || undefined, // Add AI-generated content if available
        };

        // Call the original onCreatePage handler
        await onCreatePage(pageData);
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
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
              onClick={() => setStep(enableAIContent ? 2 : 3)} 
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Page Intent</Label>
                  <Input
                    type="text"
                    name="pageIntent"
                    value={aiFormData.pageIntent}
                    onChange={handleAIFormChange}
                    placeholder="pricing, faq, trust, comparison"
                  />
                </div>
                <div>
                  <Label>Primary CTA</Label>
                  <Input
                    type="text"
                    name="primaryCta"
                    value={aiFormData.primaryCta}
                    onChange={handleAIFormChange}
                    placeholder="Request a quote"
                  />
                </div>
              </div>

              <div>
                <Label>Page Goal</Label>
                <TextArea
                  value={aiFormData.pageGoal}
                  onChange={(value) => setAiFormData((prev) => ({ ...prev, pageGoal: value }))}
                  placeholder="What should this page accomplish for the user?"
                  rows={2}
                />
              </div>

              <div>
                <Label>Target Audience</Label>
                <Input
                  type="text"
                  name="targetAudience"
                  value={aiFormData.targetAudience}
                  onChange={handleAIFormChange}
                  placeholder="Homeowners in Los Angeles needing urgent repairs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Must Include Topics (comma separated)</Label>
                  <Input
                    type="text"
                    name="mustInclude"
                    value={aiFormData.mustInclude}
                    onChange={handleAIFormChange}
                    placeholder="price ranges, permit costs, panel upgrades"
                  />
                </div>
                <div>
                  <Label>Must Avoid Topics (comma separated)</Label>
                  <Input
                    type="text"
                    name="mustAvoid"
                    value={aiFormData.mustAvoid}
                    onChange={handleAIFormChange}
                    placeholder="company history, irrelevant trends"
                  />
                </div>
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
                                onClick={() => handleChooseIdea(idea)}
                              >
                                <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                                  💡 Idea #{idx + 1} - Click to Select
                                </div>
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {typeof idea.localMatchScore === 'number' && (
                                    <span className={`rounded px-2 py-1 text-xs font-semibold ${
                                      idea.localMatchScore >= 80
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : idea.localMatchScore >= 65
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      Match Confidence: {idea.localMatchScore}%
                                    </span>
                                  )}
                                  {idea.ideaType && (
                                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                      Type: {idea.ideaType}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                  {idea.idea}
                                </div>
                                {idea.whyMatch && (
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                    {idea.whyMatch}
                                  </div>
                                )}
                                {idea.keywordTargets && idea.keywordTargets.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {idea.keywordTargets.slice(0, 3).map((keyword, kidx) => (
                                      <span key={kidx} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs">
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {typeof idea.localMatchScore === 'number' && idea.localMatchScore < 65 && (
                                  <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                                    Low relevance for this page intent. Consider refining Page Goal / Must Include and regenerate.
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
              onClick={() => setStep(enableAIContent ? 3 : 2)}
              disabled={!canReviewAndFinalize}
            >
              {selectedContent ? 'Next: Review' : 'Review & Finalize'}
            </Button>
          </div>
          {!canReviewAndFinalize && (
            <p className="text-xs text-gray-500">
              Complete the AI flow (Generate Content Ideas and pick one idea) to unlock Review &amp; Finalize.
            </p>
          )}
        </div>
      )}

      {step === (enableAIContent ? 3 : 2) && (
        <div className="space-y-4">
          {suggestedSlugs.length > 0 && (
            <div>
              <Label>Header Nav Target Page (Optional)</Label>
              <Select
                options={suggestedSlugs.map((slug) => ({
                  value: slug,
                  label: `/${slug}`,
                }))}
                defaultValue={selectedSuggestedSlug}
                onChange={(value) => handleSuggestedSlugSelect(value)}
                placeholder="Select missing nav page slug"
              />
              <p className="text-sm text-gray-500 mt-1">
                Pick a missing header-nav page to avoid 404s. This prefills slug and title.
              </p>
            </div>
          )}

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

          {canHaveParent && (
            <div>
              <Label>Parent Page (Optional)</Label>
              <Select
                options={parentPageOptions}
                defaultValue={formData.parent_id ? String(formData.parent_id) : ''}
                onChange={handleParentPageChange}
                placeholder="Top-level page (no parent)"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank to create a standalone parent page. Select a parent to create a child page.
              </p>
              {selectedParentPage && (
                <p className="text-sm text-blue-600 mt-1">
                  This page will be created under {selectedParentPage.title || 'Untitled'}.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.is_enabled ?? true}
              onChange={(e) => handleEnabledChange(e.target.checked)}
            />
            <Label htmlFor="isEnabled">Enable page</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInHeader"
              checked={showInHeader}
              onChange={(e) => handleHeaderVisibilityChange(e.target.checked)}
            />
            <Label htmlFor="showInHeader">Show in header</Label>
          </div>

          {showInHeader && (
            <div>
              <Label>Header Display</Label>
              <Select
                options={[
                  { value: 'direct', label: 'Direct link in header' },
                  { value: 'dropdown_parent', label: 'Dropdown parent in header' },
                  { value: 'dropdown_child', label: 'Child inside a dropdown' },
                ].filter((option) => !(formData.parent_id && option.value !== 'dropdown_child'))}
                defaultValue={selectedNavStyle}
                onChange={handleNavStyleChange}
                placeholder="Select header display"
              />
              <p className="text-sm text-gray-500 mt-1">
                Choose whether this page appears directly in the header, acts as a dropdown parent, or lives inside a dropdown.
              </p>
            </div>
          )}

          {showInHeader && selectedNavStyle === 'dropdown_child' && (
            <div>
              <Label>Dropdown Parent</Label>
              <Select
                options={dropdownParentOptions}
                defaultValue={formData.nav_parent_id ? String(formData.nav_parent_id) : ''}
                onChange={(value) => handleInputChange('nav_parent_id', value ? Number(value) : null)}
                placeholder="Select dropdown parent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Assign this page under a header dropdown parent.
              </p>
              {selectedDropdownParent && (
                <p className="text-sm text-blue-600 mt-1">
                  This page will appear under {selectedDropdownParent.title || 'Untitled'} in the header.
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            {!formData.is_enabled
              ? 'This page will be disabled until you re-enable it.'
              : showInHeader && selectedNavStyle === 'dropdown_child'
                ? 'This page will appear inside a header dropdown while keeping its own route and publishing state.'
                : showInHeader && selectedNavStyle === 'dropdown_parent'
                  ? 'This page will anchor a dropdown in the header for grouped navigation.'
                  : showInHeader
                    ? 'This page will appear as a direct header link.'
                    : formData.parent_id
                      ? 'This page will stay nested under its parent without appearing in the header.'
                      : 'This page will be enabled but hidden from the header.'}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="publishNow"
              checked={formData.is_published || false}
              onChange={(e) => handleInputChange('is_published', e.target.checked)}
              disabled={formData.is_enabled === false}
            />
            <Label htmlFor="publishNow">Publish now (avoid draft)</Label>
          </div>

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
              disabled={!canSubmit || isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageCreationWizard;
