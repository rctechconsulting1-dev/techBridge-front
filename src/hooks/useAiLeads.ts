import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AiLead, AiLeadStatus, GetLeadsResponse } from "@/types/aiAgent";

interface UseAiLeadsOptions {
  status?: AiLeadStatus;
  limit?: number;
}

export function useAiLeads(options: UseAiLeadsOptions = {}) {
  const [leads, setLeads] = useState<AiLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAiLeads({
        status: options.status,
        limit: options.limit ?? 50,
      }) as GetLeadsResponse;
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [options.status, options.limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = useCallback(
    async (id: string, status: AiLeadStatus): Promise<boolean> => {
      try {
        await apiClient.updateAiLeadStatus(id, status);
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status } : l)),
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update lead.");
        return false;
      }
    },
    [],
  );

  return { leads, total, loading, error, reload: load, updateStatus };
}
