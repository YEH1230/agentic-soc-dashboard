import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Filter, Search, ShieldAlert, X } from "lucide-react";
import { getAssessmentHistory } from "../../shared/api/agentOutputApi";
import { ClassificationBadge, SeverityBadge } from "../../shared/ui/StatusBadge";
import { ErrorState, LoadingState } from "../../shared/ui/PageState";
import { classificationLabel, formatDateTime, isEnrichmentEmpty, percent, severityOrder } from "../../shared/lib/format";
import type { Classification, Severity, TimezoneMode } from "../../shared/model/types";

export function DetectionsPage({ timezone }: { timezone: TimezoneMode }) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<Classification | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const dataQuery = useQuery({ queryKey: ["assessment-history"], queryFn: getAssessmentHistory });
  const assessments = dataQuery.data ?? [];
  const selected = assessments.find((item) => `${item.run_id}:${item.ip}` === selectedKey) ?? null;
  const filtered = useMemo(() => assessments.filter((item) => item.ip.includes(query.trim()) || item.threat_type.includes(query.trim().toLowerCase())).filter((item) => classification === "all" || item.classification === classification).filter((item) => severity === "all" || item.severity === severity).sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]), [assessments, query, classification, severity]);

  if (dataQuery.isLoading) return <LoadingState />;
  if (dataQuery.error) return <ErrorState message={dataQuery.error.message} />;

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">ASSESSMENT EXPLORER</span><h2>IP별 판정과 근거를 탐색합니다</h2><p>판단 보류는 정상으로 집계하지 않으며, 조사 요청은 원본 탐지에 포함된 판정을 재사용합니다.</p></div><div className="page-heading__stat"><ShieldAlert size={18} /><span>표시 중</span><strong>{filtered.length}건</strong></div></section>
    <section className="filter-bar" aria-label="탐지 필터">
      <label className="filter-search"><Search size={17} /><span className="sr-only">IP 또는 위협 유형 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="IP 또는 위협 유형 검색" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={15} /></button> : null}</label>
      <label className="select-field"><Filter size={15} /><span className="sr-only">분류 필터</span><select value={classification} onChange={(event) => setClassification(event.target.value as Classification | "all")}><option value="all">모든 분류</option>{Object.entries(classificationLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} /></label>
      <label className="select-field"><span className="sr-only">심각도 필터</span><select value={severity} onChange={(event) => setSeverity(event.target.value as Severity | "all")}><option value="all">모든 심각도</option><option value="critical">치명적</option><option value="high">높음</option><option value="medium">중간</option><option value="low">낮음</option><option value="info">정보</option></select><ChevronDown size={14} /></label><span className="filter-meta">심각도 우선 정렬</span>
    </section>
    <section className="panel panel--flush"><div className="table-wrap"><table className="data-table data-table--interactive"><thead><tr><th>분석 시각</th><th>IP</th><th>분류</th><th>위협 유형</th><th>심각도</th><th>확신도</th><th>출처</th><th>조사</th></tr></thead><tbody>{filtered.map((assessment) => <tr key={`${assessment.run_id}-${assessment.ip}`} onClick={() => setSelectedKey(`${assessment.run_id}:${assessment.ip}`)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setSelectedKey(`${assessment.run_id}:${assessment.ip}`)}><td className="text-nowrap">{formatDateTime(assessment.window_end, timezone)}</td><td><code className="ip-address">{assessment.ip}</code></td><td><ClassificationBadge classification={assessment.classification} /></td><td>{assessment.threat_type === "none" ? <span className="muted">없음</span> : <code>{assessment.threat_type}</code>}</td><td><SeverityBadge severity={assessment.severity} /></td><td>{percent(assessment.confidence)}</td><td>{assessment.enrichment.country ?? <span className="muted">조회 안 함</span>}</td><td>{assessment.investigation_required ? <span className="investigate-mark">필요</span> : <span className="muted">—</span>}</td></tr>)}</tbody></table></div></section>
    {selected ? <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={`${selected.ip} 판정 상세`}><button className="drawer-backdrop" type="button" aria-label="상세 닫기" onClick={() => setSelectedKey(null)} /><aside className="detail-drawer"><div className="detail-drawer__header"><div><span className="eyebrow">ASSESSMENT DETAIL</span><h2>{selected.ip}</h2></div><button className="icon-button" type="button" onClick={() => setSelectedKey(null)} aria-label="상세 닫기"><X size={18} /></button></div><div className="drawer-badges"><ClassificationBadge classification={selected.classification} /><SeverityBadge severity={selected.severity} /><span className="confidence-big">확신도 {percent(selected.confidence)}</span></div><section className="drawer-section"><h3>판정 이유</h3><p>{selected.rationale}</p></section><section className="drawer-section"><h3>구조화된 근거</h3><dl className="evidence-list">{selected.evidence.map((item) => <div key={`${item.type}-${item.value}`}><dt>{item.type}</dt><dd>{item.value}</dd></div>)}</dl></section><section className="drawer-section"><h3>IP 보강 정보</h3>{isEnrichmentEmpty(selected.enrichment) ? <div className="empty-inline">조회 안 함</div> : <dl className="definition-grid"><div><dt>국가</dt><dd>{selected.enrichment.country}</dd></div><div><dt>ASN</dt><dd>{selected.enrichment.asn}</dd></div><div><dt>조직</dt><dd>{selected.enrichment.as_org}</dd></div><div><dt>도메인</dt><dd>{selected.enrichment.as_domain}</dd></div></dl>}</section>{selected.requested_checks.length ? <section className="drawer-section"><h3>요청된 조사</h3><ol className="check-list">{selected.requested_checks.map((item) => <li key={item}>{item}</li>)}</ol></section> : null}<footer className="drawer-footer"><span>원본 실행</span><code>{selected.run_id}</code></footer></aside></div> : null}
  </div>;
}
