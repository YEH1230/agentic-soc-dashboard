import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { LiveResultSync } from "../shared/api/LiveResultSync";
import { runtimeConfig } from "../shared/config/runtime";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchInterval: runtimeConfig.useMockData ? false : 10_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveResultSync />
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}
