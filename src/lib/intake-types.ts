import type { BusinessType } from "@/lib/intake-questions";

export type IntakeAnswerValue = string | string[] | boolean | number | null;

export type IntakeAnswers = Record<string, IntakeAnswerValue>;

export interface IntakeFileRef {
  questionId: string;
  url: string;
  filename: string;
  category?: string;
}

export interface IntakeStoredSubmission {
  version: 1;
  source?: "submitted" | "demo";
  submittedAt: string;
  adminEditedAt?: string | null;
  adminEditedByEmail?: string | null;
  adminEditedByName?: string | null;
  tenantId: number;
  websiteId: number | null;
  email: string;
  businessType: BusinessType;
  answers: IntakeAnswers;
  files: IntakeFileRef[];
}