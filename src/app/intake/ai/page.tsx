"use client";

/**
 * /intake/ai — AI-assisted client onboarding.
 *
 * Three phases:
 *   1. Start: ask the client whether they have a website.
 *   2. Fill:
 *      - "Yes" path → POST /api/intake/prefill, hydrate answers from the site.
 *      - "No" path  → chat with /api/intake/agent, filling answers progressively.
 *   3. Review: show the intake sections with AI answers pre-populated. Client
 *      edits as needed and submits to /api/intake/submit (same final endpoint
 *      as the classic /intake form).
 *
 * This page lives alongside the classic form at /intake — nothing about
 * the existing route changes.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getIntakeSections,
  type BusinessType,
  type IntakeQuestion,
  type IntakeSection,
} from "@/lib/intake-questions";
import type {
  IntakeAnswerValue,
  IntakeAnswers,
  IntakeFileRef,
} from "@/lib/intake-types";
import type { AiSuggestedFile } from "@/lib/intake-ai-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "start" | "prefill" | "chat" | "review" | "done";

interface TokenPayload {
  email: string;
  tenantId: number;
  businessType?: BusinessType;
  websiteId?: number;
  tenantName?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BusinessSeed {
  businessName?: string;
  category?: string;
  location?: string;
}

// ─── Token hook (mirrors /intake/page.tsx) ────────────────────────────────────

function useIntakeToken() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("No intake token found. Please use the link from your email.");
      setLoading(false);
      return;
    }

    fetch("/api/intake/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error ?? "Invalid or expired link. Please request a new one.",
          );
        }
        return res.json();
      })
      .then((data: TokenPayload) => setPayload(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return { token, payload, error, loading };
}

// ─── Shared UI bits ───────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-[#1a1a2e] dark:border-gray-800">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-6">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-extrabold text-[#CD7F32]">R</span>
            <span className="inline-block h-0.5 w-5 bg-[#C41E3A]" />
            <span className="text-2xl font-extrabold text-[#CD7F32]">D</span>
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-[#CD7F32]">
              TECH
            </div>
            <div className="-mt-0.5 text-xs font-bold tracking-widest text-[#C41E3A]">
              BRIDGE
            </div>
          </div>
          <div className="ml-auto">
            <span className="rounded-full bg-[#CD7F32]/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#CD7F32]">
              AI assisted
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#CD7F32]" />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#C41E3A]/20 bg-[#C41E3A]/5 p-4 text-sm text-[#C41E3A] dark:border-[#C41E3A]/30 dark:bg-[#C41E3A]/10">
      {message}
    </div>
  );
}

// ─── Review question field (lightweight, edit-only) ───────────────────────────

interface ReviewFieldProps {
  question: IntakeQuestion;
  value: IntakeAnswerValue;
  aiFilled: boolean;
  onChange: (questionId: string, value: string | string[] | boolean) => void;
}

function ReviewField({ question, value, aiFilled, onChange }: ReviewFieldProps) {
  const baseInputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={question.id}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <span>
          {question.label}
          {question.required && <span className="text-[#C41E3A] ml-1">*</span>}
        </span>
        {aiFilled ? (
          <span className="rounded-full bg-[#CD7F32]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#CD7F32]">
            AI draft
          </span>
        ) : null}
      </label>
      {question.hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{question.hint}</p>
      )}

      {(question.type === "text" || question.type === "number") && (
        <input
          id={question.id}
          type={question.type === "number" ? "number" : "text"}
          placeholder={question.placeholder}
          value={(value as string | number | null) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className={baseInputClass}
        />
      )}

      {question.type === "textarea" && (
        <textarea
          id={question.id}
          rows={4}
          placeholder={question.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className={baseInputClass}
        />
      )}

      {question.type === "select" && (
        <select
          id={question.id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className={baseInputClass}
        >
          <option value="">Select an option...</option>
          {question.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {question.type === "multiselect" && (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const selected = Array.isArray(value) ? value : [];
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value];
                    onChange(question.id, next);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#CD7F32] focus:ring-[#CD7F32]"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}

      {question.type === "boolean" && (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(question.id, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#CD7F32] focus:ring-[#CD7F32]"
          />
          Yes
        </label>
      )}

      {(question.type === "file" || question.type === "multifile") && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          File uploads are collected on the classic intake form. Use the
          &quot;Manual form&quot; link below when you&apos;re ready to upload.
        </p>
      )}
    </div>
  );
}

// ─── Phase: Start ─────────────────────────────────────────────────────────────

interface StartPhaseProps {
  onHasWebsite: (url: string) => void;
  onNoWebsite: (seed: BusinessSeed) => void;
  onSkip: () => void;
  token: string;
  loadingPrefill: boolean;
  prefillError: string | null;
}

function StartPhase({
  onHasWebsite,
  onNoWebsite,
  onSkip,
  token,
  loadingPrefill,
  prefillError,
}: StartPhaseProps) {
  const [mode, setMode] = useState<"choose" | "url" | "seed">("choose");
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Let&apos;s build your site together
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Our AI assistant can do most of the paperwork for you — in about 5
          minutes instead of 15. How would you like to start?
        </p>
      </div>

      {mode === "choose" && (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("url")}
            className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-[#CD7F32] hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              I already have a website
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We&apos;ll read your existing site and pre-fill most of your
              answers. You just review and tweak.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("seed")}
            className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-[#CD7F32] hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              I&apos;m starting fresh
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chat with our assistant — it&apos;ll draft services, brand words,
              and more based on your business type so you just react.
            </p>
          </button>
        </div>
      )}

      {mode === "url" && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Your current website URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourbusiness.com"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We&apos;ll read your homepage and any other linked content. This
            takes about 10–20 seconds.
          </p>
          {prefillError && <ErrorBanner message={prefillError} />}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!url.trim() || !token || loadingPrefill}
              onClick={() => onHasWebsite(url.trim())}
              className="inline-flex items-center gap-2 rounded-lg bg-[#CD7F32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-950"
            >
              {loadingPrefill ? <Spinner /> : null}
              {loadingPrefill ? "Reading your site…" : "Pre-fill from site"}
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {mode === "seed" && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Give the assistant a quick head start. All of these are editable
            later — we just need enough to draft sensible suggestions.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Business name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Smith's Plumbing"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                What do you do?
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. mobile dog grooming"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              City or service area
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Austin, TX"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!businessName.trim() || !category.trim()}
              onClick={() =>
                onNoWebsite({
                  businessName: businessName.trim() || undefined,
                  category: category.trim() || undefined,
                  location: location.trim() || undefined,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#CD7F32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-950"
            >
              Start the chat
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
        >
          Prefer to fill it out yourself? Use the classic form instead.
        </button>
      </div>
    </div>
  );
}

// ─── Phase: Chat (cold-start conversational) ──────────────────────────────────

interface ChatPhaseProps {
  token: string;
  seed: BusinessSeed;
  initialAnswers: IntakeAnswers;
  onComplete: (answers: IntakeAnswers) => void;
  onBack: () => void;
}

function ChatPhase({
  token,
  seed,
  initialAnswers,
  onComplete,
  onBack,
}: ChatPhaseProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<IntakeAnswers>(initialAnswers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const primedRef = useRef(false);

  // Keep the latest-message-in-view behavior snappy.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendTurn = useCallback(
    async (nextMessages: ChatMessage[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/intake/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            messages: nextMessages,
            currentAnswers: answers,
            businessSeed: seed,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "The assistant is unavailable right now.");
        }
        const reply: string = body.reply ?? "";
        const extractedAnswers = (body.extractedAnswers ?? {}) as IntakeAnswers;
        const isComplete = Boolean(body.isComplete);

        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        if (Object.keys(extractedAnswers).length > 0) {
          setAnswers((prev) => ({ ...prev, ...extractedAnswers }));
        }
        if (isComplete) setComplete(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [answers, seed, token],
  );

  // Prime the conversation with an opening assistant message on mount.
  useEffect(() => {
    if (primedRef.current) return;
    primedRef.current = true;
    void sendTurn([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    void sendTurn(next);
  }, [input, messages, loading, sendTurn]);

  const filledCount = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tell us about your business
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The assistant drafts as you talk. {filledCount} field
            {filledCount === 1 ? "" : "s"} filled so far.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          ← Start over
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[520px] min-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        {messages.length === 0 && loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Spinner />
            Starting the conversation…
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "max-w-[85%] rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                : "ml-auto max-w-[85%] rounded-lg bg-[#CD7F32] px-4 py-2.5 text-sm text-white"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Spinner />
            Thinking…
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            complete
              ? "Anything to add? Or click Review and edit →"
              : "Type your reply…"
          }
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          Send
        </button>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          Your replies are only used to fill in the intake form.
        </p>
        <button
          type="button"
          disabled={!complete && filledCount < 4}
          onClick={() => onComplete(answers)}
          className="rounded-lg bg-[#CD7F32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review and edit →
        </button>
      </div>
    </div>
  );
}

// ─── Phase: Review (edit + submit) ────────────────────────────────────────────

interface ReviewPhaseProps {
  token: string;
  sections: IntakeSection[];
  answers: IntakeAnswers;
  aiFilledFields: Set<string>;
  suggestedFiles: AiSuggestedFile[];
  onChange: (questionId: string, value: string | string[] | boolean) => void;
  onDone: () => void;
  onBack: () => void;
}

function ReviewPhase({
  token,
  sections,
  answers,
  aiFilledFields,
  suggestedFiles,
  onChange,
  onDone,
  onBack,
}: ReviewPhaseProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;

      const requiredQuestions = sections
        .flatMap((s) => s.questions)
        .filter((q) => q.required);

      const missing = requiredQuestions.filter((q) => {
        const val = answers[q.id];
        if (val === null || val === undefined || val === "") return true;
        if (Array.isArray(val) && val.length === 0) return true;
        return false;
      });

      if (missing.length > 0) {
        setError(
          `Please fill in: ${missing.map((q) => q.label).join(", ")}`,
        );
        return;
      }

      setSubmitting(true);
      setError(null);

      // Suggested image URLs from the prefill step are sent to the admin as a
      // note in the answers blob under __ai_suggested_files — this MVP does
      // not re-upload external images into S3 automatically.
      const answersWithMeta: IntakeAnswers = { ...answers };
      if (suggestedFiles.length > 0) {
        answersWithMeta["__ai_suggested_files"] = JSON.stringify(
          suggestedFiles,
        );
      }

      try {
        const res = await fetch("/api/intake/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            answers: answersWithMeta,
            files: [] as IntakeFileRef[],
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Submission failed. Please try again.");
        }
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
    [answers, onDone, sections, suggestedFiles, token],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review and edit
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fields marked{" "}
            <span className="rounded-full bg-[#CD7F32]/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#CD7F32]">
              AI draft
            </span>{" "}
            were pre-filled for you. Edit anything that&apos;s off.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          ← Back
        </button>
      </div>

      {suggestedFiles.length > 0 && (
        <div className="rounded-xl border border-[#CD7F32]/30 bg-[#CD7F32]/5 p-4 text-sm text-gray-700 dark:text-gray-200">
          <p className="mb-2 font-semibold text-[#CD7F32]">
            Images we spotted on your site
          </p>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            We saved these references for your account manager. You can upload
            final versions on the classic form.
          </p>
          <ul className="space-y-1 text-xs">
            {suggestedFiles.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.questionId}:</span>{" "}
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#CD7F32] underline"
                >
                  {f.url}
                </a>
                {f.reason ? ` — ${f.reason}` : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.map((section) => (
        <div
          key={section.id}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
            {section.title}
          </h2>
          {section.description && (
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {section.description}
            </p>
          )}
          <div className="space-y-5">
            {section.questions.map((q) => (
              <ReviewField
                key={q.id}
                question={q}
                value={answers[q.id] ?? null}
                aiFilled={aiFilledFields.has(q.id)}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      ))}

      {error && <ErrorBanner message={error} />}

      <div className="flex justify-end pb-12">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#CD7F32] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit questionnaire"}
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function AiIntakeInner() {
  const { token, payload, error: tokenError, loading } = useIntakeToken();
  const [phase, setPhase] = useState<Phase>("start");
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [suggestedFiles, setSuggestedFiles] = useState<AiSuggestedFile[]>([]);
  const [seed, setSeed] = useState<BusinessSeed>({});
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);

  const businessType: BusinessType = payload?.businessType ?? "universal";
  const sections = useMemo(
    () => (payload ? getIntakeSections(businessType) : []),
    [businessType, payload],
  );

  const handleAnswerChange = useCallback(
    (questionId: string, value: string | string[] | boolean) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      // Any manual edit drops the "AI draft" pill for that field.
      setAiFilledFields((prev) => {
        if (!prev.has(questionId)) return prev;
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    },
    [],
  );

  const handlePrefill = useCallback(
    async (websiteUrl: string) => {
      if (!token) return;
      setPrefillLoading(true);
      setPrefillError(null);
      try {
        const res = await fetch("/api/intake/prefill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, websiteUrl }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error ?? "Couldn't read that site.");
        }
        const incoming = (body.answers ?? {}) as IntakeAnswers;
        setAnswers((prev) => ({ ...prev, ...incoming }));
        setAiFilledFields(new Set(Object.keys(incoming)));
        setSuggestedFiles(
          Array.isArray(body.suggestedFiles) ? body.suggestedFiles : [],
        );
        setPhase("review");
      } catch (err) {
        setPrefillError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      } finally {
        setPrefillLoading(false);
      }
    },
    [token],
  );

  const handleChatStart = useCallback((nextSeed: BusinessSeed) => {
    setSeed(nextSeed);
    // Seed whatever we already have from the head-start form.
    const seeded: IntakeAnswers = {};
    if (nextSeed.businessName) seeded.business_name = nextSeed.businessName;
    if (nextSeed.location) seeded.location = nextSeed.location;
    setAnswers((prev) => ({ ...prev, ...seeded }));
    setAiFilledFields(new Set(Object.keys(seeded)));
    setPhase("chat");
  }, []);

  const handleChatComplete = useCallback((chatAnswers: IntakeAnswers) => {
    setAnswers((prev) => ({ ...prev, ...chatAnswers }));
    setAiFilledFields((prev) => {
      const next = new Set(prev);
      for (const k of Object.keys(chatAnswers)) next.add(k);
      return next;
    });
    setPhase("review");
  }, []);

  // ─── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner />
          Verifying your link…
        </div>
      </PageShell>
    );
  }

  if (tokenError) {
    return (
      <PageShell>
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-gray-900">
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Link Invalid or Expired
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tokenError}
          </p>
        </div>
      </PageShell>
    );
  }

  if (!token || !payload) {
    return null;
  }

  if (phase === "done") {
    return (
      <PageShell>
        <div className="max-w-md rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm dark:border-green-900 dark:bg-gray-900">
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Thank you!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your AI-assisted intake is in. We&apos;ll start building your site
            and reach out with any questions.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {phase === "start" && (
        <StartPhase
          token={token}
          loadingPrefill={prefillLoading}
          prefillError={prefillError}
          onHasWebsite={handlePrefill}
          onNoWebsite={handleChatStart}
          onSkip={() => {
            // Preserve token on the way back to the classic form.
            window.location.href = `/intake?token=${encodeURIComponent(token)}`;
          }}
        />
      )}
      {phase === "chat" && (
        <ChatPhase
          token={token}
          seed={seed}
          initialAnswers={answers}
          onComplete={handleChatComplete}
          onBack={() => setPhase("start")}
        />
      )}
      {phase === "review" && (
        <ReviewPhase
          token={token}
          sections={sections}
          answers={answers}
          aiFilledFields={aiFilledFields}
          suggestedFiles={suggestedFiles}
          onChange={handleAnswerChange}
          onDone={() => setPhase("done")}
          onBack={() => setPhase("start")}
        />
      )}
      <div className="mt-8 text-center text-xs text-gray-400">
        Need the full manual form?{" "}
        <Link
          href={`/intake?token=${encodeURIComponent(token)}`}
          className="underline hover:text-gray-600 dark:hover:text-gray-200"
        >
          Use the classic intake instead
        </Link>
      </div>
    </PageShell>
  );
}

// ─── Page export (Suspense required for useSearchParams) ──────────────────────

export default function AiIntakePage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Spinner />
            Loading…
          </div>
        </PageShell>
      }
    >
      <AiIntakeInner />
    </Suspense>
  );
}
