// ─── Shared AI Lead Agent types ──────────────────────────────────────────────

export type AiLeadStatus = "new" | "contacted" | "converted" | "dismissed";

export interface AiLead {
  id: string;
  website_id: number;
  tenant_id: number;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  initial_question: string | null;
  conversation: ConversationMessage[];
  status: AiLeadStatus;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiAgentConfig {
  active?: boolean;
  tone?: string;
  capture_fields?: string[];
  greeting?: string;
  handoff_email?: string;
}

// ─── API response shapes ─────────────────────────────────────────────────────

export interface GetLeadsResponse {
  leads: AiLead[];
  total: number;
}

export interface GetLeadResponse {
  lead: AiLead;
}

export interface GetConfigResponse {
  config: AiAgentConfig;
}

export interface UpdateConfigResponse {
  config: AiAgentConfig;
}

// ─── Public chat types (used by the site widget) ─────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  answer: string;
  leadCaptured: boolean;
  sessionId?: string;
}
