import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bot, CircleHelp, Clock3, Globe2, Radar, ShieldAlert, Siren } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAssessmentHistory, getLatestOutput, getRunHistory } from "../../shared/api/agentOutputApi";
import { formatNumber, formatWindow, percent } from "../../shared/lib/format";
import type { TimezoneMode } from "../../shared/model/types";
import { MetricCard } from "../../shared/ui/MetricCard";
import { ClassificationBadge, SeverityBadge, StatusBadge } from "../../shared/ui/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/PageState";

interface CountryAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

function CountryAxisTick({ x = 0, y = 0, payload }: CountryAxisTickProps) {
  const [countryCode = "", country = "조회 결과 없음"] = (payload?.value ?? "").split("|", 2);
  const hasFlag = /^[A-Z]{2}$/.test(countryCode);

  return (
    <foreignObject x={x - 148} y={y - 14} width={140} height={28}>
      <div className="country-axis-label" title={country}>
        {hasFlag ? <span className={`fi fi-${countryCode.toLowerCase()}`} aria-hidden="true" /> : <span aria-hidden="true">🌐</span>}
        <span>{country}</span>
      </div>
    </foreignObject>
  );
}

export function OverviewPage({ timezone }: { timezone: TimezoneMode }) {
  const latest = useQuery({ queryKey: ["latest-output"], queryFn: getLatestOutput });
  const history = useQuery({ queryKey: ["run-history"], queryFn: getRunHistory });
  const assessments = useQuery({ queryKey: ["assessment-history"], queryFn: getAssessmentHistory });
  if (latest.isLoading || history.isLoading || assessments.isLoading) return <LoadingState />;
  if (latest.error || history.error || assessments.error) return <ErrorState message={(latest.error ?? history.error ?? assessments.error)?.message ?? "알 수 없는 오류"} />;
  if (!latest.data) return <EmptyState title="탐지 결과를 기다리는 중입니다" message="Result Service가 output 폴더의 첫 번째 완성된 JSON 파일을 기다리고 있습니다." />;

  const output = latest.data;
  const runs = history.data!;
  const assessmentHistory = assessments.data!;
  const malicious = assessmentHistory.filter((item) => item.classification === "malicious_bot");
  const undetermined = assessmentHistory.filter((item) => item.classification === "undetermined");
  const observedCount = runs.reduce((sum, run) => sum + run.observed_ip_count, 0);
  const investigationCount = runs.reduce((sum, run) => sum + run.investigation_count, 0);
  const recentAssessments = assessmentHistory.slice(0, 8);
  const recentRuns = runs.slice(-7);
  const chartData = recentRuns.map((run) => ({
    time: new Intl.DateTimeFormat("ko-KR", { timeZone: timezone === "KST" ? "Asia/Seoul" : "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(run.window.end)),
    malicious: run.malicious_count,
    undetermined: run.undetermined_count,
    normal: Math.max(0, run.observed_ip_count - run.malicious_count - run.undetermined_count),
  }));
  const countryCounts = malicious.reduce((counts, item) => {
    if (!item.enrichment.country) return counts;
    const current = counts.get(item.enrichment.country);
    counts.set(item.enrichment.country, {
      count: (current?.count ?? 0) + 1,
      countryCode: current?.countryCode ?? item.enrichment.country_code,
    });
    return counts;
  }, new Map<string, { count: number; countryCode: string | null }>());
  const countryData = [...countryCounts]
    .map(([country, value]) => ({ country, axisKey: `${value.countryCode?.toUpperCase() ?? ""}|${country}`, count: value.count }))
    .sort((left, right) => right.count - left.count);
  const countryChartMax = Math.max(1, ...countryData.map((item) => item.count));
  const enrichedMaliciousCount = malicious.filter((item) => item.enrichment.country).length;
  const latencySeconds = Math.max(0, Math.round((Date.parse(output.detection.created_at) - Date.parse(output.detection.window.end)) / 1000));

  return (
    <div className="page-stack overview-page">
      <section className="run-hero">
        <div className="run-hero__status">
          <div className="pulse-dot" aria-hidden="true" />
          <div><span>최근 분석 구간</span><strong>{formatWindow(output.detection.window.start, output.detection.window.end, timezone)}</strong></div>
          <StatusBadge status={output.detection.status} />
        </div>
        <div className="run-hero__meta">
          <span><Clock3 size={14} /> 탐지 지연 {latencySeconds}초</span><span><Bot size={14} /> {output.model}</span>
          <Link to={`/runs/${output.detection.run_id}`}>실행 상세 <ArrowRight size={15} /></Link>
        </div>
      </section>

      {output.detection.status === "partial" ? <div className="alert-banner alert-banner--danger" role="alert"><ShieldAlert size={19} /><div><strong>최근 실행이 판정을 완료하지 못했습니다.</strong><span>판정 0건을 안전 상태로 해석하지 마세요. 실행 상세에서 실패 원인을 확인하십시오.</span></div></div> : null}

      <section className="metric-grid" aria-label="전체 탐지 결과 누적 지표">
        <MetricCard label="관측 IP 판정" value={observedCount} hint={`${runs.length}개 실행 결과 합계`} icon={<Radar size={18} />} />
        <MetricCard label="악성 판정" value={malicious.length} hint="전체 결과에서 확인된 위협" icon={<ShieldAlert size={18} />} tone="danger" />
        <MetricCard label="판단 보류" value={undetermined.length} hint="전체 결과에서 정상으로 미집계" icon={<CircleHelp size={18} />} tone="warning" />
        <MetricCard label="조사 대기" value={investigationCount} hint="전체 결과의 조사 요청 합계" icon={<Siren size={18} />} tone="danger" />
      </section>

      <section className="dashboard-grid dashboard-grid--wide">
        <article className="panel chart-panel">
          <div className="panel__header"><div><span className="eyebrow">DETECTION TREND</span><h2>시간대별 정상 및 위협 판정</h2></div><span className="panel__hint">최근 {chartData.length}회 실행</span></div>
          <div className="chart-legend"><span><i className="legend-dot legend-dot--observed" />정상 (사람 + 정상 봇)</span><span><i className="legend-dot legend-dot--malicious" />악성</span><span><i className="legend-dot legend-dot--undetermined" />판단 보류</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} accessibilityLayer={false}>
                <defs><linearGradient id="normalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#29d3c2" stopOpacity={0.22} /><stop offset="95%" stopColor="#29d3c2" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b3038" /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#718792", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "#718792", fontSize: 11 }} /><Tooltip cursor={false} contentStyle={{ background: "#0c181e", border: "1px solid #213942", borderRadius: 8 }} />
                <Area type="monotone" dataKey="normal" name="정상" stroke="#29d3c2" fill="url(#normalFill)" strokeWidth={2} /><Area type="monotone" dataKey="malicious" name="악성" stroke="#ff5e68" fill="transparent" strokeWidth={2} /><Area type="monotone" dataKey="undetermined" name="판단 보류" stroke="#f4b84a" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel chart-panel--compact">
          <div className="panel__header"><div><span className="eyebrow">THREAT ORIGIN</span><h2>위협 IP 국가</h2></div><Globe2 size={18} /></div>
          <div className="coverage-line"><span>GeoIP 조회 범위</span><strong>{enrichedMaliciousCount}/{malicious.length}</strong></div>
          <div className="chart-wrap chart-wrap--country">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData.length ? countryData : [{ country: "조회 결과 없음", axisKey: "|조회 결과 없음", count: 0 }]} layout="vertical" margin={{ left: 8, right: 24 }} accessibilityLayer={false}><CartesianGrid horizontal={false} stroke="#1b3038" /><XAxis type="number" hide domain={[0, countryChartMax + 0.5]} /><YAxis type="category" dataKey="axisKey" width={148} tickLine={false} axisLine={false} tick={<CountryAxisTick />} /><Tooltip cursor={false} labelFormatter={(_label, payload) => payload[0]?.payload.country ?? "조회 결과 없음"} contentStyle={{ background: "#0c181e", border: "1px solid #213942", borderRadius: 8 }} /><Bar dataKey="count" fill="#ff5e68" radius={[0, 4, 4, 0]} barSize={16} activeBar={false}><LabelList dataKey="count" position="right" fill="#edf5f7" fontSize={12} fontWeight={700} /></Bar></BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">정상 IP는 국가 조회 대상이 아니며 통계에서 제외됩니다.</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel__header"><div><span className="eyebrow">LATEST ASSESSMENTS</span><h2>전체 결과의 최근 IP 판정</h2></div><Link className="text-link" to="/detections">전체 탐지 보기 <ArrowRight size={15} /></Link></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>IP</th><th>분류</th><th>위협 유형</th><th>심각도</th><th>확신도</th><th>국가 / 네트워크</th><th>조사</th></tr></thead><tbody>
          {recentAssessments.map((assessment) => <tr key={`${assessment.run_id}:${assessment.ip}`}><td><code className="ip-address">{assessment.ip}</code></td><td><ClassificationBadge classification={assessment.classification} /></td><td>{assessment.threat_type === "none" ? <span className="muted">없음</span> : <code>{assessment.threat_type}</code>}</td><td><SeverityBadge severity={assessment.severity} /></td><td><div className="confidence-cell"><span>{percent(assessment.confidence)}</span><div><i style={{ width: `${assessment.confidence * 100}%` }} /></div></div></td><td>{assessment.enrichment.country ? <div className="network-cell"><strong>{assessment.enrichment.country}</strong><span>{assessment.enrichment.asn}</span></div> : <span className="muted">조회 안 함</span>}</td><td>{assessment.investigation_required ? <span className="investigate-mark">필요</span> : <span className="muted">—</span>}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="summary-strip"><Activity size={17} /><span>{output.detection.summary}</span><strong>{formatNumber(output.usage.input_tokens + output.usage.output_tokens)} tokens</strong></section>
    </div>
  );
}
