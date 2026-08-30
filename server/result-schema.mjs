import { z } from "zod";

const utcTimestamp = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)) && /(?:Z|\+00:00)$/.test(value),
  "UTC ISO-8601 timestamp가 아닙니다.",
);

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
  ip: z.string().min(1),
  classification: z.enum(["malicious_bot", "benign_bot", "human", "undetermined"]),
  threat_type: z.string().min(1),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  evidence: z.array(evidenceSchema),
  enrichment: enrichmentSchema,
  investigation_required: z.boolean(),
  requested_checks: z.array(z.string()),
});

const windowSchema = z.object({ start: utcTimestamp, end: utcTimestamp });
const usageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
});

const investigationSchema = z.object({
  request_id: z.string(),
  detection_run_id: z.string(),
  source_agent: z.string(),
  created_at: utcTimestamp,
  window: windowSchema,
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
});

const traceEventSchema = z.object({
  sequence: z.number().int().positive(),
  timestamp: utcTimestamp,
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
});

export const agentOutputSchema = z.object({
  detection: z.object({
    run_id: z.string(),
    source_agent: z.string(),
    created_at: utcTimestamp,
    window: windowSchema,
    status: z.enum(["completed", "no_data", "partial"]),
    summary: z.string(),
    observed_ip_count: z.number().int().nonnegative(),
    assessments: z.array(assessmentSchema),
  }),
  investigation_requests: z.array(investigationSchema),
  agent_trace: z.array(traceEventSchema),
  usage: usageSchema,
  model: z.string(),
}).superRefine((output, context) => {
  const { detection } = output;
  const assessmentIps = detection.assessments.map((item) => item.ip);

  if (new Set(assessmentIps).size !== assessmentIps.length) {
    context.addIssue({ code: "custom", path: ["detection", "assessments"], message: "assessment IP가 중복됩니다." });
  }

  if (detection.status === "completed" && detection.observed_ip_count !== detection.assessments.length) {
    context.addIssue({ code: "custom", path: ["detection", "observed_ip_count"], message: "completed 실행의 관측 IP 수와 assessment 수가 다릅니다." });
  }

  if (["no_data", "partial"].includes(detection.status)) {
    if (detection.observed_ip_count !== 0 || detection.assessments.length !== 0 || output.investigation_requests.length !== 0) {
      context.addIssue({ code: "custom", path: ["detection", "status"], message: `${detection.status} 실행에는 판정과 조사 요청이 없어야 합니다.` });
    }
  }

  if (detection.status === "partial" && output.agent_trace.at(-1)?.event !== "agent_failed") {
    context.addIssue({ code: "custom", path: ["agent_trace"], message: "partial 실행의 마지막 이벤트는 agent_failed여야 합니다." });
  }

  const requiredIps = new Set(detection.assessments.filter((item) => item.investigation_required).map((item) => item.ip));
  const requestIps = new Set(output.investigation_requests.map((item) => item.target.value));

  if (requiredIps.size !== requestIps.size || [...requiredIps].some((ip) => !requestIps.has(ip))) {
    context.addIssue({ code: "custom", path: ["investigation_requests"], message: "조사 요청이 assessment의 investigation_required 부분집합과 일치하지 않습니다." });
  }

  for (const request of output.investigation_requests) {
    if (request.detection_run_id !== detection.run_id) {
      context.addIssue({ code: "custom", path: ["investigation_requests"], message: "detection_run_id가 detection.run_id와 다릅니다." });
    }
  }

  const turns = output.agent_trace.filter((event) => event.event === "model_turn");
  const tokenSum = turns.reduce((sum, event) => {
    const usage = event.details.usage;
    if (!usage || typeof usage !== "object") return sum;
    const input = Number(usage.input_tokens ?? 0);
    const outputTokens = Number(usage.output_tokens ?? 0);
    return { input: sum.input + input, output: sum.output + outputTokens };
  }, { input: 0, output: 0 });

  if (turns.length > 0 && (tokenSum.input !== output.usage.input_tokens || tokenSum.output !== output.usage.output_tokens)) {
    context.addIssue({ code: "custom", path: ["usage"], message: "usage가 model_turn 토큰 합계와 다릅니다." });
  }
});

export function formatValidationError(error) {
  if (!(error instanceof z.ZodError)) return error instanceof Error ? error.message : String(error);
  return error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ");
}
