import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bot, Braces, CheckCircle2, Clock3, Cpu, Database, Wrench } from "lucide-react";
import { getRunOutput } from "../../shared/api/agentOutputApi";
import { ClassificationBadge, SeverityBadge, StatusBadge } from "../../shared/ui/StatusBadge";
import { ErrorState, LoadingState } from "../../shared/ui/PageState";
import { formatDateTime, formatNumber, formatWindow, isEnrichmentEmpty, percent } from "../../shared/lib/format";
import type { TimezoneMode } from "../../shared/model/types";

type Tab = "summary" | "assessments" | "trace" | "raw";

const eventLabels: Record<string, string> = {
  agent_started: "에이전트 시작",
  tools_available: "도구 준비",
  model_turn: "모델 판단",
  tool_executed: "도구 실행",
  submission_rejected: "제출 거부",
  protocol_recovery: "프로토콜 복구",
  agent_completed: "정상 완료",
  agent_failed: "실행 실패",
};

export function RunDetailPage({ timezone }: { timezone: TimezoneMode }) {
  const { runId } = useParams();
  const [tab, setTab] = useState<Tab>("summary");
  const query = useQuery({ queryKey: ["run-output", runId], queryFn: () => getRunOutput(runId!), enabled: Boolean(runId) });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  if (!query.data) return <ErrorState message="실행 결과를 찾을 수 없습니다." />;

  const output = query.data;
  const run = {
    run_id: output.detection.run_id,
    window: output.detection.window,
    created_at: output.detection.created_at,
    status: output.detection.status,
    observed_ip_count: output.detection.observed_ip_count,
    malicious_count: output.detection.assessments.filter((item) => item.classification === "malicious_bot").length,
    investigation_count: output.investigation_requests.length,
    latency_seconds: Math.max(0, Math.round((Date.parse(output.detection.created_at) - Date.parse(output.detection.window.end)) / 1000)),
    usage: output.usage,
    model: output.model,
  };
  const importErrors = output.agent_trace.flatMap((event) => {
    if (event.event !== "tools_available" || !event.details.import_errors || typeof event.details.import_errors !== "object") return [];
    return Object.entries(event.details.import_errors);
  });

  return <div className="page-stack">
    <Link className="back-link" to="/runs"><ArrowLeft size={16} /> 실행 목록</Link>
    <section className="detail-hero"><div><div className="detail-hero__title"><span className="eyebrow">DETECTION RUN</span><StatusBadge status={run.status} /></div><h2>{run.run_id}</h2><p>{formatWindow(run.window.start, run.window.end, timezone)}</p></div><div className="detail-hero__metrics"><div><Clock3 size={16} /><span>실행 시간</span><strong>{run.latency_seconds}초</strong></div><div><Cpu size={16} /><span>총 토큰</span><strong>{formatNumber(run.usage.input_tokens + run.usage.output_tokens)}</strong></div><div><Bot size={16} /><span>모델</span><strong>{run.model}</strong></div></div></section>
    <nav className="tabs" aria-label="실행 상세 섹션">{(["summary", "assessments", "trace", "raw"] as Tab[]).map((item) => <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "summary" ? "요약" : item === "assessments" ? `IP 판정 ${output.detection.assessments.length}` : item === "trace" ? `실행 기록 ${output.agent_trace.length}` : "원본 JSON"}</button>)}</nav>

    {tab === "summary" ? <div className="detail-grid"><section className="panel"><div className="panel__header"><div><span className="eyebrow">MODEL SUMMARY</span><h2>판정 요약</h2></div></div><p className="model-summary">{output.detection.summary}</p><dl className="definition-grid definition-grid--three"><div><dt>관측 IP</dt><dd>{run.observed_ip_count}</dd></div><div><dt>악성 판정</dt><dd>{run.malicious_count}</dd></div><div><dt>조사 요청</dt><dd>{run.investigation_count}</dd></div></dl></section><section className="panel"><div className="panel__header"><div><span className="eyebrow">TIME CONTEXT</span><h2>시간 정보</h2></div></div><dl className="stacked-definitions"><div><dt>로그 분석 구간</dt><dd>{formatWindow(run.window.start, run.window.end, timezone)}</dd><small>언제 일어난 일인가</small></div><div><dt>판정 완료 시각</dt><dd>{formatDateTime(run.created_at, timezone, true)}</dd><small>언제 알아냈는가</small></div><div><dt>탐지 지연</dt><dd>{run.latency_seconds}초</dd><small>window.end 이후 결과 생성까지</small></div></dl></section></div> : null}

    {tab === "assessments" ? <section className="panel"><div className="panel__header"><div><span className="eyebrow">ASSESSMENTS</span><h2>IP별 판정</h2></div></div><div className="assessment-cards">{output.detection.assessments.map((item) => <article key={item.ip} className="assessment-card"><header><code className="ip-address">{item.ip}</code><div><ClassificationBadge classification={item.classification} /><SeverityBadge severity={item.severity} /></div></header><p>{item.rationale}</p><div className="assessment-card__meta"><span>위협 유형 <code>{item.threat_type}</code></span><span>확신도 <strong>{percent(item.confidence)}</strong></span><span>GeoIP <strong>{isEnrichmentEmpty(item.enrichment) ? "조회 안 함" : item.enrichment.country}</strong></span></div></article>)}</div></section> : null}

    {tab === "trace" ? <section className="panel"><div className="panel__header"><div><span className="eyebrow">AGENT TRACE</span><h2>에이전트 실행 타임라인</h2></div></div>{importErrors.length ? <div className="alert-banner alert-banner--danger"><Wrench size={18} /><div><strong>도구 로딩 오류 {importErrors.length}건</strong><span>{importErrors.map(([tool, error]) => `${tool}: ${String(error)}`).join(" · ")}</span></div></div> : null}<ol className="trace-timeline">{output.agent_trace.map((event) => { const toolName = typeof event.details.tool_name === "string" ? event.details.tool_name : null; return <li key={event.sequence}><div className={`trace-icon trace-icon--${event.event}`}>{event.event === "tool_executed" ? <Wrench size={15} /> : event.event === "model_turn" ? <Bot size={15} /> : event.event === "agent_completed" ? <CheckCircle2 size={15} /> : event.event === "tools_available" ? <Database size={15} /> : <Clock3 size={15} />}</div><div className="trace-content"><header><strong>{eventLabels[event.event]}</strong><span>{formatDateTime(event.timestamp, timezone, true)}</span></header><p>{toolName ? `${toolName} 도구를 실행했습니다.` : event.event === "model_turn" ? `모델이 ${String(event.details.step)}단계 판단을 완료했습니다.` : event.event === "tools_available" ? "감지에 필요한 도구를 불러왔습니다." : event.event === "agent_started" ? "분석 구간과 모델을 확정했습니다." : event.event === "agent_failed" ? "에이전트 실행이 실패했습니다." : "판정과 조사 요청 생성을 완료했습니다."}</p><details><summary>세부 데이터</summary><pre>{JSON.stringify(event.details, null, 2)}</pre></details></div></li>; })}</ol></section> : null}

    {tab === "raw" ? <section className="panel raw-panel"><div className="panel__header"><div><span className="eyebrow">NORMALIZED OUTPUT</span><h2>원본 JSON</h2></div><Braces size={18} /></div><div className="security-note">공격자 입력이 포함될 수 있으므로 HTML로 해석하지 않고 텍스트로 표시합니다.</div><pre>{JSON.stringify(output, null, 2)}</pre></section> : null}
  </div>;
}
