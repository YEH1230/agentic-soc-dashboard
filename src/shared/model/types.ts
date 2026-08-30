export type DetectionStatus = "completed" | "no_data" | "partial";
export type Classification =
  | "malicious_bot"
  | "benign_bot"
  | "human"
  | "undetermined";
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface TimeWindow {
  start: string;
  end: string;
}

export interface Evidence {
  type: string;
  value: string;
}

export interface Enrichment {
  country: string | null;
  country_code: string | null;
  asn: string | null;
  as_org: string | null;
  as_domain: string | null;
}

export interface Assessment {
  ip: string;
  classification: Classification;
  threat_type: string;
  severity: Severity;
  confidence: number;
  rationale: string;
  evidence: Evidence[];
  enrichment: Enrichment;
  investigation_required: boolean;
  requested_checks: string[];
}

export interface Detection {
  run_id: string;
  source_agent: string;
  created_at: string;
  window: TimeWindow;
  status: DetectionStatus;
  summary: string;
  observed_ip_count: number;
  assessments: Assessment[];
}

export interface InvestigationRequest {
  request_id: string;
  detection_run_id: string;
  source_agent: string;
  created_at: string;
  window: TimeWindow;
  target: { type: "ip"; value: string };
  assessment: Pick<
    Assessment,
    "classification" | "threat_type" | "severity" | "confidence" | "rationale"
  >;
  evidence: Evidence[];
  enrichment: Enrichment;
  requested_checks: string[];
}

export interface AgentTraceEvent {
  sequence: number;
  timestamp: string;
  event:
    | "agent_started"
    | "tools_available"
    | "model_turn"
    | "tool_executed"
    | "submission_rejected"
    | "protocol_recovery"
    | "agent_completed"
    | "agent_failed";
  details: Record<string, unknown>;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface AgentOutput {
  detection: Detection;
  investigation_requests: InvestigationRequest[];
  agent_trace: AgentTraceEvent[];
  usage: Usage;
  model: string;
}

export interface RunSummary {
  run_id: string;
  window: TimeWindow;
  created_at: string;
  status: DetectionStatus;
  observed_ip_count: number;
  malicious_count: number;
  undetermined_count: number;
  investigation_count: number;
  latency_seconds: number;
  usage: Usage;
  model: string;
}

export type DetectionRow = Assessment & {
  run_id: string;
  window_end: string;
};

export interface ResultServiceStatus {
  status: "ok" | "degraded";
  watcher: "active";
  output_directory: string;
  parsed_output_count: number;
  ignored_temporary_file_count: number;
  parse_errors: Array<{ file_name: string; error: string }>;
  import_errors: Array<{ run_id: string; tool: string; error: string }>;
  last_updated_at: string | null;
}

export type TimezoneMode = "KST" | "UTC";
