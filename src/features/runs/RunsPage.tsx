import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Cpu, FileClock } from "lucide-react";
import { Link } from "react-router-dom";
import { getRunHistory } from "../../shared/api/agentOutputApi";
import { formatNumber, formatWindow } from "../../shared/lib/format";
import { ErrorState, LoadingState } from "../../shared/ui/PageState";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import type { TimezoneMode } from "../../shared/model/types";

export function RunsPage({ timezone }: { timezone: TimezoneMode }) {
  const query = useQuery({ queryKey: ["run-history"], queryFn: getRunHistory });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  const runs = [...query.data!].reverse();

  return <div className="page-stack runs-page">
    <section className="page-heading"><div><span className="eyebrow">AGENT EXECUTIONS</span><h2>10분 단위 분석 실행을 추적합니다</h2><p>트래픽 없음과 실행 실패를 분리하고, 빠진 시간창이 없는지 확인합니다.</p></div><div className="page-heading__stat"><FileClock size={18} /><span>최근 실행</span><strong>{runs.length}회</strong></div></section>
    <section className="panel panel--flush"><div className="table-wrap"><table className="data-table runs-table"><thead><tr><th>분석 구간</th><th>상태</th><th>관측 IP</th><th>악성</th><th>판단 보류</th><th>조사</th><th>실행 시간</th><th>토큰</th><th></th></tr></thead><tbody>{runs.map((run) => <tr key={run.run_id} className={run.status === "partial" ? "row--danger" : ""}><td><div className="run-window"><strong>{formatWindow(run.window.start, run.window.end, timezone)}</strong><code>{run.run_id}</code></div></td><td><StatusBadge status={run.status} /></td><td>{run.observed_ip_count}</td><td className={run.malicious_count ? "text-danger" : ""}>{run.malicious_count}</td><td className={run.undetermined_count ? "text-warning" : ""}>{run.undetermined_count}</td><td>{run.investigation_count}</td><td><span className="inline-icon"><Clock3 size={14} />{run.latency_seconds}초</span></td><td><span className="inline-icon"><Cpu size={14} />{formatNumber(run.usage.input_tokens + run.usage.output_tokens)}</span></td><td><Link className="row-link" to={`/runs/${run.run_id}`} aria-label={`${run.run_id} 상세`}><ArrowRight size={17} /></Link></td></tr>)}</tbody></table></div></section>
    <div className="info-note"><Clock3 size={17} /><div><strong>실행 누락 감지 기준</strong><p>10분 시간창에 해당하는 실행이 생성되지 않으면 “데이터 없음”이 아니라 에이전트 실행 누락으로 간주해야 합니다.</p></div></div>
  </div>;
}
