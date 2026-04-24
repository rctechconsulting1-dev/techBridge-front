"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  getIntakeSections,
  getBusinessTypeLabel,
  type BusinessType,
  type IntakeQuestion,
  type IntakeSection,
} from "@/lib/intake-questions";

// ─── Token verification hook ──────────────────────────────────────────────────

interface TokenPayload {
  email: string;
  tenantId: number;
  businessType?: BusinessType;
  websiteId?: number;
  tenantName?: string;
}

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

    // Verify the token by calling the verify endpoint
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
      .then((data: TokenPayload) => {
        setPayload(data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return { token, payload, error, loading };
}

// ─── File upload with S3 ──────────────────────────────────────────────────────

interface UploadedFile {
  questionId: string;
  url: string;
  filename: string;
  category: string;
}

function useIntakeFileUpload(tenantId: number | undefined, token: string | null) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (
      file: File,
      questionId: string,
      category: string,
    ): Promise<UploadedFile | null> => {
      if (!tenantId || !token) return null;
      setUploading(true);
      setUploadError(null);

      try {
        // Request a pre-signed URL from the intake upload API (token-authed, no JWT needed)
        const presignRes = await fetch("/api/intake/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            category,
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to get upload URL");
        }

        const { url, publicUrl } = (await presignRes.json()) as {
          url: string;
          key: string;
          publicUrl: string;
        };

        // Upload directly to S3 using the pre-signed URL
        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("File upload failed. Please try again.");
        }

        return { questionId, url: publicUrl, filename: file.name, category };
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload failed",
        );
        return null;
      } finally {
        setUploading(false);
      }
    },
    [tenantId, token],
  );

  return { uploadFile, uploading, uploadError };
}

// ─── Question renderers ───────────────────────────────────────────────────────

type Answers = Record<string, string | string[] | boolean | number | null>;

interface QuestionFieldProps {
  question: IntakeQuestion;
  value: string | string[] | boolean | number | null;
  onChange: (questionId: string, value: string | string[] | boolean) => void;
  onFileUpload: (questionId: string, files: FileList) => void;
  uploadedFiles: UploadedFile[];
  uploading: boolean;
}

function QuestionField({
  question,
  value,
  onChange,
  onFileUpload,
  uploadedFiles,
  uploading,
}: QuestionFieldProps) {
  const qFiles = uploadedFiles.filter((f) => f.questionId === question.id);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={question.id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {question.label}
        {question.required && <span className="text-[#C41E3A] ml-1">*</span>}
      </label>

      {question.hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {question.hint}
        </p>
      )}

      {/* Text */}
      {question.type === "text" && (
        <input
          id={question.id}
          type="text"
          placeholder={question.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
        />
      )}

      {/* Number */}
      {question.type === "number" && (
        <input
          id={question.id}
          type="number"
          placeholder={question.placeholder}
          value={(value as number) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
        />
      )}

      {/* Textarea */}
      {question.type === "textarea" && (
        <textarea
          id={question.id}
          rows={4}
          placeholder={question.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
        />
      )}

      {/* Select */}
      {question.type === "select" && (
        <select
          id={question.id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-[#CD7F32] focus:outline-none focus:ring-1 focus:ring-[#CD7F32] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Select an option...</option>
          {question.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Multiselect (checkboxes) */}
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

      {/* Boolean */}
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

      {/* Single file */}
      {question.type === "file" && (
        <div>
          <input
            id={question.id}
            type="file"
            accept={question.accept}
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.length) onFileUpload(question.id, e.target.files);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#CD7F32]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#CD7F32] hover:file:bg-[#CD7F32]/20 dark:text-gray-400"
          />
          {qFiles.map((f) => (
            <p key={f.url} className="mt-1 text-xs text-green-600 dark:text-green-400">
              ✓ {f.filename} uploaded
            </p>
          ))}
        </div>
      )}

      {/* Multiple files */}
      {question.type === "multifile" && (
        <div>
          <input
            id={question.id}
            type="file"
            accept={question.accept}
            multiple
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.length) onFileUpload(question.id, e.target.files);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#CD7F32]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#CD7F32] hover:file:bg-[#CD7F32]/20 dark:text-gray-400"
          />
          {question.maxFiles && (
            <p className="mt-1 text-xs text-gray-400">
              Up to {question.maxFiles} files
            </p>
          )}
          {qFiles.length > 0 && (
            <ul className="mt-2 space-y-1">
              {qFiles.map((f) => (
                <li key={f.url} className="text-xs text-green-600 dark:text-green-400">
                  ✓ {f.filename}
                </li>
              ))}
            </ul>
          )}
          {uploading && (
            <p className="mt-1 text-xs text-[#CD7F32]">Uploading...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

interface SectionProps {
  section: IntakeSection;
  answers: Answers;
  onChange: (questionId: string, value: string | string[] | boolean) => void;
  onFileUpload: (questionId: string, files: FileList) => void;
  uploadedFiles: UploadedFile[];
  uploading: boolean;
}

function Section({
  section,
  answers,
  onChange,
  onFileUpload,
  uploadedFiles,
  uploading,
}: SectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] ?? null}
            onChange={onChange}
            onFileUpload={onFileUpload}
            uploadedFiles={uploadedFiles}
            uploading={uploading}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main intake form ─────────────────────────────────────────────────────────

function IntakeFormInner() {
  const { token, payload, error: tokenError, loading } = useIntakeToken();
  const [answers, setAnswers] = useState<Answers>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { uploadFile, uploading, uploadError } = useIntakeFileUpload(
    payload?.tenantId,
    token,
  );

  const businessType = payload?.businessType ?? "universal";
  const sections = useMemo(
    () => (payload ? getIntakeSections(businessType) : []),
    [businessType, payload],
  );

  const handleChange = useCallback(
    (questionId: string, value: string | string[] | boolean) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    [],
  );

  const handleFileUpload = useCallback(
    async (questionId: string, files: FileList) => {
      // Find the question to get its upload category
      const question = sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === questionId);
      const category = question?.uploadCategory ?? "general";

      const results = await Promise.all(
        Array.from(files).map((file) => uploadFile(file, questionId, category)),
      );

      const successful = results.filter(Boolean) as UploadedFile[];
      if (successful.length > 0) {
        setUploadedFiles((prev) => [...prev, ...successful]);
      }
    },
    [sections, uploadFile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validate required fields
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
      setSubmitError(
        `Please fill in the required fields: ${missing.map((q) => q.label).join(", ")}`,
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers, files: uploadedFiles }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#CD7F32]" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verifying your link...
          </p>
        </div>
      </div>
    );
  }

  // ─── Token error ──────────────────────────────────────────────────────────
  if (tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-[#C41E3A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Link Invalid or Expired
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tokenError}
          </p>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Please contact your account manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="max-w-md rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm dark:border-green-900 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Thank You!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your questionnaire has been submitted successfully. We&apos;ll start
            building your website and reach out if we have any questions.
          </p>
        </div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
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
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Website Questionnaire
          </h1>
          {payload?.tenantName ? (
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              This questionnaire is for <span className="text-[#C41E3A]">{payload.tenantName}</span>.
            </p>
          ) : null}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {payload?.businessType && (
              <span className="mr-2 inline-block rounded-full bg-[#CD7F32]/10 px-2.5 py-0.5 text-xs font-medium text-[#CD7F32]">
                {getBusinessTypeLabel(payload.businessType ?? "universal")}
              </span>
            )}
            Help us build the right website for your business. This takes about
            10–15 minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map((section) => (
            <Section
              key={section.id}
              section={section}
              answers={answers}
              onChange={handleChange}
              onFileUpload={handleFileUpload}
              uploadedFiles={uploadedFiles}
              uploading={uploading}
            />
          ))}

          {(submitError || uploadError) && (
            <div className="rounded-lg border border-[#C41E3A]/20 bg-[#C41E3A]/5 p-4 text-sm text-[#C41E3A] dark:border-[#C41E3A]/30 dark:bg-[#C41E3A]/10">
              {submitError || uploadError}
            </div>
          )}

          <div className="flex justify-end pb-12">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="rounded-lg bg-[#CD7F32] px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#B8721D] focus:outline-none focus:ring-2 focus:ring-[#CD7F32] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-950"
            >
              {submitting ? "Submitting..." : "Submit Questionnaire"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ─── Page export with Suspense (required for useSearchParams) ─────────────────

export default function IntakePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#CD7F32]" />
        </div>
      }
    >
      <IntakeFormInner />
    </Suspense>
  );
}
