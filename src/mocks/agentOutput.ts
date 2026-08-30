import type {
  AgentOutput,
  Assessment,
  InvestigationRequest,
  RunSummary,
} from "../shared/model/types";

const assessments: Assessment[] = [
  {
    ip: "104.23.166.50",
    classification: "malicious_bot",
    threat_type: "vulnerability_scan",
    severity: "medium",
    confidence: 0.7,
    rationale:
      "정상 브라우저 문자열이 아닌 외부 도메인의 WordPress 설치 경로가 User-Agent에 포함되어 있어 자동화된 취약점 스캔으로 판단했습니다.",
    evidence: [
      { type: "top_ua", value: "http://ogwanwan.shop/wp-admin/install.php?step=1" },
      { type: "req_total", value: "1" },
      { type: "scan_404", value: "1" },
      { type: "asn", value: "AS13335 Cloudflare, Inc." },
    ],
    enrichment: {
      country: "The Netherlands",
      country_code: "NL",
      asn: "AS13335",
      as_org: "Cloudflare, Inc.",
      as_domain: "cloudflare.com",
    },
    investigation_required: true,
    requested_checks: [
      "Cloudflare 리버스 프록시 뒤의 실제 origin IP와 X-Forwarded-For 헤더 확인",
      "동일 UA 패턴을 사용한 다른 IP와 최근 요청 교차 확인",
      "대상 서버의 /wp-admin/install.php 접근 시도와 응답 코드 확인",
    ],
  },
  {
    ip: "165.154.162.208",
    classification: "undetermined",
    threat_type: "none",
    severity: "info",
    confidence: 0.3,
    rationale:
      "관측 요청이 1건뿐이고 자동화 여부를 판정할 추가 신호가 부족해 판단을 보류했습니다.",
    evidence: [
      { type: "req_total", value: "1" },
      { type: "top_ua", value: "Mozilla/5.0" },
    ],
    enrichment: {
      country: null,
      country_code: null,
      asn: null,
      as_org: null,
      as_domain: null,
    },
    investigation_required: false,
    requested_checks: [],
  },
  {
    ip: "43.130.111.40",
    classification: "human",
    threat_type: "none",
    severity: "info",
    confidence: 0.82,
    rationale:
      "정상 브라우저 User-Agent와 일반적인 단일 페이지 접근 패턴이 확인되어 사람의 접근으로 판단했습니다.",
    evidence: [
      { type: "req_total", value: "3" },
      { type: "scan_404", value: "0" },
      { type: "top_ua", value: "Mozilla/5.0 Chrome/139.0" },
    ],
    enrichment: {
      country: null,
      country_code: null,
      asn: null,
      as_org: null,
      as_domain: null,
    },
    investigation_required: false,
    requested_checks: [],
  },
];

const investigation: InvestigationRequest = {
  request_id: "INV-20260829T151743Z-ffdc5d49",
  detection_run_id: "DET-20260829T151743Z-141de866",
  source_agent: "detection-agent",
  created_at: "2026-08-29T15:17:43.552809+00:00",
  window: {
    start: "2026-08-29T15:07:09.410606+00:00",
    end: "2026-08-29T15:17:09.410606+00:00",
  },
  target: { type: "ip", value: "104.23.166.50" },
  assessment: {
    classification: "malicious_bot",
    threat_type: "vulnerability_scan",
    severity: "medium",
    confidence: 0.7,
    rationale: assessments[0].rationale,
  },
  evidence: assessments[0].evidence,
  enrichment: assessments[0].enrichment,
  requested_checks: assessments[0].requested_checks,
};

export const latestOutput: AgentOutput = {
  detection: {
    run_id: "DET-20260829T151743Z-141de866",
    source_agent: "detection-agent",
    created_at: "2026-08-29T15:17:43.552809+00:00",
    window: {
      start: "2026-08-29T15:07:09.410606+00:00",
      end: "2026-08-29T15:17:09.410606+00:00",
    },
    status: "completed",
    summary:
      "10분 구간에서 IP 3개를 관측했습니다. 2개는 정상 또는 판단보류이며, 104.23.166.50은 WordPress 취약점 스캔 시도로 판정해 조사 대기열로 넘겼습니다.",
    observed_ip_count: 3,
    assessments,
  },
  investigation_requests: [investigation],
  agent_trace: [
    {
      sequence: 1,
      timestamp: "2026-08-29T15:17:10.199+00:00",
      event: "agent_started",
      details: {
        model: "claude-sonnet-5",
        window: {
          start: "2026-08-29T15:07:09.410606+00:00",
          end: "2026-08-29T15:17:09.410606+00:00",
        },
      },
    },
    {
      sequence: 2,
      timestamp: "2026-08-29T15:17:10.200+00:00",
      event: "tools_available",
      details: {
        names: ["resolve_ip_geo", "aggregate_logs", "submit_detection_result"],
        import_errors: {},
      },
    },
    {
      sequence: 3,
      timestamp: "2026-08-29T15:17:11.977+00:00",
      event: "model_turn",
      details: {
        step: 1,
        stop_reason: "tool_use",
        tool_calls: ["aggregate_logs"],
        usage: { input_tokens: 4541, output_tokens: 108 },
      },
    },
    {
      sequence: 4,
      timestamp: "2026-08-29T15:17:12.193+00:00",
      event: "tool_executed",
      details: {
        step: 1,
        tool_name: "aggregate_logs",
        arguments: { window_minutes: 10 },
        result: { success: true, observed_ip_count: 3, elapsed_ms: 216 },
      },
    },
    {
      sequence: 5,
      timestamp: "2026-08-29T15:17:18.674+00:00",
      event: "model_turn",
      details: {
        step: 2,
        stop_reason: "tool_use",
        tool_calls: ["resolve_ip_geo"],
        usage: { input_tokens: 5346, output_tokens: 579 },
      },
    },
    {
      sequence: 6,
      timestamp: "2026-08-29T15:17:18.674+00:00",
      event: "tool_executed",
      details: {
        step: 2,
        tool_name: "resolve_ip_geo",
        arguments: { ip: "104.23.166.50" },
        result: {
          success: true,
          country: "The Netherlands",
          asn: "AS13335",
          as_org: "Cloudflare, Inc.",
          elapsed_ms: 0,
        },
      },
    },
    {
      sequence: 7,
      timestamp: "2026-08-29T15:17:43.552+00:00",
      event: "model_turn",
      details: {
        step: 3,
        stop_reason: "tool_use",
        tool_calls: ["submit_detection_result"],
        usage: { input_tokens: 5504, output_tokens: 2523 },
      },
    },
    {
      sequence: 8,
      timestamp: "2026-08-29T15:17:43.552+00:00",
      event: "agent_completed",
      details: {
        run_id: "DET-20260829T151743Z-141de866",
        assessment_count: 3,
        investigation_count: 1,
      },
    },
  ],
  usage: { input_tokens: 15391, output_tokens: 3210 },
  model: "claude-sonnet-5",
};

const runSeeds = [
  ["20260829T091743Z", "completed", 7, 2, 1, 1, 31, 14220, 2890],
  ["20260829T101743Z", "completed", 4, 0, 1, 0, 24, 11201, 1980],
  ["20260829T111743Z", "no_data", 0, 0, 0, 0, 5, 3201, 174],
  ["20260829T121743Z", "completed", 11, 3, 2, 2, 41, 22870, 4412],
  ["20260829T131743Z", "partial", 0, 0, 0, 0, 62, 19811, 930],
  ["20260829T141743Z", "completed", 5, 1, 0, 1, 29, 13502, 2214],
  ["20260829T151743Z", "completed", 3, 1, 1, 1, 33.4, 15391, 3210],
] as const;

export const runHistory: RunSummary[] = runSeeds.map((seed, index) => {
  const [stamp, status, observed, malicious, undetermined, investigations, latency, input, output] = seed;
  const hour = 9 + index;
  const start = new Date(Date.UTC(2026, 7, 29, hour, 7, 9));
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  return {
    run_id: `DET-${stamp}-${index === 6 ? "141de866" : `a4c${index}d9e${index}`}`,
    window: { start: start.toISOString(), end: end.toISOString() },
    created_at: new Date(end.getTime() + latency * 1000).toISOString(),
    status,
    observed_ip_count: observed,
    malicious_count: malicious,
    undetermined_count: undetermined,
    investigation_count: investigations,
    latency_seconds: latency,
    usage: { input_tokens: input, output_tokens: output },
    model: "claude-sonnet-5",
  };
});

export const allAssessments = [
  ...assessments.map((assessment) => ({
    ...assessment,
    run_id: latestOutput.detection.run_id,
    window_end: latestOutput.detection.window.end,
  })),
  {
    ...assessments[0],
    ip: "146.70.242.24",
    threat_type: "credential_bruteforce",
    severity: "high" as const,
    confidence: 0.91,
    rationale: "로그인 실패가 짧은 시간에 반복되고 성공 요청이 없어 자동 대입 공격으로 판단했습니다.",
    evidence: [
      { type: "login_fail", value: "216" },
      { type: "login_success", value: "0" },
      { type: "top_ua", value: "python-requests/2.31" },
    ],
    enrichment: {
      country: "Russia",
      country_code: "RU",
      asn: "AS9009",
      as_org: "M247 Europe SRL",
      as_domain: "m247.com",
    },
    run_id: runHistory[5].run_id,
    window_end: runHistory[5].window.end,
  },
  {
    ...assessments[0],
    ip: "203.0.113.9",
    threat_type: "ssh_bruteforce",
    severity: "high" as const,
    confidence: 0.86,
    rationale: "SSH 인증 실패가 40회 반복되고 성공 기록이 없어 자동화된 대입 시도로 판단했습니다.",
    evidence: [
      { type: "ssh_fail", value: "40" },
      { type: "login_success", value: "0" },
    ],
    enrichment: {
      country: "China",
      country_code: "CN",
      asn: "AS4134",
      as_org: "China Telecom",
      as_domain: "chinatelecom.com.cn",
    },
    run_id: runHistory[3].run_id,
    window_end: runHistory[3].window.end,
  },
];

export const investigationQueue = [
  investigation,
  {
    ...investigation,
    request_id: "INV-20260829T141743Z-07ea22b1",
    detection_run_id: runHistory[5].run_id,
    created_at: runHistory[5].created_at,
    window: runHistory[5].window,
    target: { type: "ip" as const, value: "146.70.242.24" },
    assessment: {
      classification: "malicious_bot" as const,
      threat_type: "credential_bruteforce",
      severity: "high" as const,
      confidence: 0.91,
      rationale: "로그인 실패가 짧은 시간에 반복되고 성공 요청이 없습니다.",
    },
    requested_checks: [
      "동일 계정에 대한 로그인 성공 이벤트 확인",
      "해당 IP의 과거 접근 이력 확인",
      "인증 로그에서 사용된 계정 목록 확인",
    ],
  },
];
