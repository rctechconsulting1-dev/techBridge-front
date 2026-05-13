"use client";

import React, { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSidebar } from "@/context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type RunStatus = "planned" | "approved" | "running" | "completed" | "failed" | "cancelled";
type StepStatus = "planned" | "queued" | "running" | "succeeded" | "failed" | "skipped" | "compensated" | "cancelled";

interface WorkflowStep {
  id: number;
  stepOrder: number;
  service: string;
  toolName: string;
  status: StepStatus;
  retryCount: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface WorkflowRun {
  id: number;
  businessKey: string;
  workflowType: string;
  status: RunStatus;
  objective?: Record<string, unknown> | null;
  requireApproval: boolean;
  approvalId?: number | null;
  approvedByUserId?: number | null;
  approvedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  // list-only computed fields
  totalSteps?: number;
  succeededSteps?: number;
  failedSteps?: number;
}

// ── Status badge helpers ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<RunStatus, string> = {
  planned:   "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  approved:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  running:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const STEP_DOT: Record<StepStatus, string> = {
  succeeded:   "bg-green-500",
  running:     "bg-yellow-400",
  failed:      "bg-red-500",
  planned:     "bg-gray-300 dark:bg-gray-600",
  queued:      "bg-blue-400",
  skipped:     "bg-gray-200 dark:bg-gray-700",
  compensated: "bg-orange-400",
  cancelled:   "bg-gray-200 dark:bg-gray-700",
};

function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? ""}`}>
      {status}
    </span>
  );
}

// ── Step timeline ──────────────────────────────────────────────────────────────

function StepTimeline({ steps }: { steps: WorkflowStep[] }) {
  if (steps.length === 0) {
    return <p className="py-2 text-xs text-gray-400 italic">No steps loaded.</p>;
  }
  return (
    <ol className="relative mt-3 space-y-3 border-l border-gray-200 dark:border-gray-700 pl-5">
      {steps.map((step) => (
        <li key={step.id} className="relative">
          <span className={`absolute -left-[1.2rem] mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${STEP_DOT[step.status] ?? "bg-gray-300"}`} />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {step.stepOrder}. <span className="font-mono text-xs">{step.toolName}</span>
              </p>
              <p className="text-xs text-gray-500">{step.service}{step.retryCount > 0 && <span className="ml-2 text-orange-500">↺ {step.retryCount}</span>}</p>
              {step.errorMessage && <p className="mt-0.5 text-xs text-red-500">{step.errorMessage}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              step.status === "succeeded" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : step.status === "failed"  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : step.status === "running" ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
              : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}>{step.status}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Run row ────────────────────────────────────────────────────────────────────

function RunRow({
  run,
  onApprove,
  onExecute,
  onCancel,
}: {
  run: WorkflowRun;
  onApprove: (id: number) => void;
  onExecute: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  const loadDetail = useCallback(async () => {
    if (steps.length > 0) return;
    setLoadingSteps(true);
    try {
      const data = await apiClient.get(`/api/marketing/workflows/${run.id}`);
      setSteps(data.steps ?? []);
    } catch {
      toast.error("Failed to load steps");
    } finally {
      setLoadingSteps(false);
    }
  }, [run.id, steps.length]);

  const handleExpand = () => {
    if (!expanded) loadDetail();
    setExpanded((v) => !v);
  };

  const isTerminal = run.status === "completed" || run.status === "failed" || run.status === "cancelled";
  const objectiveLabel = run.objective
    ? (run.objective as { objective?: string }).objective ?? run.workflowType
    : run.workflowType;

  const progress = run.totalSteps
    ? `${run.succeededSteps ?? 0}/${run.totalSteps} succeeded${run.failedSteps ? ` · ${run.failedSteps} failed` : ""}`
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex cursor-pointer select-none items-center justify-between gap-4 px-4 py-3" onClick={handleExpand}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
              #{run.id} — {objectiveLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {run.businessKey}
            {progress && <span className="ml-2">{progress}</span>}
            <span className="ml-2">· {new Date(run.createdAt).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Action buttons — only for non-terminal runs */}
          {!isTerminal && (
            <>
              {run.status === "planned" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(run.id); }}
                  className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  Approve
                </button>
              )}
              {(run.status === "approved" || (!run.requireApproval && run.status === "planned")) && (
                <button
                  onClick={(e) => { e.stopPropagation(); onExecute(run.id); }}
                  className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                >
                  Execute
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(run.id); }}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancel
              </button>
            </>
          )}
          <span className="text-sm text-gray-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
          {run.cancelReason && (
            <p className="mb-2 text-xs text-gray-500">
              <span className="font-medium">Cancel reason:</span> {run.cancelReason}
            </p>
          )}
          {loadingSteps ? (
            <p className="py-2 text-xs text-gray-400">Loading steps…</p>
          ) : (
            <StepTimeline steps={steps} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "approved", label: "Approved" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function WorkflowRunsPage() {
  const { selectedClient } = useSidebar();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const fetchRuns = useCallback(async () => {
    if (!selectedClient?.websiteId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiClient.get(`/api/marketing/workflows?${params}`);
      setRuns(data.workflowRuns ?? []);
    } catch {
      toast.error("Failed to load workflow runs");
    } finally {
      setLoading(false);
    }
  }, [selectedClient, statusFilter, offset]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Auto-refresh while any run is executing
  useEffect(() => {
    const hasActive = runs.some((r) => r.status === "running" || r.status === "planned" || r.status === "approved");
    if (!hasActive) return;
    const id = setInterval(fetchRuns, 10_000);
    return () => clearInterval(id);
  }, [runs, fetchRuns]);

  const handleApprove = async (runId: number) => {
    try {
      await apiClient.post(`/api/marketing/workflows/${runId}/approve`, {});
      toast.success("Workflow approved");
      fetchRuns();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to approve");
    }
  };

  const handleExecute = async (runId: number) => {
    try {
      await apiClient.post(`/api/marketing/workflows/${runId}/execute`, {});
      toast.success("Execution started — steps will update automatically");
      fetchRuns();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to execute");
    }
  };

  const handleCancel = async (runId: number) => {
    const reason = window.prompt("Cancel reason (optional):");
    if (reason === null) return;
    try {
      await apiClient.post(`/api/marketing/workflows/${runId}/cancel`, { reason });
      toast.success("Run cancelled");
      fetchRuns();
    } catch {
      toast.error("Failed to cancel run");
    }
  };

  if (!selectedClient) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Select a client to view workflow runs.
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Workflow Runs" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setOffset(0); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={fetchRuns}
          disabled={loading}
          className="ml-auto text-xs text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && runs.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">No workflow runs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              onApprove={handleApprove}
              onExecute={handleExecute}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {runs.length === LIMIT && (
        <div className="mt-6 flex justify-end gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            className="rounded px-3 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ← Prev
          </button>
          <button
            disabled={runs.length < LIMIT}
            onClick={() => setOffset((o) => o + LIMIT)}
            className="rounded px-3 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}


import React, { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSidebar } from "@/context/SidebarContext";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type RunStatus = "planned" | "approved" | "running" | "completed" | "failed" | "cancelled";
type StepStatus = "planned" | "queued" | "running" | "succeeded" | "failed" | "skipped" | "compensated" | "cancelled";

interface WorkflowStep {
  id: number;
  stepOrder: number;
  service: string;
  toolName: string;
  status: StepStatus;
  retryCount: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface WorkflowRun {
  id: number;
  businessKey: string;
  workflowType: string;
  status: RunStatus;
  objectiveJson: { objective?: string } | null;
  approvalId?: number | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
}

// ── Status badge helpers ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<RunStatus, string> = {
  planned: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  running: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

const STEP_STATUS_COLORS: Record<StepStatus, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  queued: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  running: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  succeeded: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  skipped: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  compensated: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  cancelled: "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
};

function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

function StepStatusBadge({ status }: { status: StepStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STEP_STATUS_COLORS[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

// ── Step timeline ──────────────────────────────────────────────────────────────

function StepTimeline({
  steps,
  runId,
  runStatus,
  onRetry,
}: {
  steps: WorkflowStep[];
  runId: number;
  runStatus: RunStatus;
  onRetry: (runId: number, stepId: number) => void;
}) {
  if (steps.length === 0) {
    return <p className="py-2 text-xs text-gray-400 italic">No steps found.</p>;
  }

  return (
    <ol className="relative mt-2 space-y-3 border-l border-gray-200 dark:border-gray-700 pl-4">
      {steps.map((step) => (
        <li key={step.id} className="relative">
          <span
            className={`absolute -left-[1.15rem] mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
              step.status === "succeeded"
                ? "bg-green-500"
                : step.status === "failed"
                  ? "bg-red-500"
                  : step.status === "running"
                    ? "bg-yellow-400"
                    : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {step.stepOrder}. {step.toolName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {step.service}
                {step.retryCount > 0 && (
                  <span className="ml-2 text-orange-500">× {step.retryCount} retries</span>
                )}
              </p>
              {step.errorMessage && (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{step.errorMessage}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <StepStatusBadge status={step.status} />
              {(step.status === "failed" || step.status === "skipped") &&
                runStatus !== "cancelled" &&
                runStatus !== "completed" && (
                  <button
                    onClick={() => onRetry(runId, step.id)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    Retry
                  </button>
                )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Run row ────────────────────────────────────────────────────────────────────

function RunRow({
  run,
  onCancel,
  onRetryStep,
}: {
  run: WorkflowRun;
  onCancel: (runId: number) => void;
  onRetryStep: (runId: number, stepId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const objective = run.objectiveJson?.objective ?? run.workflowType;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              #{run.id} — {objective}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {run.businessKey} · {run.steps.length} steps ·{" "}
            {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {run.status !== "cancelled" &&
            run.status !== "completed" &&
            run.status !== "failed" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(run.id);
                }}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancel
              </button>
            )}
          <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
          {run.cancelReason && (
            <p className="mb-2 text-xs text-gray-500">
              <span className="font-medium">Cancel reason:</span> {run.cancelReason}
            </p>
          )}
          <StepTimeline
            steps={run.steps}
            runId={run.id}
            runStatus={run.status}
            onRetry={onRetryStep}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "running", label: "Running" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function WorkflowRunsPage() {
  const { selectedClient } = useSidebar();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const fetchRuns = useCallback(async () => {
    if (!selectedClient?.websiteId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiClient.get(`/api/marketing/workflow-runs?${params}`);
      setRuns(data.runs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load workflow runs");
    } finally {
      setLoading(false);
    }
  }, [selectedClient, statusFilter, offset]);

  // Auto-refresh when any run is "running"
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running");
    if (!hasRunning) return;
    const id = setInterval(fetchRuns, 10_000);
    return () => clearInterval(id);
  }, [runs, fetchRuns]);

  const handleCancel = async (runId: number) => {
    const reason = window.prompt("Cancel reason (optional):");
    if (reason === null) return; // user pressed Cancel on prompt
    try {
      await apiClient.post(`/api/marketing/workflow-runs/${runId}/cancel`, { reason });
      toast.success("Run cancelled");
      fetchRuns();
    } catch {
      toast.error("Failed to cancel run");
    }
  };

  const handleRetryStep = async (runId: number, stepId: number) => {
    try {
      await apiClient.post(`/api/marketing/workflow-runs/${runId}/retry-step`, { stepId });
      toast.success("Step queued for retry");
      fetchRuns();
    } catch {
      toast.error("Failed to retry step");
    }
  };

  if (!selectedClient) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Select a client to view workflow runs.
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Workflow Runs" />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setOffset(0);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchRuns}
          disabled={loading}
          className="ml-auto text-xs text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Run list */}
      {loading && runs.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">No workflow runs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              onCancel={handleCancel}
              onRetryStep={handleRetryStep}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              className="rounded px-3 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ← Prev
            </button>
            <button
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
              className="rounded px-3 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
