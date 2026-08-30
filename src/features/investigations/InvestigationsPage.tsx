import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, ChevronRight, ClipboardList, Clock3, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getInvestigationQueue } from "../../shared/api/agentOutputApi";
import { ClassificationBadge, SeverityBadge } from "../../shared/ui/StatusBadge";
import { ErrorState, LoadingState } from "../../shared/ui/PageState";
import { formatDateTime, percent } from "../../shared/lib/format";
import type { TimezoneMode } from "../../shared/model/types";

export function InvestigationsPage({ timezone }: { timezone: TimezoneMode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["investigation-queue"], queryFn: getInvestigationQueue });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  const investigationQueue = query.data ?? [];
  const selected = investigationQueue.find((item) => item.request_id === selectedId) ?? investigationQueue[0] ?? null;
  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">INVESTIGATION QUEUE</span><h2>조사가 필요한 판정만 모아봅니다</h2><p>각 요청은 원본 assessment를 복사해 재포장한 것이며 전체 탐지 건수에 중복 합산하지 않습니다.</p></div><div className="page-heading__stat"><ClipboardList size={18} /><span>대기 중</span><strong>{investigationQueue.length}건</strong></div></section>
    <section className="queue-layout"><div className="queue-list">{investigationQueue.map((item) => <button key={item.request_id} type="button" className={`queue-item ${selected?.request_id === item.request_id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.request_id)}><div className="queue-item__top"><code>{item.target.value}</code><SeverityBadge severity={item.assessment.severity} /></div><strong>{item.assessment.threat_type}</strong><p>{item.assessment.rationale}</p><div className="queue-item__meta"><span><Clock3 size={13} />{formatDateTime(item.created_at, timezone)}</span><span>{item.requested_checks.length}개 확인 항목</span></div><ChevronRight className="queue-item__arrow" size={17} /></button>)}</div>{selected ? <article className="panel investigation-detail"><header><div><span className="eyebrow">INVESTIGATION REQUEST</span><h2>{selected.target.value}</h2></div><button className="icon-button investigation-detail__close" type="button" onClick={() => setSelectedId(null)} aria-label="선택 초기화"><X size={17} /></button></header><div className="drawer-badges"><ClassificationBadge classification={selected.assessment.classification} /><SeverityBadge severity={selected.assessment.severity} /><span className="confidence-big">확신도 {percent(selected.assessment.confidence)}</span></div><section><h3>판정 이유</h3><p>{selected.assessment.rationale}</p></section><section><h3>조사 체크리스트</h3><ol className="investigation-checks">{selected.requested_checks.map((check, index) => <li key={check}><span><CheckSquare size={16} /></span><div><small>CHECK {String(index + 1).padStart(2, "0")}</small><p>{check}</p></div></li>)}</ol></section><section><h3>네트워크 출처</h3><div className="location-card"><MapPin size={18} /><div><strong>{selected.enrichment.country ?? "조회 안 함"}</strong>{selected.enrichment.asn || selected.enrichment.as_org ? <span>{selected.enrichment.asn} · {selected.enrichment.as_org}</span> : null}</div></div></section><footer><span>요청 ID <code>{selected.request_id}</code></span><Link to={`/runs/${selected.detection_run_id}`}>원본 탐지 보기 <ChevronRight size={15} /></Link></footer></article> : <div className="panel empty-detail">현재 조사 요청이 없습니다.</div>}</section>
  </div>;
}
