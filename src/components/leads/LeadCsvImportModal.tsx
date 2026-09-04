"use client";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { parseDelimited } from "@/lib/csv/parse-delimited";

const MAX_ROWS = 500;

const TIER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
];

type FieldKey = "businessName" | "phone" | "websiteUrl" | "rating" | "reviewCount" | "city";

const FIELD_LABELS: Record<FieldKey, string> = {
  businessName: "Business name (required)",
  phone: "Phone",
  websiteUrl: "Website",
  rating: "Rating",
  reviewCount: "Review count",
  city: "City",
};

const GUESSES: Record<FieldKey, string[]> = {
  businessName: ["name", "business", "title"],
  phone: ["phone", "telephone"],
  websiteUrl: ["website", "site", "url", "domain"],
  rating: ["rating", "stars", "score"],
  reviewCount: ["reviews", "review_count", "review count", "ratings", "user_ratings"],
  city: ["city", "town"],
};

function guessMapping(headers: string[]): Record<FieldKey, string> {
  const lower = headers.map((h) => h.toLowerCase());
  const out = {} as Record<FieldKey, string>;
  (Object.keys(GUESSES) as FieldKey[]).forEach((field) => {
    const hit = lower.findIndex((h) => GUESSES[field].some((g) => h.includes(g)));
    out[field] = hit >= 0 ? headers[hit] : "";
  });
  return out;
}

interface DraftRow {
  businessName: string;
  phone: string;
  websiteUrl: string;
  rating: number | null;
  reviewCount: number | null;
  city: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function LeadCsvImportModal({ isOpen, onClose, onSaved }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>);
  const [tier, setTier] = useState("small");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setHeaders([]);
    setRawRows([]);
    setMapping({} as Record<FieldKey, string>);
    setDrafts([]);
    setError(null);
    setNotice(null);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setDrafts([]);
    try {
      const text = await file.text();
      const parsed = parseDelimited(text);
      if (parsed.rows.length === 0) {
        setError("That CSV has a header row but no data rows.");
        return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        setError(`That CSV has ${parsed.rows.length} rows. Split it into files of ${MAX_ROWS} or fewer.`);
        return;
      }
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(guessMapping(parsed.headers));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const buildDrafts = () => {
    if (!mapping.businessName) {
      setError("Map the Business name column before continuing.");
      return;
    }
    const idx = (h: string) => headers.indexOf(h);
    const toNum = (v: string | undefined) => {
      if (!v) return null;
      const n = Number(v.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : null;
    };
    const next: DraftRow[] = rawRows
      .map((r) => ({
        businessName: (mapping.businessName ? r[idx(mapping.businessName)] : "")?.trim() || "",
        phone: (mapping.phone ? r[idx(mapping.phone)] : "")?.trim() || "",
        websiteUrl: (mapping.websiteUrl ? r[idx(mapping.websiteUrl)] : "")?.trim() || "",
        rating: mapping.rating ? toNum(r[idx(mapping.rating)]) : null,
        reviewCount: mapping.reviewCount ? toNum(r[idx(mapping.reviewCount)]) : null,
        city: (mapping.city ? r[idx(mapping.city)] : "")?.trim() || "",
      }))
      .filter((d) => d.businessName !== "");
    if (next.length === 0) {
      setError("No rows had a business name after mapping.");
      return;
    }
    setError(null);
    setDrafts(next);
  };

  const dupNames = useMemo(() => {
    const seen = new Map<string, number>();
    drafts.forEach((d) => {
      const k = d.businessName.trim().toLowerCase();
      seen.set(k, (seen.get(k) || 0) + 1);
    });
    return seen;
  }, [drafts]);

  const removeDraft = (i: number) => setDrafts((prev) => prev.filter((_, x) => x !== i));

  const handleSave = async () => {
    if (drafts.length === 0) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiClient.createOutreachLeads(
        drafts.map((d) => ({
          businessName: d.businessName,
          phone: d.phone || undefined,
          websiteUrl: d.websiteUrl || undefined,
          source: "csv_import",
          trade: trade || undefined,
          city: d.city || city || undefined,
          tier,
          rating: d.rating ?? undefined,
          reviewCount: d.reviewCount ?? undefined,
        })),
      );
      type CreatedLead = { duplicateWarning?: { matchedOn?: string } | null };
      const created = Array.isArray((response as { created?: CreatedLead[] } | null)?.created)
        ? (response as { created: CreatedLead[] }).created
        : [];
      const skipped = created.filter(
        (c) => c?.duplicateWarning?.matchedOn === "email" || c?.duplicateWarning?.matchedOn === "license_number",
      ).length;
      onSaved();
      if (skipped > 0) {
        setNotice(`${created.length - skipped} imported, ${skipped} already tracked (skipped).`);
      } else {
        reset();
        onClose();
      }
    } catch (e) {
      setError(getErrorMessage(e, "Failed to import leads"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} className="max-w-3xl p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Import CSV</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Tier</Label>
          <Select options={TIER_OPTIONS} defaultValue={tier} onChange={setTier} />
        </div>
        <div>
          <Label>Trade</Label>
          <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Plumbing" />
        </div>
        <div>
          <Label>City (fallback)</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="used when a row has none" />
        </div>
      </div>

      <div className="mt-4">
        <Label>CSV file</Label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm text-gray-600 dark:text-gray-300"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notice && (
        <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-500">
          {notice}
        </p>
      )}

      {headers.length > 0 && drafts.length === 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Match your columns</p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field) => (
              <div key={field}>
                <Label>{FIELD_LABELS[field]}</Label>
                <Select
                  options={[{ value: "", label: "(none)" }, ...headers.map((h) => ({ value: h, label: h }))]}
                  defaultValue={mapping[field] || ""}
                  onChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={buildDrafts}>Preview {rawRows.length} rows</Button>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-5 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="py-2 pr-2">Business</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2">Website</th>
                <th className="py-2 pr-2">Reviews</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => {
                const isDup = (dupNames.get(d.businessName.trim().toLowerCase()) || 0) > 1;
                return (
                  <tr key={i} className={`border-b border-gray-100 dark:border-gray-800 ${isDup ? "bg-yellow-50 dark:bg-yellow-500/10" : ""}`}>
                    <td className="py-1 pr-2">
                      {d.businessName}
                      {isDup && <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-500">dup in file</span>}
                    </td>
                    <td className="py-1 pr-2">{d.phone || "-"}</td>
                    <td className="py-1 pr-2">{d.websiteUrl ? "yes" : "-"}</td>
                    <td className="py-1 pr-2">{d.reviewCount ?? "-"}</td>
                    <td className="py-1 pr-2">
                      <Button size="sm" variant="outline" onClick={() => removeDraft(i)}>Remove</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
        {drafts.length > 0 && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Importing..." : `Import ${drafts.length}`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
