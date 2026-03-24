"use client";
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
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
                            Fill out the form and click &quot;Start Conversation&quot; to begin
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
                                        <p className="mb-3 font-medium">Here are 3 content ideas for your business:</p>
                                        <div className="space-y-2">
                                            {message.ideas.map((idea, idx) => (
                                                <button
                                                    key={idx}
                                                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 border border-transparent transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                                                    onClick={() => onChooseIdea(idea.idea)}
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
                                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                            👆 <strong>Click any idea above</strong> to automatically generate the complete content strategy (outline + competitor analysis + SEO metadata)
                                        </div>
                                        
                                        {/* Raw Response Collapsible */}
                                        {message.data && (
                                            <details className="mt-4 cursor-pointer">
                                                <summary className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                                    View Raw Response
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
                                                    🏷️ Generate SEO Metadata
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
                                                            📄 Copy Markdown Content
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
                                                            🏷️ Copy SEO Metadata
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
                                                        🔄 Create Another Strategy
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            onSendMessage("Can you help me optimize this content further or create variations?");
                                                        }}
                                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                                                    >
                                                        ⚡ Optimize Further
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
                                                    🔄 Create Another Strategy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onSendMessage("Can you help me optimize this content further?");
                                                    }}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                                >
                                                    ⚡ Optimize Further
                                                </button>
                                            </div>
                                        )}
                                        
                                        {message.data && (
                                            <details className="mt-3 cursor-pointer">
                                                <summary className="text-sm opacity-70 hover:opacity-100">
                                                    View Raw Response
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
                                    <span className="text-gray-600 dark:text-gray-300">AI is thinking...</span>
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
                        placeholder="Continue the conversation..."
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
                    content += `**🏷️ SEO Metadata:**\n`;
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
                
                content += `\n\n*You can now ask me to generate SEO metadata for this content, or continue the conversation.*`;
                
                setChatMessages(prev => [...prev, {
                    id: messageId,
                    type: 'assistant',
                    content,
                    data,
                    timestamp: new Date()
                }]);
            } else if (data.step === 'metadata_generated') {
                // Metadata was generated
                const content = `**SEO Metadata Generated:**\n\n${data.content}`;
                
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
        const userMessage = `Starting content generation for ${formData.industry} business in ${formData.city}, targeting "${formData.keyword}"`;
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
            content: `I choose this idea: "${idea}"\n\nPlease continue with competitor analysis and content development.`,
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
            content: "Generate SEO metadata for this content outline",
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
                    content: `Perfect! You've selected: "${selectedIdea}"\n\nLet me create the complete content strategy for you...`,
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
                    content: `Great! To create another content strategy, please fill out the form above with new parameters and click "Start Conversation" again. 

You can modify:
- Target city
- Industry 
- Main keyword
- Competitor URLs
- Our website URL

This will give you fresh content ideas tailored to your new parameters.`,
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
                content: `I received your message: "${message}". 

Here's what I can help you with:
- Select an idea by clicking the buttons above or typing "idea #1", "idea #2", etc.
- Generate new content strategies with different parameters
- Answer questions about SEO and content marketing
- Provide guidance on implementing your content strategy

What would you like to explore?`,
                timestamp: new Date()
            }]);
        }, 1000);
    };



    return (
        <div>
            <PageBreadcrumb pageTitle="Prompts" />
            <ComponentCard title="Ask ChatGPT">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <form className="space-y-6 gap-2 grid grid-cols-1 xl:grid-cols-2" onSubmit={handleSubmit}>
                        <div>
                            <Label>Our Url</Label>
                            <Input type="text" name="ourUrl" value={formData.ourUrl} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>City</Label>
                            <Input type="text" name="city" value={formData.city} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Industry</Label>
                            <Input type="text" name="industry" value={formData.industry} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Keyword</Label>
                            <Input type="text" name="keyword" value={formData.keyword} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Competitor #1 Url</Label>
                            <Input type="text" name="competitor1Url" value={formData.competitor1Url} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Competitor #2 Url</Label>
                            <Input type="text" name="competitor2Url" value={formData.competitor2Url} onChange={handleChange} />
                        </div>
                        <div>
                            <Label>Service</Label>
                            <Input type="text" name="service" value={formData.service} onChange={handleChange} />
                        </div>
                        <div className="">
                        <Button type="submit" className="btn btn-primary">Ai Generate</Button>
                        </div>
                    </form>
                    <div>
                        <ul>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Note:</span> This is a demo page to show how to use the ChatGPT.
                            </li>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Tip:</span> Google competitor by Industry, City, and Keyword to find relevant competitors.
                            </li>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Tip:</span> Paste it to <Link href="https://www.spyfu.com/" className="underline text-blue-600">https://www.spyfu.com/</Link> Get top Performance and use their URL as Competitor
                            </li>
                            <li className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Tip:</span> Find Questions and Answers for Blogs
                                <Link href="https://answerthepublic.com/" className="underline text-blue-600">https://answerthepublic.com/</Link>
                                <span className="text-gray-500 dark:text-gray-400"> to get ideas for your content. Add Keyword and get blog idea</span>
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


            <ComponentCard title="SEO & Content ChatGPT Prompts" className="mt-6">
                <div className="space-y-8">
                    {/* Ideas */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Ideas Creation</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">4. Blog Post Ideas</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Based on my niche {formData.industry} and ideal customer give me 10 blog post ideas that would actually attract traffic and help build topical authority</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">17. Buyer Journey Content</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Give me 3 blog post ideas for each stage of the buyer journey (top, middle, bottom) based on the topic {formData.keyword}. These should attract, educate, and convert readers over time.</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">8. Competitor Analysis</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Here&apos;s a competitor&apos;s blog post: {formData.competitor2Url} What are they doing well, what could be improved, and how can I write something better that ranks?</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">12. Local Content Ideas</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">What are some blog post or service page ideas I could create to rank locally for {formData.industry} in {formData.city}? Make it hyper-local and include potential headlines.</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">16. Content Outline</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Using the top 3 results for {formData.keyword} write me an outline using all of the heading tags from those pages. Remove any duplicates and irrelevant tags</p>
                        </div>
                    </div>
                    {/* Blog Content Creation */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Blog Content Creation</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Hints:</span> Base on outcome give me an entire page content that includes seo title, metadata description, keywords, slug in Markdown Format </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Hints:</span> Base on outcome give me an entire page content that includes seo title, metadata description, keywords, slug in Markdown Format. Make them click-worthy with a clear benefit. </p>

                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">1. Unique Blog Post Questions in Industry</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Ask me any questions you&apos;d need in order to write a truly unique blog post using my personal experience in {formData.industry}, opinions, customer stories, and real-world examples that no one else could replicate</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next: Answer the questions</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt: Now with the above write me a unique blog using the best seo practices</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. SEO Blog from Transcript</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Using this transcript write a helpful SEO-optimized blog post that keeps my tone and includes an intro, key takeaways at the top, headings, and a clear CTA. The main keyword is {formData.keyword}. Use this competitor as example {formData.competitor1Url}</p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">20. Keyword Analysis</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Paste:</span> How many times does {formData.keyword} or variations appear on {formData.competitor1Url}. How many times does {formData.city} appear. How many heading tags use either? </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Paste:</span> How many times does {formData.keyword} or variations appear on {formData.competitor2Url}. How many times does {formData.city} appear. How many heading tags use either? </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold">Paste:</span> Now with the above information, write me a blog for my site {formData.ourUrl} in {formData.city}.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">13. Service Page Creation</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Help me write an SEO optimized service page for {formData.keyword} in {formData.city}. Ask many questions about my unique process, testimonials, pricing, and past client results first.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">9. FAQ Section</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Based on this blog post {formData.ourUrl} write an SEO-optimized FAQ section using questions real people are asking in Google (People Also Ask, Reddit, and Quora). Keep answers concise and conversational using my expertise and personal experience.</p>
                            </div>
                        </div>
                    </div>

                    {/* SEO Optimization */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">SEO Optimization</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Internal Linking Opportunities</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Give me a list of internal linking opportunities for this page {formData.ourUrl} by scanning my sitemap: [our/sitemap.xml]</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">5. Title Tag Variations</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Write 5 SEO-friendly title tag variations for this blog post: {formData.ourUrl} Make them compelling, use the main keyword towards the beginning and keep them under 60 characters.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">10. SEO Metadata</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Write SEO metadata for following blog {formData.ourUrl}. Following best SEO practices for title, description, slug, and keywords. Make them click-worthy with a clear benefit.</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">14. Schema Markup</p>
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

        </div>

    );
};

export default ChatGPTPage;
