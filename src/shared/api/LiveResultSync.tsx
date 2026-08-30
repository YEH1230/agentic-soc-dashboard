import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runtimeConfig } from "../config/runtime";

export function LiveResultSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (runtimeConfig.useMockData) return;

    const events = new EventSource(`${runtimeConfig.apiBase}/events`, { withCredentials: false });
    const refresh = () => {
      void queryClient.invalidateQueries();
    };

    events.addEventListener("output-created", refresh);
    events.addEventListener("output-removed", refresh);
    events.addEventListener("output-invalid", refresh);

    return () => {
      events.removeEventListener("output-created", refresh);
      events.removeEventListener("output-removed", refresh);
      events.removeEventListener("output-invalid", refresh);
      events.close();
    };
  }, [queryClient]);

  return null;
}
