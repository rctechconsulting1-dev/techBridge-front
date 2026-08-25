"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth-context";
import { buildOutreachEmail, type LeadSource, type LeadTier } from "@/lib/outreach-templates";
import type { OutreachLead } from "@/app/(admin)/(others-pages)/leads/page";

interface LeadActionsModalProps {
  lead: OutreachLead;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: "responded", label: "Responded" },
  { value: "not_interested", label: "Not interested" },
  { value: "converted", label: "Converted" },
  { value: "do_not_contact", label: "Do not contact" },
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

  const handleLogTouch = async () => {
    if (!callNotes.trim()) return;
    setIsLogging(true);
    setError(null);
    try {
      await apiClient.logOutreachTouch(lead.id, { channel: callChannel, outcomeNotes: callNotes });
      setCallNotes("");
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to log touch"));
    } finally {
      setIsLogging(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusChoice) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await apiClient.updateOutreachLead(lead.id, { status: statusChoice });
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-2xl p-6">
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">{lead.business_name}</h3>
      <p className="mb-4 text-sm text-gray-500">Status: {lead.status}</p>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {lead.status === "do_not_contact" ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          This lead is flagged do not contact and cannot be emailed.
        </p>
      ) : (
        <div className="mb-6">
          <Label>Email</Label>
          {!lead.email && (
            <p className="mb-2 text-sm text-gray-500">
              No email on file yet — look one up (e.g. via the listed website) and add it below to unlock sending.
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
                A mailing address and opt-out line are appended automatically before sending — not shown here, not editable.
              </p>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? "Sending..." : `Send to ${lead.email}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {lead.status !== "do_not_contact" && (!lead.email || !lead.website_url) && (
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
          <div className="flex-1">
            <TextArea rows={2} value={callNotes} onChange={setCallNotes} placeholder="Outcome notes" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={handleLogTouch} disabled={isLogging || !callNotes.trim()}>
            {isLogging ? "Logging..." : "Log"}
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <Label>Update status</Label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Select options={STATUS_OPTIONS} onChange={setStatusChoice} />
          </div>
          <Button variant="outline" onClick={handleStatusUpdate} disabled={isUpdatingStatus || !statusChoice}>
            {isUpdatingStatus ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
