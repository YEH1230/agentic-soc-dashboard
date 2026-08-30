import { z } from "zod";
import { allAssessments, investigationQueue, latestOutput, runHistory } from "../../mocks/agentOutput";
import { assertSafeLiveApiTarget, runtimeConfig } from "../config/runtime";
import type { AgentOutput, DetectionRow, InvestigationRequest, ResultServiceStatus, RunSummary } from "../model/types";

const evidenceSchema = z.object({
  type: z.string(),
  value: z.string(),
});

const enrichmentSchema = z.object({
  country: z.string().nullable(),
  country_code: z.string().nullable(),
  asn: z.string().nullable(),
  as_org: z.string().nullable(),
  as_domain: z.string().nullable(),
});

const assessmentSchema = z.object({
  ip: z.string(),
  classification: z.enum(["malicious_bot", "benign_bot", "human", "undetermined"]),
  threat_type: z.string(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  evidence: z.array(evidenceSchema),
  enrichment: enrichmentSchema,
  investigation_required: z.boolean(),
  requested_checks: z.array(z.string()),
});

const timeWindowSchema = z.object({ start: z.string(), end: z.string() });
const usageSchema = z.object({ input_tokens: z.number(), output_tokens: z.number() });

export const outputBoundary = z.object({
  detection: z.object({
    run_id: z.string(),
    source_agent: z.string(),
    created_at: z.string(),
    window: timeWindowSchema,
    status: z.enum(["completed", "no_data", "partial"]),
    summary: z.string(),
    observed_ip_count: z.number(),
    assessments: z.array(assessmentSchema),
  }),
  investigation_requests: z.array(z.object({
    request_id: z.string(),
    detection_run_id: z.string(),
    source_agent: z.string(),
    created_at: z.string(),
    window: timeWindowSchema,
    target: z.object({ type: z.literal("ip"), value: z.string() }),
    assessment: assessmentSchema.pick({
      classification: true,
      threat_type: true,
      severity: true,
      confidence: true,
      rationale: true,
    }),
    evidence: z.array(evidenceSchema),
    enrichment: enrichmentSchema,
    requested_checks: z.array(z.string()),
  })),
  agent_trace: z.array(z.object({
    sequence: z.number(),
    timestamp: z.string(),
    event: z.enum([
      "agent_started",
      "tools_available",
      "model_turn",
      "tool_executed",
      "submission_rejected",
      "protocol_recovery",
      "agent_completed",
      "agent_failed",
    ]),
    details: z.record(z.string(), z.unknown()),
  })),
  usage: usageSchema,
  model: z.string(),
});

const runSummaryBoundary = z.array(z.object({
  run_id: z.string(),
  window: timeWindowSchema,
  created_at: z.string(),
  status: z.enum(["completed", "no_data", "partial"]),
  observed_ip_count: z.number(),
  malicious_count: z.number(),
  undetermined_count: z.number(),
  investigation_count: z.number(),
  latency_seconds: z.number(),
  usage: usageSchema,
  model: z.string(),
}));

const detectionRowsBoundary = z.array(assessmentSchema.extend({
  run_id: z.string(),
  window_end: z.string(),
}));

const investigationBoundary = outputBoundary.shape.investigation_requests;

const serviceStatusBoundary = z.object({
  status: z.enum(["ok", "degraded"]),
  watcher: z.literal("active"),
  output_directory: z.string(),
  parsed_output_count: z.number(),
  ignored_temporary_file_count: z.number(),
  parse_errors: z.array(z.object({ file_name: z.string(), error: z.string() })),
  import_errors: z.array(z.object({ run_id: z.string(), tool: z.string(), error: z.string() })),
  last_updated_at: z.string().nullable(),
});

async function request<T>(path: string): Promise<T> {
  assertSafeLiveApiTarget();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${runtimeConfig.apiBase}${path}`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API 요청 실패 (${response.status})`);
    return response.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestNullable<T>(path: string): Promise<T | null> {
  assertSafeLiveApiTarget();
  const response = await fetch(`${runtimeConfig.apiBase}${path}`, {
    headers: { Accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API 요청 실패 (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getLatestOutput(): Promise<AgentOutput | null> {
  if (runtimeConfig.useMockData) return Promise.resolve(latestOutput);
  const payload = await requestNullable<unknown>("/outputs/latest");
  if (payload === null) return null;
  return outputBoundary.parse(payload) as AgentOutput;
}

export async function getRunHistory(): Promise<RunSummary[]> {
  if (runtimeConfig.useMockData) return Promise.resolve(runHistory);
  const payload = await request<unknown>("/runs");
  return runSummaryBoundary.parse(payload) as RunSummary[];
}

export async function getRunOutput(runId: string): Promise<AgentOutput> {
  if (runtimeConfig.useMockData) {
    if (runId === latestOutput.detection.run_id) return latestOutput;
    throw new Error("샘플 모드에는 이 실행의 상세 JSON이 없습니다.");
  }
  const payload = await request<unknown>(`/outputs/${encodeURIComponent(runId)}`);
  return outputBoundary.parse(payload) as AgentOutput;
}

export async function getAssessmentHistory(): Promise<DetectionRow[]> {
  if (runtimeConfig.useMockData) return allAssessments;
  const payload = await request<unknown>("/assessments");
  return detectionRowsBoundary.parse(payload) as DetectionRow[];
}

export async function getInvestigationQueue(): Promise<InvestigationRequest[]> {
  if (runtimeConfig.useMockData) return investigationQueue;
  const payload = await request<unknown>("/investigations");
  return investigationBoundary.parse(payload) as InvestigationRequest[];
}

export async function getServiceStatus(): Promise<ResultServiceStatus> {
  if (runtimeConfig.useMockData) {
    return {
      status: "ok",
      watcher: "active",
      output_directory: "fixture://src/mocks/agentOutput.ts",
      parsed_output_count: runHistory.length,
      ignored_temporary_file_count: 0,
      parse_errors: [],
      import_errors: [],
      last_updated_at: latestOutput.detection.created_at,
    };
  }
  const payload = await request<unknown>("/status");
  return serviceStatusBoundary.parse(payload) as ResultServiceStatus;
}

export const dataMode = runtimeConfig.dataMode;
