"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import EntitlementGate from "@/components/common/EntitlementGate";
import { useAiAgentConfig } from "@/hooks/useAiAgentConfig";

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function AiAgentSettingsPage() {
  const { config, loading, saving, error, save } = useAiAgentConfig();

  const [active, setActive]             = useState(true);
  const [tone, setTone]                 = useState("professional");
  const [greeting, setGreeting]         = useState("");
  const [handoffEmail, setHandoffEmail] = useState("");

  // Sync form when config loads
  useEffect(() => {
    if (loading) return;
    setActive(config.active !== false);
    setTone(config.tone ?? "professional");
    setGreeting(config.greeting ?? "");
    setHandoffEmail(config.handoff_email ?? "");
  }, [config, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await save({
      active,
      tone,
      ...(greeting.trim()      ? { greeting:      greeting.trim() }      : {}),
      ...(handoffEmail.trim()  ? { handoffEmail:  handoffEmail.trim() }  : {}),
    });
    if (ok) toast.success("Settings saved.");
    else toast.error(error ?? "Failed to save.");
  }

  return (
    <EntitlementGate
      requiredModules={["custom_ai_agent"]}
      pageTitle="AI Agent Settings"
    >
      <>
      <PageBreadcrumb pageTitle="AI Agent Settings" />

      <ComponentCard
        title="Chat Widget Configuration"
        desc="Controls how the AI chat widget behaves on your public website."
      >
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable chat widget
                </p>
                <p className="text-xs text-gray-400">
                  Show the AI chat bubble on your public website.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  active ? "bg-[#CD7F32]" : "bg-gray-200 dark:bg-gray-700"
                }`}
                aria-label="Toggle chat widget"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Tone */}
            <div>
              <label className={LABEL}>Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className={INPUT}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Sets the conversational style of the AI responses.
              </p>
            </div>

            {/* Greeting */}
            <div>
              <label className={LABEL}>Opening greeting</label>
              <input
                type="text"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Hi! How can I help you today?"
                className={INPUT}
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-400">
                Shown as the first message when a visitor opens the chat.
              </p>
            </div>

            {/* Handoff email */}
            <div>
              <label className={LABEL}>Lead notification email</label>
              <input
                type="email"
                value={handoffEmail}
                onChange={(e) => setHandoffEmail(e.target.value)}
                placeholder="you@example.com"
                className={INPUT}
              />
              <p className="mt-1 text-xs text-gray-400">
                Receive an email when the AI captures a new lead from your site.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#CD7F32] px-5 py-2 text-sm font-medium text-white hover:bg-[#b06e2b] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </ComponentCard>
      </>
    </EntitlementGate>
  );
}
