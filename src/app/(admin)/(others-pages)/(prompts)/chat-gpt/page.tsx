"use client";
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import EntitlementGate from "../../../../../components/common/EntitlementGate";
import PageBreadcrumb from "../../../../../components/common/PageBreadCrumb";
import Input from "../../../../../components/form/input/InputField";
import Label from "../../../../../components/form/Label";
import Link from "next/link";
import Button from "../../../../../components/ui/button/Button";
import { useContentAgent } from "../../../../../hooks/useContentAgent";
import React from "react";
import { apiClient } from "@/lib/api-client";

// Types for better type safety
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

// Helper: parse ideas from OpenAI response
function parseIdeas(data: ContentAgentData): ContentItem[] {
    try {
        // Direct ideas array from your API response structure
        if (data?.ideas && Array.isArray(data.ideas)) {
            return data.ideas;
        }
        
        // Try to parse from content string
        const content = typeof data?.content === "string" ? JSON.parse(data.content) : data?.content;
        if (Array.isArray(content)) {
            return content.map((item: ContentItem | string) => 
                typeof item === 'string' ? { idea: item, keywordTargets: [] } : item
            );
        }
        if (content?.ideas) {
            return content.ideas;
        }
        if (content?.content_ideas) {
            return content.content_ideas;
        }
        if (content?.contentIdeas) {
            return content.contentIdeas;
        }
        return [];
    } catch {
        return [];
    }
}

const ChatInterface = ({
    messages,
    isLoading,
    onChooseIdea,
    onSendMessage,
    onGenerateMetadata
}: {
    messages: ChatMessage[];
    isLoading: boolean;
    onChooseIdea: (idea: string) => void;
    onSendMessage: (message: string) => void;
    onGenerateMetadata: (content: string) => void;
}) => {
    const [inputMessage, setInputMessage] = useState("");

    const handleSend = () => {
        if (inputMessage.trim()) {
            onSendMessage(inputMessage);
            setInputMessage("");
        }
    };

    return (
        <ComponentCard title="Content Agent Chat">
            <div className="flex flex-col h-">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            Fill out the workspace and click &quot;Generate Ideas&quot; to start a content strategy run.
                        </div>
                    )}
                    
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-3/4 p-3 rounded-lg ${
                                message.type === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white dark:bg-gray-700 border'
                            }`}>
                                {message.type === 'assistant' && message.ideas && message.ideas.length > 0 ? (
                                    <div>
                                        <p className="mb-3 font-medium">Here are three content directions based on your inputs:</p>
                                        <div className="space-y-2">
                                            {message.ideas.map((idea, idx) => (
                                                <button
                                                    key={idx}
                                                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 border border-transparent transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                                                    onClick={() => onChooseIdea(idea.idea)}
                                                >
                                                    <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                                                        Idea #{idx + 1} - Select This Direction
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
                                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                            Select one idea above to generate the full strategy: outline, competitor analysis, markdown draft, and SEO metadata.
                                        </div>
                                        
                                        {/* Raw Response Collapsible */}
                                        {message.data && (
                                            <details className="mt-4 cursor-pointer">
                                                <summary className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                                    View API Payload
                                                </summary>
                                                <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs whitespace-pre-wrap overflow-auto max-h-40 text-gray-600 dark:text-gray-300">
                                                    {JSON.stringify(message.data, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                        
                                        {/* Show Generate Metadata button after content outline (only for old step) */}
                                        {message.data?.step === 'outline_generated' && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => {
                                                        if (message.data?.content) {
                                                            onGenerateMetadata(message.data.content);
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                                >
                                                    Generate SEO Metadata
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Show action buttons for complete workflow */}
                                        {message.data?.step === 'complete_workflow' && (
                                            <div className="mt-3 space-y-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {message.data?.markdownContent && (
                                                        <button
                                                            onClick={() => {
                                                                if (message.data?.markdownContent) {
                                                                    navigator.clipboard.writeText(message.data.markdownContent);
                                                                    // Show a temporary success message
                                                                    const btn = document.activeElement as HTMLButtonElement;
                                                                    const originalText = btn.textContent;
                                                                    btn.textContent = '✅ Copied!';
                                                                    btn.disabled = true;
                                                                    setTimeout(() => {
                                                                        btn.textContent = originalText;
                                                                        btn.disabled = false;
                                                                    }, 2000);
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                                        >
                                                            Copy Markdown Draft
                                                        </button>
                                                    )}
                                                    {message.data?.metadata && (
                                                        <button
                                                            onClick={() => {
                                                                if (message.data?.metadata) {
                                                                    const metadata = typeof message.data.metadata === 'string' ? JSON.parse(message.data.metadata) : message.data.metadata;
                                                                    const metadataText = `Title: ${metadata.title}\nDescription: ${metadata.description}\nKeywords: ${metadata.keywords.join(', ')}`;
                                                                    navigator.clipboard.writeText(metadataText);
                                                                    // Show a temporary success message
                                                                    const btn = document.activeElement as HTMLButtonElement;
                                                                    const originalText = btn.textContent;
                                                                    btn.textContent = '✅ Copied!';
                                                                    btn.disabled = true;
                                                                    setTimeout(() => {
                                                                        btn.textContent = originalText;
                                                                        btn.disabled = false;
                                                                    }, 2000);
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                                        >
                                                            Copy SEO Metadata
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => {
                                                            onSendMessage("I'd like to create another content strategy with different parameters.");
                                                        }}
                                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                                    >
                                                        Start Another Strategy
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            onSendMessage("Can you help me optimize this content further or create variations?");
                                                        }}
                                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                                                    >
                                                        Refine This Draft
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Show restart button for complete workflow (old version) */}
                                        {message.data?.step === 'complete_workflow_old' && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => {
                                                        onSendMessage("I'd like to create another content strategy with different parameters.");
                                                    }}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm mr-2"
                                                >
                                                    Start Another Strategy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onSendMessage("Can you help me optimize this content further?");
                                                    }}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                                >
                                                    Refine This Draft
                                                </button>
                                            </div>
                                        )}
                                        
                                        {message.data && (
                                            <details className="mt-3 cursor-pointer">
                                                <summary className="text-sm opacity-70 hover:opacity-100">
                                                    View API Payload
                                                </summary>
                                                <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs whitespace-pre-wrap overflow-auto max-h-40 opacity-70">
                                                    {JSON.stringify(message.data, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                )}
                                <div className="text-xs opacity-60 mt-2">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-700 border p-3 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-gray-600 dark:text-gray-300">Generating content strategy...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Chat Input */}
                <div className="mt-4 flex space-x-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask a follow-up, request revisions, or type 'idea #1'..."
                        className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />
                    <Button 
                        onClick={handleSend}
                        disabled={isLoading || !inputMessage.trim()}
                        className="btn btn-primary"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </ComponentCard>
    );
};

const ChatGPTPage = () => {
    const [formData, setFormData] = useState({
        websiteId: undefined as number | undefined,
        ourUrl: "",
        city: "",
        industry: "",
        keyword: "",
        competitor1Url: "",
        competitor2Url: "",
        service: "",
    });

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const { trigger, data, error, isLoading } = useContentAgent();

    React.useEffect(() => {
        const hydrateWebsiteContext = async () => {
            const user = await apiClient.getSession();
            const websiteId =
                user && typeof user.website_id === "number"
                    ? user.website_id
                    : undefined;

            if (websiteId) {
                setFormData((prev) => ({ ...prev, websiteId }));
            }
        };

        hydrateWebsiteContext();
    }, []);

    // Effect to handle API responses and add them to chat
    React.useEffect(() => {
        if (data && !isLoading) {
            const ideas = parseIdeas(data);
            const messageId = Date.now().toString();
            
            if (ideas.length > 0 && data.step === 'ideas_generated') {
                // This is a content ideas response
                setChatMessages(prev => [...prev, {
                    id: messageId,
                    type: 'assistant',
                    content: data.message || 'Here are some content ideas for your business:',
                    data,
                    timestamp: new Date(),
                    isIdeaSelection: true,
                    ideas
                }]);
            } else if (data.step === 'complete_workflow') {
                // Complete workflow: outline, markdown content, competitor analysis, and metadata
                let content = `**✅ Content Strategy Complete!**\n\n`;
                
                content += `**📝 Content Outline:**\n${data.content}\n\n`;
                
                if (data.markdownContent) {
                    content += `**📄 Full Markdown Content:**\n\`\`\`markdown\n${data.markdownContent}\n\`\`\`\n\n`;
                }
                
                if (data.competitorAnalysis) {
                    content += `**🔍 Competitor Analysis:**\n${data.competitorAnalysis}\n\n`;
                }
                
                if (data.metadata) {
                    const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
                    content += `**SEO Metadata:**\n`;
                    content += `• **Title:** ${metadata.title}\n`;
                    content += `• **Description:** ${metadata.description}\n`;
                    content += `• **Keywords:** ${metadata.keywords.join(', ')}\n\n`;
                }
                
                content += `*Your complete content strategy is ready! You can copy the markdown content and use it directly in your CMS.*`;
                
                setChatMessages(prev => [...prev, {
                    id: messageId,
                    type: 'assistant',
                    content,
                    data,
                    timestamp: new Date()
                }]);
            } else if (data.step === 'outline_generated') {
                // Content outline was generated
                let content = `**Content Outline Generated:**\n\n${data.content}`;
                
                if (data.competitorAnalysis) {
                    content += `\n\n**Competitor Analysis:**\n${data.competitorAnalysis}`;
                }
                
                content += `\n\n*You can now generate SEO metadata, refine the angle, or continue the conversation.*`;
                
                setChatMessages(prev => [...prev, {
                    id: messageId,
                    type: 'assistant',
                    content,
                    data,
                    timestamp: new Date()
                }]);
            } else if (data.step === 'metadata_generated') {
                // Metadata was generated
                const content = `**SEO Metadata Ready:**\n\n${data.content}`;
                
                setChatMessages(prev => [...prev, {
                    id: messageId,
                    type: 'assistant',
                    content,
                    data,
                    timestamp: new Date()
                }]);
            } else {
                // This is a regular response
                const content = typeof data.content === 'string' ? data.content : JSON.stringify(data, null, 2);
                setChatMessages(prev => [...prev, {
                    id: messageId,
                    type: 'assistant',
                    content: content,
                    data,
                    timestamp: new Date()
                }]);
            }
        }
        
        if (error && !isLoading) {
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'assistant',
                content: `Error: ${error.message || String(error)}`,
                timestamp: new Date()
            }]);
        }
    }, [data, error, isLoading]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Add user message to chat
        const userMessage = `Build a content strategy for a ${formData.industry} business in ${formData.city}, targeting "${formData.keyword}".`;
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'user',
            content: userMessage,
            timestamp: new Date()
        }]);
        
        trigger(formData);
    };

    // Handler for choosing an idea and triggering the next step
    const handleChooseIdea = (idea: string) => {
        // Add user selection to chat
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'user',
            content: `Use this direction: "${idea}"\n\nContinue with competitor analysis and draft development.`,
            timestamp: new Date()
        }]);
        
        // Call trigger with the chosen idea
        trigger({ ...formData, userChosenIdea: idea });
    };

    // Handler for generating metadata
    const handleGenerateMetadata = (content: string) => {
        // Add user message to chat
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'user',
            content: "Generate SEO metadata for this draft.",
            timestamp: new Date()
        }]);
        
        // Call API with content to generate metadata
        trigger({ ...formData, content });
    };

    // Handler for custom messages in chat
    const handleSendMessage = (message: string) => {
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'user',
            content: message,
            timestamp: new Date()
        }]);
        
        // Check if user is manually selecting an idea (e.g., "idea #1", "idea 2", "choose idea 3")
        const ideaMatch = message.toLowerCase().match(/idea\s*#?(\d+)/);
        if (ideaMatch) {
            const ideaNumber = parseInt(ideaMatch[1]) - 1; // Convert to 0-based index
            
            // Find the most recent ideas message
            const lastIdeasMessage = chatMessages
                .slice()
                .reverse()
                .find(msg => msg.ideas && msg.ideas.length > 0);
                
            if (lastIdeasMessage && lastIdeasMessage.ideas && lastIdeasMessage.ideas[ideaNumber]) {
                const selectedIdea = lastIdeasMessage.ideas[ideaNumber].idea;
                // Use the same logic as handleChooseIdea
                setChatMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: `Selected: "${selectedIdea}"\n\nI’m building the full strategy now.`,
                    timestamp: new Date()
                }]);
                
                trigger({ ...formData, userChosenIdea: selectedIdea });
                return;
            }
        }
        
        // Check if user is asking for metadata generation
        if (message.toLowerCase().includes('metadata') || message.toLowerCase().includes('seo')) {
            // Look for the most recent content outline in the chat
            const lastOutlineMessage = chatMessages
                .slice()
                .reverse()
                .find(msg => msg.data?.step === 'outline_generated');
                
            if (lastOutlineMessage && lastOutlineMessage.data?.content) {
                // Generate metadata for the content
                trigger({ ...formData, content: lastOutlineMessage.data.content });
                return;
            }
        }
        
        // Check if user wants to create another strategy
        if (message.toLowerCase().includes('another') || message.toLowerCase().includes('create') || message.toLowerCase().includes('different parameters')) {
            setTimeout(() => {
                setChatMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: `To run another strategy, update the workspace above and click "Generate Ideas" again.

You can modify:
- Target city
- Industry 
- Main keyword
- Competitor URLs
- Our website URL

This will generate a fresh set of content directions based on the new inputs.`,
                    timestamp: new Date()
                }]);
            }, 1000);
            return;
        }
        
        // For other messages, provide a helpful response
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'assistant',
                content: `I received: "${message}".

Here's what I can help you with:
- Select an idea by clicking the buttons above or typing "idea #1", "idea #2", etc.
- Generate new content strategies with different parameters
- Refine outlines, metadata, and positioning
- Answer workflow questions about the draft

What would you like to explore?`,
                timestamp: new Date()
            }]);
        }, 1000);
    };



    return (
        <div>
            <PageBreadcrumb pageTitle="AI Tools" />
            <EntitlementGate
                requiredModules={["custom_ai_agent"]}
                requiredFeatures={["ai.agent.generate"]}
                pageTitle="Content Strategy Assistant"
            >
            <ComponentCard title="Content Strategy Workspace">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <form className="space-y-6 gap-2 grid grid-cols-1 xl:grid-cols-2" onSubmit={handleSubmit}>
                        <div>
                            <Label>Our URL</Label>
                            <Input type="text" name="ourUrl" value={formData.ourUrl} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Target City</Label>
                            <Input type="text" name="city" value={formData.city} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Primary Industry</Label>
                            <Input type="text" name="industry" value={formData.industry} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Primary Keyword</Label>
                            <Input type="text" name="keyword" value={formData.keyword} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Competitor URL 1</Label>
                            <Input type="text" name="competitor1Url" value={formData.competitor1Url} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Competitor URL 2</Label>
                            <Input type="text" name="competitor2Url" value={formData.competitor2Url} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Core Service</Label>
                            <Input type="text" name="service" value={formData.service} onChange={handleChange} />
                        </div>
                        <div className="">
                        <Button type="submit" className="btn btn-primary">Generate Ideas</Button>
                        </div>
                    </form>
                    <div>
                        <ul className="space-y-3">
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Use this workspace to:</span> generate initial content ideas, pick one direction, and produce a usable strategy with markdown copy and SEO metadata.
                            </li>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Tip:</span> Use real local competitors ranking for the same city and keyword combination.
                            </li>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Tip:</span> Tools like <Link href="https://www.spyfu.com/" className="underline text-blue-600">SpyFu</Link> can help surface ranking competitors and performance signals.
                            </li>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Tip:</span> Use
                                <Link href="https://answerthepublic.com/" className="underline text-blue-600">https://answerthepublic.com/</Link>
                                <span className="text-gray-500 dark:text-gray-400"> to collect question-based angles and supporting topics around the main keyword.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </ComponentCard>

            {/* Chat Interface */}
            <div className="mt-6">
            <ChatInterface
                messages={chatMessages}
                isLoading={isLoading}
                onChooseIdea={handleChooseIdea}
                onSendMessage={handleSendMessage}
                onGenerateMetadata={handleGenerateMetadata}
            />
            </div>


            <ComponentCard title="Reusable Prompt Library" className="mt-6">
                <div className="space-y-8">
                    {/* Ideas */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Idea Generation</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Blog Post Ideas</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Based on my niche {formData.industry} and ideal customer give me 10 blog post ideas that would actually attract traffic and help build topical authority</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buyer Journey Content</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Give me 3 blog post ideas for each stage of the buyer journey (top, middle, bottom) based on the topic {formData.keyword}. These should attract, educate, and convert readers over time.</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Competitor Analysis</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Here&apos;s a competitor&apos;s blog post: {formData.competitor2Url} What are they doing well, what could be improved, and how can I write something better that ranks?</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Local Content Ideas</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">What are some blog post or service page ideas I could create to rank locally for {formData.industry} in {formData.city}? Make it hyper-local and include potential headlines.</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Outline</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Using the top 3 results for {formData.keyword} write me an outline using all of the heading tags from those pages. Remove any duplicates and irrelevant tags</p>
                        </div>
                    </div>
                    {/* Blog Content Creation */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Draft Creation</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Prompt pattern:</span> Based on the chosen direction, generate a full page draft with SEO title, meta description, keywords, slug, and markdown formatting.</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Prompt pattern:</span> Make the metadata click-worthy, specific, and aligned with the page benefit and search intent.</p>

                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unique Industry Blog Input</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Ask me any questions you&apos;d need in order to write a truly unique blog post using my personal experience in {formData.industry}, opinions, customer stories, and real-world examples that no one else could replicate</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next: Answer the questions</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt: Now with the above write me a unique blog using the best seo practices</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SEO Blog From Transcript</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Using this transcript write a helpful SEO-optimized blog post that keeps my tone and includes an intro, key takeaways at the top, headings, and a clear CTA. The main keyword is {formData.keyword}. Use this competitor as example {formData.competitor1Url}</p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keyword Analysis</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Paste:</span> How many times does {formData.keyword} or variations appear on {formData.competitor1Url}. How many times does {formData.city} appear. How many heading tags use either? </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Paste:</span> How many times does {formData.keyword} or variations appear on {formData.competitor2Url}. How many times does {formData.city} appear. How many heading tags use either? </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Paste:</span> Now with the above information, write me a blog for my site {formData.ourUrl} in {formData.city}.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Page Creation</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Help me write an SEO optimized service page for {formData.keyword} in {formData.city}. Ask many questions about my unique process, testimonials, pricing, and past client results first.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">FAQ Section</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Based on this blog post {formData.ourUrl} write an SEO-optimized FAQ section using questions real people are asking in Google (People Also Ask, Reddit, and Quora). Keep answers concise and conversational using my expertise and personal experience.</p>
                            </div>
                        </div>
                    </div>

                    {/* SEO Optimization */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">SEO Optimization</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Internal Linking Opportunities</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Give me a list of internal linking opportunities for this page {formData.ourUrl} by scanning my sitemap: [our/sitemap.xml]</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title Tag Variations</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Write 5 SEO-friendly title tag variations for this blog post: {formData.ourUrl} Make them compelling, use the main keyword towards the beginning and keep them under 60 characters.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SEO Metadata</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Write SEO metadata for following blog {formData.ourUrl}. Following best SEO practices for title, description, slug, and keywords. Make them click-worthy with a clear benefit.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schema Markup</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Generate schema markup for this blog post {formData.ourUrl}. Include FAQ schema too based on the content</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">15. SEO Audit</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">I want this page to rank: {formData.ourUrl} Give me an SEO audit covering headings, internal links, keyword usage, readability, and suggestions for improvement. The main keyword is {formData.keyword}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">11. Content Gaps</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Based on my site: {formData.ourUrl} and these competitors: {formData.competitor1Url}, {formData.competitor2Url} what content gaps do I have that I should fill to boost SEO?</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">18. Website Comparison</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Compare my website {formData.ourUrl} to this competitor: {formData.competitor2Url} Tell me what they&apos;re doing better from an SEO/content perspective and what I should do to catch up or stand out.</p>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Repurposing */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Social Media Repurposing</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">6. Carousel Post</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Take this blog post {formData.ourUrl} and repurpose it into a carousel post for Instagram and Facebook.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">7. Reel Script</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Using this blog post {formData.ourUrl}, write me a script for a reel. Give me 5 options for hooks. I only have an iPhone and will use a free app to edit it.</p>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Content Strategy */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Advanced Content Strategy</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">19. Backlink Content</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Suggest 5 content ideas I could create that naturally attract backlinks in my niche. Think tools, data studies, templates, or free resources people would want to link to.</p>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Link Building Notes</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">21. Guest Post Strategy</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">TODO: Go to Google [industry] intitle:&quot;write for us&quot; and email all to get backlinks</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">22. Authority Targets</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Authority and Ref Domain should be around 10</p>
                            </div>
                        </div>
                    </div>
                </div>
            </ComponentCard>
            </EntitlementGate>

        </div>

    );
};

export default ChatGPTPage;
