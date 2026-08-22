"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { apiClient } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth-context";

const SOURCE_OPTIONS = [
  { value: "google_maps", label: "Google Maps" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "craigslist", label: "Craigslist" },
  { value: "cslb", label: "CSLB" },
];

const TIER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

interface DraftLead {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  websiteUrl: string;
  licenseNumber: string;
  rating: number | null;
  reviewCount: number | null;
  notes: string;
}

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function LeadCaptureModal({ isOpen, onClose, onSaved }: LeadCaptureModalProps) {
  const [source, setSource] = useState("google_maps");
  const [tier, setTier] = useState("small");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [rawText, setRawText] = useState("");
  const [drafts, setDrafts] = useState<DraftLead[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setRawText("");
    setDrafts([]);
    setError(null);
  };

  const handleParse = async () => {
    setIsParsing(true);
    setError(null);
    try {
      const token = getStoredAuthToken();
      const response = await fetch("/api/leads/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ source, rawText }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to parse text");
      }
      setDrafts(data.leads as DraftLead[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse text");
    } finally {
      setIsParsing(false);
    }
  };

  const updateDraft = (index: number, patch: Partial<DraftLead>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (drafts.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.createOutreachLeads(
        drafts.map((d) => ({
          businessName: d.businessName,
          contactName: d.contactName || undefined,
          email: d.email || undefined,
          phone: d.phone || undefined,
          websiteUrl: d.websiteUrl || undefined,
          licenseNumber: d.licenseNumber || undefined,
          source,
          trade: trade || undefined,
          city: city || undefined,
          tier,
          rating: d.rating ?? undefined,
          reviewCount: d.reviewCount ?? undefined,
          notes: d.notes || undefined,
          rawSourceText: rawText,
        })),
      );
      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save leads");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Capture leads</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Source</Label>
          <Select options={SOURCE_OPTIONS} defaultValue={source} onChange={setSource} />
        </div>
        <div>
          <Label>Tier</Label>
          <Select options={TIER_OPTIONS} defaultValue={tier} onChange={setTier} />
        </div>
        <div>
          <Label>Trade</Label>
          <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Electrical" />
        </div>
      </div>

      <div className="mt-4">
        <Label>City</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Los Angeles" />
      </div>

      <div className="mt-4">
        <Label>Pasted text</Label>
        <TextArea rows={8} value={rawText} onChange={setRawText} placeholder="Paste the copied listing(s) here" />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleParse} disabled={isParsing || !rawText.trim()}>
          {isParsing ? "Parsing..." : "Parse"}
        </Button>
      </div>

      {drafts.length > 0 && (
        <div className="mt-6 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2 pr-2">Business</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft, index) => {
                // In-batch duplicate flag: Google Maps result pages can list the
                // same business twice in one paste. Compares against every other
                // row's businessName (case/whitespace-insensitive), not just
                // adjacent rows.
                const isDuplicate = drafts.some(
                  (other, otherIndex) =>
                    otherIndex !== index &&
                    other.businessName.trim().toLowerCase() === draft.businessName.trim().toLowerCase() &&
                    draft.businessName.trim() !== "",
                );
                return (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      isDuplicate ? "bg-yellow-50 dark:bg-yellow-500/10" : ""
                    }`}
                  >
                    <td className="py-1 pr-2">
                      <Input
                        value={draft.businessName}
                        onChange={(e) => updateDraft(index, { businessName: e.target.value })}
                      />
                      {isDuplicate && (
                        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-500">
                          Looks like a duplicate of another row below — remove one.
                        </p>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <Input value={draft.email} onChange={(e) => updateDraft(index, { email: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input value={draft.phone} onChange={(e) => updateDraft(index, { phone: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Button size="sm" variant="outline" onClick={() => removeDraft(index)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || drafts.length === 0}>
          {isSaving ? "Saving..." : `Save ${drafts.length} lead${drafts.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Modal>
  );
}
