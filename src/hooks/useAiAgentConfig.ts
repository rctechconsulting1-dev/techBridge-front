import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AiAgentConfig, GetConfigResponse } from "@/types/aiAgent";

export function useAiAgentConfig() {
  const [config, setConfig]   = useState<AiAgentConfig>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiClient.getAiAgentConfig()) as GetConfigResponse;
      setConfig(data.config ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: Record<string, unknown>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const data = (await apiClient.updateAiAgentConfig(patch)) as GetConfigResponse;
        setConfig(data.config ?? {});
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save config.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { config, loading, saving, error, save, reload: load };
}
