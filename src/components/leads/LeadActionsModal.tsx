"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth-context";
import {
  buildOutreachEmail,
  buildCallScript,
  type LeadSource,
  type LeadTier,
} from "@/lib/outreach-templates";
import type { OutreachLead } from "@/app/(admin)/(others-pages)/leads/page";

interface LeadActionsModalProps {
  lead: OutreachLead;
  onClose: () => void;
  onUpdated: () => void;
}

const STAGE_OVERRIDE_OPTIONS = [
  { value: "qualified", label: "Qualified" },
  { value: "disqualified", label: "Disqualified" },
  { value: "attempting", label: "Attempting" },
  { value: "interested", label: "Interested" },
  { value: "examples_sent", label: "Examples sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const CALL_OUTCOME_OPTIONS = [
  { value: "no_answer", label: "No answer" },
  { value: "voicemail", label: "Left voicemail" },
  { value: "gatekeeper", label: "Blocked by gatekeeper" },
  { value: "interested", label: "Interested" },
  { value: "callback", label: "Booked a callback" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
];

export default function LeadActionsModal({ lead, onClose, onUpdated }: LeadActionsModalProps) {
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [callChannel, setCallChannel] = useState<"call" | "text">("call");
  const [isLogging, setIsLogging] = useState(false);
  const [statusChoice, setStatusChoice] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigateResult, setInvestigateResult] = useState<string | null>(null);
  const [touches, setTouches] = useState<Record<string, unknown>[]>([]);
  const [callOutcome, setCallOutcome] = useState("no_answer");
  const [callbackAt, setCallbackAt] = useState("");
  const [callbackNote, setCallbackNote] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    const draft = buildOutreachEmail({
      source: lead.source as LeadSource,
      tier: lead.tier as LeadTier,
      businessName: lead.business_name,
      contactName: lead.contact_name,
      city: lead.city,
      trade: lead.trade,
      rating: lead.rating,
      reviewCount: lead.review_count,
      senderName: "Cesar",
    });
    setSubject(draft.subject);
    setEmailBody(draft.body);
    setEmailInput(lead.email || "");
    apiClient
      .getOutreachLeadTouches(lead.id)
      .then((rows) => setTouches(Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []))
      .catch(() => setTouches([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const handleSend = async () => {
    if (!lead.email) return;
    setIsSending(true);
    setError(null);
    try {
      await apiClient.sendLeadOutreachEmail({
        leadId: lead.id,
        to: lead.email,
        subject,
        body: emailBody,
        source: lead.source,
        tier: lead.tier,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send email"));
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveEmail = async () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    setIsSavingEmail(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, { email: trimmed });
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save email"));
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleInvestigate = async () => {
    setIsInvestigating(true);
    setInvestigateResult(null);
    setError(null);
    try {
      const token = getStoredAuthToken();
      const response = await fetch("/api/leads/investigate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leadId: lead.id,
          businessName: lead.business_name,
          city: lead.city || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to investigate lead");
      }
      const outcomeMessages: Record<string, string> = {
        already_complete: "This lead already has a website and email on file.",
        found_email: "Found a contact email and saved it.",
        found_website: "Found a website and saved it.",
        place_no_website: "Found the business, but it has no website on file.",
        no_match: "No matching business found.",
        website_no_email: "No email found on the site.",
      };
      setInvestigateResult(outcomeMessages[data.outcome] || "Investigation complete.");
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to investigate lead"));
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleLogCall = async () => {
    setIsLogging(true);
    setError(null);
    try {
      if (callChannel === "call") {
        if (callOutcome === "callback" && !callbackAt) {
          setError("Pick a callback date and time.");
          setIsLogging(false);
          return;
        }
        await apiClient.logOutreachTouch(lead.id, {
          channel: "call",
          callOutcome: callOutcome as
            | "no_answer"
            | "voicemail"
            | "gatekeeper"
            | "wrong_number"
            | "interested"
            | "callback"
            | "not_interested",
          outcomeNotes: callNotes || undefined,
          nextActionAt: callOutcome === "callback" ? new Date(callbackAt).toISOString() : undefined,
          nextActionNote: callOutcome === "callback" ? callbackNote || undefined : undefined,
        });
      } else {
        await apiClient.logOutreachTouch(lead.id, {
          channel: "text",
          outcomeNotes: callNotes || undefined,
        });
      }
      setCallNotes("");
      setCallbackAt("");
      setCallbackNote("");
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to log call"));
    } finally {
      setIsLogging(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleAt) return;
    setIsRescheduling(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, {
        nextActionAt: new Date(rescheduleAt).toISOString(),
        nextActionNote: rescheduleNote || null,
      });
      setRescheduleAt("");
      setRescheduleNote("");
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reschedule"));
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleStageUpdate = async () => {
    if (!statusChoice) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, { stage: statusChoice });
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update stage"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-2xl p-6">
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">{lead.business_name}</h3>
      <p className="mb-4 text-sm text-gray-500">Stage: {lead.stage}</p>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {(() => {
        const script = buildCallScript({
          businessName: lead.business_name,
          trade: lead.trade,
          city: lead.city,
          reviewCount: lead.review_count,
        });
        return (
          <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
            <p className="font-medium text-gray-700 dark:text-gray-200">Opening line</p>
            <p className="mt-1 text-gray-600 dark:text-gray-300">{script.opener}</p>
            <p className="mt-3 font-medium text-gray-700 dark:text-gray-200">Pitch</p>
            <ul className="mt-1 list-disc pl-5 text-gray-600 dark:text-gray-300">
              {script.pitch.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <p className="mt-3 font-medium text-gray-700 dark:text-gray-200">If they push back</p>
            <dl className="mt-1 space-y-1 text-gray-600 dark:text-gray-300">
              {script.objections.map((o, i) => (
                <div key={i}>
                  <dt className="italic">{o.objection}</dt>
                  <dd className="pl-3">{o.response}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })()}

      <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Call history</Label>
        {touches.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No calls or emails logged yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...touches].reverse().map((t) => (
              <li key={String(t.id)} className="border-b border-gray-100 pb-2 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(String(t.created_at)).toLocaleString()}
                </span>{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">{String(t.channel)}</span>
                {t.call_outcome ? ` - ${String(t.call_outcome).replace(/_/g, " ")}` : ""}
                {t.outcome_notes ? (
                  <div className="text-gray-600 dark:text-gray-300">{String(t.outcome_notes)}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {lead.stage === "do_not_contact" ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          This lead is flagged do not contact and cannot be emailed.
        </p>
      ) : lead.stage === "interested" || lead.stage === "examples_sent" ? (
        <div className="mb-6">
          <Label>Email</Label>
          {!lead.email && (
            <p className="mb-2 text-sm text-gray-500">
              No email on file yet. Look one up (e.g. via the listed website) and add it below to unlock
              sending.
            </p>
          )}
          <div className="flex gap-3">
            <input
              type="email"
              className="h-11 flex-1 rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@business.com"
            />
            <Button
              variant="outline"
              onClick={handleSaveEmail}
              disabled={isSavingEmail || !emailInput.trim() || emailInput.trim() === lead.email}
            >
              {isSavingEmail ? "Saving..." : lead.email ? "Update email" : "Save email"}
            </Button>
          </div>

          {lead.email && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Label>Subject</Label>
              <input
                className="mb-3 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Label>Body</Label>
              <TextArea rows={8} value={emailBody} onChange={setEmailBody} />
              <p className="mt-2 text-xs text-gray-400">
                A mailing address and opt-out line are appended automatically before sending. Not shown
                here, not editable.
              </p>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? "Sending..." : `Send to ${lead.email}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Log an &quot;Interested&quot; call to unlock the examples email.
        </p>
      )}

      {lead.stage !== "do_not_contact" && (!lead.email || !lead.website_url) && (
        <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button variant="outline" onClick={handleInvestigate} disabled={isInvestigating}>
            {isInvestigating ? "Investigating..." : "Investigate (find website/email)"}
          </Button>
          {investigateResult && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{investigateResult}</p>
          )}
        </div>
      )}

      <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Log a call or text</Label>
        <div className="flex gap-3">
          <div className="w-32">
            <Select
              options={[
                { value: "call", label: "Call" },
                { value: "text", label: "Text" },
              ]}
              defaultValue={callChannel}
              onChange={(v) => setCallChannel(v as "call" | "text")}
            />
          </div>
          {callChannel === "call" && (
            <div className="w-52">
              <Select options={CALL_OUTCOME_OPTIONS} defaultValue={callOutcome} onChange={setCallOutcome} />
            </div>
          )}
          <div className="flex-1">
            <TextArea rows={2} value={callNotes} onChange={setCallNotes} placeholder="Notes" />
          </div>
        </div>
        {callChannel === "call" && callOutcome === "callback" && (
          <div className="mt-3 flex gap-3">
            <input
              type="datetime-local"
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={callbackAt}
              onChange={(e) => setCallbackAt(e.target.value)}
            />
            <input
              className="h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={callbackNote}
              onChange={(e) => setCallbackNote(e.target.value)}
              placeholder="Callback note (optional)"
            />
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={handleLogCall} disabled={isLogging}>
            {isLogging ? "Logging..." : "Log"}
          </Button>
        </div>
      </div>

      {lead.stage !== "do_not_contact" && lead.stage !== "won" && lead.stage !== "lost" && (
        <div className="mb-6 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Label>Reschedule follow-up</Label>
          <div className="flex gap-3">
            <input
              type="datetime-local"
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
            />
            <input
              className="h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={rescheduleNote}
              onChange={(e) => setRescheduleNote(e.target.value)}
              placeholder="Note (optional)"
            />
            <Button variant="outline" onClick={handleReschedule} disabled={isRescheduling || !rescheduleAt}>
              {isRescheduling ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Update stage</Label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Select options={STAGE_OVERRIDE_OPTIONS} onChange={setStatusChoice} />
          </div>
          <Button variant="outline" onClick={handleStageUpdate} disabled={isUpdatingStatus || !statusChoice}>
            {isUpdatingStatus ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
